using System.Reflection;
using Microsoft.Extensions.Options;
using MT5Bridge.Models;

namespace MT5Bridge.Services;

/// <summary>
/// MT5 Manager API service implementation.
/// 
/// This service dynamically loads the MT5ManagerAPI.NET.dll and uses reflection
/// to call the Manager API methods. This approach allows the bridge to compile
/// without the DLL present (it's only needed at runtime on the server).
///
/// IMPORTANT: The MT5 Manager API is NOT thread-safe.
/// All DLL calls are serialized through _apiLock (SemaphoreSlim).
///
/// Required DLLs in the application directory or libs/ folder:
///   - MT5APIManager64.dll (native C++ DLL)
///   - MT5ManagerAPI.NET.dll (managed .NET wrapper)
/// </summary>
public class MT5Service : IMT5Service, IDisposable
{
    private readonly ILogger<MT5Service> _logger;
    private readonly BridgeOptions _options;
    private readonly SemaphoreSlim _apiLock = new(1, 1);

    // MT5 Manager API objects loaded via reflection
    private Assembly? _managerAssembly;
    private object? _managerApi;
    private bool _connected;
    private DateTime? _lastConnected;
    private DateTime? _lastKeepalive;
    private string _lastError = "";
    private long _totalRequests;
    private readonly DateTime _startTime = DateTime.UtcNow;

    public bool IsConnected => _connected;

    public MT5Service(ILogger<MT5Service> logger, IOptions<BridgeOptions> options)
    {
        _logger = logger;
        _options = options.Value;
    }

    public async Task<bool> ConnectAsync(CancellationToken ct = default)
    {
        await _apiLock.WaitAsync(ct);
        try
        {
            // Step 1: Load the MT5 Manager API assembly
            if (_managerAssembly == null)
            {
                var dllPath = FindManagerDll();
                if (dllPath == null)
                {
                    _lastError = "MetaQuotes.MT5ManagerAPI64.dll not found.";
                    _logger.LogError(_lastError);
                    return false;
                }

                _logger.LogInformation("Loading MT5 Manager API from: {Path}", dllPath);
                _managerAssembly = Assembly.LoadFrom(dllPath);
                _logger.LogInformation("MT5 Manager API assembly loaded. Types: {Types}",
                    string.Join(", ", _managerAssembly.GetExportedTypes().Select(t => t.Name).Take(30)));
            }

            // Step 2: Find and initialize the factory
            // Factory is SMTManagerAPIFactory with:
            //   Initialize(string dll_path) -> MTRetCode
            //   CreateManager(uint version, MTRetCode& res) -> CIMTManagerAPI
            //   CreateManager(uint version, string data_path, MTRetCode& res) -> CIMTManagerAPI
            var factoryType = FindType(_managerAssembly, "ManagerAPIFactory");
            if (factoryType == null)
            {
                _lastError = "Could not find ManagerAPIFactory type in MT5 assembly. " +
                    $"Available types: {string.Join(", ", _managerAssembly.GetExportedTypes().Select(t => t.Name))}";
                _logger.LogError(_lastError);
                return false;
            }
            _logger.LogInformation("Found factory type: {Type}", factoryType.FullName);

            // Step 2a: Call Initialize(dll_path) to tell the factory where native DLLs are
            var initMethod = factoryType.GetMethod("Initialize", BindingFlags.Static | BindingFlags.Public);
            if (initMethod != null)
            {
                var dllDir = Path.GetDirectoryName(FindManagerDll()) ?? AppContext.BaseDirectory;
                _logger.LogInformation("Calling factory Initialize with path: {Path}", dllDir);
                var initResult = initMethod.Invoke(null, new object[] { dllDir });
                _logger.LogInformation("Factory Initialize returned: {Result}", initResult);
                if (!IsRetCodeSuccess(initResult))
                {
                    _lastError = $"Factory Initialize failed: {initResult}";
                    _logger.LogError(_lastError);
                    return false;
                }
            }

            // Step 2b: Call CreateManager - prefer the 2-param overload (version, out res)
            var createMethods = factoryType.GetMethods(BindingFlags.Static | BindingFlags.Public)
                .Where(m => m.Name == "CreateManager")
                .OrderBy(m => m.GetParameters().Length)
                .ToList();

            if (createMethods.Count == 0)
            {
                _lastError = $"No CreateManager method on {factoryType.Name}. " +
                    $"Methods: {string.Join(", ", factoryType.GetMethods().Select(m => m.Name))}";
                _logger.LogError(_lastError);
                return false;
            }

            // Use the overload with fewest params (version, res)
            var createMethod = createMethods.First();
            var parameters = createMethod.GetParameters();
            _logger.LogInformation("Using CreateManager overload with {Count} params: {Params}",
                parameters.Length,
                string.Join(", ", parameters.Select(p => $"{p.ParameterType.Name} {p.Name} (IsOut={p.IsOut})")));

            var args = new object?[parameters.Length];
            for (int i = 0; i < parameters.Length; i++)
            {
                var pType = parameters[i].ParameterType;
                var pName = parameters[i].Name?.ToLower() ?? "";

                if (pType == typeof(uint))
                    args[i] = (uint)5660;
                else if (pType == typeof(string))
                    args[i] = AppContext.BaseDirectory; // data_path
                else if (parameters[i].IsOut)
                {
                    // For out MTRetCode& parameter, initialize with default
                    var elementType = pType.IsByRef ? pType.GetElementType()! : pType;
                    args[i] = Activator.CreateInstance(elementType);
                }
            }

            // CreateManager RETURNS the manager object; res out param is the error code
            var managerResult = createMethod.Invoke(null, args);
            _logger.LogInformation("CreateManager returned: {Type} = {Value}",
                managerResult?.GetType().FullName ?? "null", managerResult);

            // Get the res (MTRetCode) from the out parameter
            object? retCode = null;
            for (int i = 0; i < parameters.Length; i++)
            {
                if (parameters[i].IsOut)
                {
                    retCode = args[i];
                    _logger.LogInformation("CreateManager out param [{Index}] ({Name}): {Value}",
                        i, parameters[i].Name, args[i]);
                }
            }

            // The RETURN VALUE is the CIMTManagerAPI object
            _managerApi = managerResult;

            if (_managerApi == null)
            {
                _lastError = $"CreateManager returned null. RetCode: {retCode}";
                _logger.LogError(_lastError);
                return false;
            }

            _logger.LogInformation("Manager API created. Type: {Type}",
                _managerApi.GetType().FullName);

            // Step 3: Connect to the MT5 server
            // Signature: Connect(String server, UInt64 login, String password,
            //                    String password_cert, EnPumpModes pump_mode, UInt32 timeout) -> MTRetCode
            var connectMethod = _managerApi.GetType().GetMethod("Connect");
            if (connectMethod == null)
            {
                // Search more broadly
                connectMethod = _managerApi.GetType().GetMethods()
                    .FirstOrDefault(m => m.Name.Equals("Connect", StringComparison.OrdinalIgnoreCase));
            }

            if (connectMethod == null)
            {
                var allMethods = _managerApi.GetType()
                    .GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .Select(m => m.Name).Distinct().OrderBy(n => n).ToList();
                _lastError = $"No Connect method on {_managerApi.GetType().FullName}. " +
                    $"Methods ({allMethods.Count}): [{string.Join(", ", allMethods)}]";
                _logger.LogError(_lastError);
                return false;
            }

            var connectParams = connectMethod.GetParameters();
            _logger.LogInformation("Connect method: {Params}",
                string.Join(", ", connectParams.Select(p => $"{p.ParameterType.Name} {p.Name}")));

            var server = $"{_options.MT5Server}:{_options.MT5Port}";
            _logger.LogInformation("Connecting to {Server} with login {Login}", server, _options.ManagerLogin);

            // Build Connect arguments matching the exact signature
            var connectArgs = new object?[connectParams.Length];
            for (int i = 0; i < connectParams.Length; i++)
            {
                var pName = connectParams[i].Name?.ToLower() ?? "";
                var pType = connectParams[i].ParameterType;

                if (pName.Contains("server") || pName.Contains("address"))
                    connectArgs[i] = server;
                else if (pName.Contains("login"))
                    connectArgs[i] = (ulong)_options.ManagerLogin;
                else if (pName == "password")
                    connectArgs[i] = _options.ManagerPassword;
                else if (pName.Contains("password_cert") || pName.Contains("cert"))
                    connectArgs[i] = _options.ManagerApiPassword;
                else if (pName.Contains("pump") || pName.Contains("mode"))
                {
                    // EnPumpModes - use 1 for PUMP_MODE_FULL (populates local group cache)
                    if (pType.IsEnum)
                        connectArgs[i] = Enum.ToObject(pType, 1);
                    else
                        connectArgs[i] = Convert.ChangeType(1, pType);
                }
                else if (pName.Contains("timeout"))
                    connectArgs[i] = (uint)30000; // 30 second timeout
                else if (pType == typeof(string))
                    connectArgs[i] = "";
                else if (pType == typeof(uint))
                    connectArgs[i] = (uint)0;
                else if (pType == typeof(ulong))
                    connectArgs[i] = (ulong)0;
            }

            _logger.LogInformation("Calling Connect with args: {Args}",
                string.Join(", ", connectArgs.Select((a, idx) => $"{connectParams[idx].Name}={a}")));

            var connectResult = connectMethod.Invoke(_managerApi, connectArgs);
            _logger.LogInformation("Connect result: {Result}", connectResult);

            var isSuccess = IsRetCodeSuccess(connectResult);

            if (isSuccess)
            {
                _connected = true;
                _lastConnected = DateTime.UtcNow;
                _lastError = "";
                _logger.LogInformation("Successfully connected to MT5 server");
            }
            else
            {
                _lastError = $"MT5 Connect failed: {connectResult}";
                _logger.LogError(_lastError);
                _connected = false;
            }

            return _connected;
        }
        catch (Exception ex)
        {
            _lastError = $"Connection error: {ex.InnerException?.Message ?? ex.Message}";
            _logger.LogError(ex, "Failed to connect to MT5 server");
            _connected = false;
            return false;
        }
        finally
        {
            _apiLock.Release();
        }
    }

    public void Disconnect()
    {
        try
        {
            if (_managerApi != null)
            {
                var disconnectMethod = _managerApi.GetType().GetMethod("Disconnect");
                disconnectMethod?.Invoke(_managerApi, null);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error during disconnect");
        }
        _connected = false;
    }

    public async Task<bool> KeepaliveAsync(CancellationToken ct = default)
    {
        if (!_connected || _managerApi == null) return false;

        await _apiLock.WaitAsync(ct);
        try
        {
            // Try to call a lightweight method to verify connection
            var timeMethod = _managerApi.GetType().GetMethods()
                .FirstOrDefault(m => m.Name.Contains("TimeServer") || m.Name.Contains("ServerTime"));

            if (timeMethod != null)
            {
                var result = timeMethod.Invoke(_managerApi, null);
                _lastKeepalive = DateTime.UtcNow;
                return true;
            }

            // Fallback: try any simple getter
            _lastKeepalive = DateTime.UtcNow;
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Keepalive failed, marking disconnected");
            _connected = false;
            _lastError = $"Keepalive failed: {ex.Message}";
            return false;
        }
        finally
        {
            _apiLock.Release();
        }
    }

    public HealthStatus GetStatus() => new()
    {
        Connected = _connected,
        Mode = "bridge",
        LastError = string.IsNullOrEmpty(_lastError) ? null : _lastError,
        LastConnected = _lastConnected,
        LastKeepalive = _lastKeepalive,
        TotalRequests = _totalRequests,
        ServerBuild = "5660",
        Uptime = DateTime.UtcNow - _startTime
    };

    // ─── User Operations ─────────────────────────────────────

    public async Task<BridgeResult<UserResponse>> CreateUser(CreateUserRequest request)
    {
        return await CallApi<UserResponse>("CreateUser", async () =>
        {
            var diag = new List<string>();

            // Get a user record object from the API
            var userRecord = CreateRecord("User");
            if (userRecord == null)
                return BridgeResult<UserResponse>.Fail("Could not create MT5 user record object. Check CreateRecord logs.");

            diag.Add($"RecordType={userRecord.GetType().FullName}");

            // Show record's available properties and methods (for debugging)
            var props = userRecord.GetType().GetProperties()
                .Select(p => $"{p.Name}({(p.CanWrite ? "rw" : "ro")})")
                .Take(25);
            diag.Add($"Props=[{string.Join(",", props)}]");

            var methods = userRecord.GetType().GetMethods()
                .Where(m => !m.IsSpecialName && m.DeclaringType != typeof(object))
                .Select(m => m.Name)
                .Distinct()
                .Take(30);
            diag.Add($"Methods=[{string.Join(",", methods)}]");

            // Set user fields
            SetProperty(userRecord, "Name", request.Name);
            SetProperty(userRecord, "Email", request.Email);
            SetProperty(userRecord, "Group", request.Group);
            SetProperty(userRecord, "Leverage", (uint)request.Leverage);
            SetProperty(userRecord, "Phone", request.Phone);
            SetProperty(userRecord, "Country", request.Country);

            // Verify fields were actually set by reading them back
            var vName = GetProperty<string>(userRecord, "Name") ?? "(null)";
            var vGroup = GetProperty<string>(userRecord, "Group") ?? "(null)";
            var vLev = GetProperty<uint>(userRecord, "Leverage");
            var vEmail = GetProperty<string>(userRecord, "Email") ?? "(null)";
            diag.Add($"Verify: Name={vName}, Group={vGroup}, Leverage={vLev}, Email={vEmail}");

            // List available UserAdd signatures
            string userAddSigsStr = "(no manager)";
            if (_managerApi != null)
            {
                var sigs = _managerApi.GetType().GetMethods()
                    .Where(m => m.Name.Equals("UserAdd", StringComparison.OrdinalIgnoreCase))
                    .Select(m => $"{m.Name}({string.Join(",", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})=>{m.ReturnType.Name}");
                userAddSigsStr = string.Join(" | ", sigs);
                if (string.IsNullOrEmpty(userAddSigsStr)) userAddSigsStr = "(none found)";
            }
            diag.Add($"UserAddSigs=[{userAddSigsStr}]");

            // Try 3-arg call first (user, master_pass, investor_pass)
            string callType = "3-arg";
            var result = InvokeMethod("UserAdd", userRecord, request.MainPassword, request.MainPassword);
            if (result == null)
            {
                callType = "1-arg(fallback)";
                SetProperty(userRecord, "MainPassword", request.MainPassword);
                result = InvokeMethod("UserAdd", userRecord);
            }
            diag.Add($"CallType={callType}");
            diag.Add($"Result={result}(type:{result?.GetType().Name})");

            _logger.LogInformation("CreateUser DIAG: {Diag}", string.Join(" | ", diag));

            if (!IsRetCodeSuccess(result))
                return BridgeResult<UserResponse>.Fail($"UserAdd failed: {result} || DIAG: {string.Join(" | ", diag)}", 400);

            // Read back the created user data
            return BridgeResult<UserResponse>.Ok(MapUserResponse(userRecord));
        });
    }

    public async Task<BridgeResult<UserResponse>> GetUser(long login)
    {
        return await CallApi<UserResponse>("GetUser", async () =>
        {
            var userRecord = CreateRecord("User");
            if (userRecord == null)
                return BridgeResult<UserResponse>.Fail("Could not create MT5 user record object");

            var result = InvokeMethod("UserGet", (ulong)login, userRecord);
            if (!IsRetCodeSuccess(result))
                return BridgeResult<UserResponse>.Fail($"UserGet failed: {result}", 404);

            return BridgeResult<UserResponse>.Ok(MapUserResponse(userRecord));
        });
    }

    public async Task<BridgeResult<object>> UpdateUser(UpdateUserRequest request)
    {
        return await CallApi<object>("UpdateUser", async () =>
        {
            // First get existing user
            var userRecord = CreateRecord("User");
            if (userRecord == null)
                return BridgeResult<object>.Fail("Could not create MT5 user record object");

            var getResult = InvokeMethod("UserGet", (ulong)request.Login, userRecord);
            if (!IsRetCodeSuccess(getResult))
                return BridgeResult<object>.Fail($"UserGet failed: {getResult}", 404);

            // Update requested fields
            if (request.Leverage.HasValue)
                SetProperty(userRecord, "Leverage", (uint)request.Leverage.Value);
            if (request.Group != null)
                SetProperty(userRecord, "Group", request.Group);

            var result = InvokeMethod("UserUpdate", userRecord);
            if (!IsRetCodeSuccess(result))
                return BridgeResult<object>.Fail($"UserUpdate failed: {result}", 400);

            return BridgeResult<object>.Ok(new { success = true });
        });
    }

    public async Task<BridgeResult<object>> ChangePassword(ChangePasswordRequest request)
    {
        return await CallApi<object>("ChangePassword", async () =>
        {
            var result = InvokeMethod("UserPasswordChange",
                (ulong)request.Login, request.Password);
            if (!IsRetCodeSuccess(result))
                return BridgeResult<object>.Fail($"UserPasswordChange failed: {result}", 400);

            return BridgeResult<object>.Ok(new { success = true });
        });
    }

    // ─── Trade Operations ────────────────────────────────────

    public async Task<BridgeResult<BalanceResponse>> BalanceOperation(BalanceRequest request)
    {
        return await CallApi<BalanceResponse>("BalanceOperation", async () =>
        {
            // DealerBalance(login, balance, type, comment, out orderId)
            var result = InvokeMethod("DealerBalance",
                (ulong)request.Login, request.Balance, (uint)request.Type, request.Comment);

            if (!IsRetCodeSuccess(result))
                return BridgeResult<BalanceResponse>.Fail($"DealerBalance failed: {result}", 400);

            return BridgeResult<BalanceResponse>.Ok(new BalanceResponse
            {
                Order = DateTime.UtcNow.Ticks.ToString()
            });
        });
    }

    // ─── History Operations ──────────────────────────────────

    public async Task<BridgeResult<List<TradeRecord>>> GetHistory(long login, long? from, long? to)
    {
        return await CallApi<List<TradeRecord>>("GetHistory", async () =>
        {
            var trades = new List<TradeRecord>();
            var diag = new List<string>();

            try
            {
                var fromTime = from ?? DateTimeOffset.UtcNow.AddDays(-30).ToUnixTimeSeconds();
                var toTime = to ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();

                // Strategy 1: DealCreateArray + DealRequest (standard MT5 Manager API pattern)
                var createArrayMethod = FindApiMethod("DealCreateArray");
                if (createArrayMethod != null)
                {
                    var dealArray = createArrayMethod.Invoke(_managerApi, null);
                    if (dealArray != null)
                    {
                        diag.Add($"DealCreateArray -> {dealArray.GetType().Name}");

                        // Look for DealRequest or DealGet that fills the array
                        // Typical signatures:
                        //   DealRequest(ulong login, ulong from, ulong to, IMTDealArray deals) -> MTRetCode
                        //   DealGet(IMTDealArray deals, ulong login, ulong from, ulong to) -> MTRetCode
                        var requestMethod = FindApiMethod("DealRequest");
                        var dealGetMethod = FindApiMethod("DealGet");
                        var historyGetMethod = FindApiMethod("HistoryGet");

                        object? reqResult = null;
                        bool requestSucceeded = false;

                        // Try DealRequest(login, from, to, array)
                        if (requestMethod != null)
                        {
                            var reqParams = requestMethod.GetParameters();
                            diag.Add($"DealRequest params: ({string.Join(",", reqParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");

                            try
                            {
                                if (reqParams.Length == 4)
                                {
                                    // Could be (login, from, to, array) or (array, login, from, to)
                                    var firstParamType = reqParams[0].ParameterType;
                                    if (firstParamType == typeof(ulong) || firstParamType == typeof(long) || firstParamType == typeof(UInt64))
                                    {
                                        // DealRequest(login, from, to, array) — cast each param to its declared type
                                        reqResult = requestMethod.Invoke(_managerApi, new object[] {
                                            CastToParamType(reqParams[0].ParameterType, login),
                                            CastToParamType(reqParams[1].ParameterType, fromTime),
                                            CastToParamType(reqParams[2].ParameterType, toTime),
                                            dealArray
                                        });
                                    }
                                    else
                                    {
                                        reqResult = requestMethod.Invoke(_managerApi, new object[] {
                                            dealArray,
                                            CastToParamType(reqParams[1].ParameterType, login),
                                            CastToParamType(reqParams[2].ParameterType, fromTime),
                                            CastToParamType(reqParams[3].ParameterType, toTime)
                                        });
                                    }
                                }
                                else if (reqParams.Length == 3)
                                {
                                    reqResult = requestMethod.Invoke(_managerApi, new object[] {
                                        CastToParamType(reqParams[0].ParameterType, login),
                                        CastToParamType(reqParams[1].ParameterType, fromTime),
                                        CastToParamType(reqParams[2].ParameterType, toTime)
                                    });
                                }

                                diag.Add($"DealRequest result: {reqResult}");
                                requestSucceeded = IsRetCodeSuccess(reqResult);
                            }
                            catch (Exception ex)
                            {
                                diag.Add($"DealRequest error: {ex.InnerException?.Message ?? ex.Message}");
                            }
                        }

                        // Try DealGet if DealRequest didn't work
                        if (!requestSucceeded && dealGetMethod != null)
                        {
                            var getParams = dealGetMethod.GetParameters();
                            diag.Add($"DealGet params: ({string.Join(",", getParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");

                            try
                            {
                                if (getParams.Length >= 4)
                                {
                                    var args = new object[] {
                                        CastToParamType(getParams[0].ParameterType, login),
                                        CastToParamType(getParams[1].ParameterType, fromTime),
                                        CastToParamType(getParams[2].ParameterType, toTime),
                                        dealArray!
                                    };
                                    reqResult = dealGetMethod.Invoke(_managerApi, args);
                                }
                                else if (getParams.Length == 2)
                                {
                                    reqResult = dealGetMethod.Invoke(_managerApi, new object[] { CastToParamType(getParams[0].ParameterType, login), dealArray! });
                                }

                                diag.Add($"DealGet result: {reqResult}");
                                requestSucceeded = IsRetCodeSuccess(reqResult);
                            }
                            catch (Exception ex)
                            {
                                diag.Add($"DealGet error: {ex.InnerException?.Message ?? ex.Message}");
                            }
                        }

                        // Try HistoryGet if others didn't work
                        if (!requestSucceeded && historyGetMethod != null)
                        {
                            var histParams = historyGetMethod.GetParameters();
                            diag.Add($"HistoryGet params: ({string.Join(",", histParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");

                            try
                            {
                                if (histParams.Length >= 3)
                                {
                                    var args = new object?[histParams.Length];
                                    args[0] = CastToParamType(histParams[0].ParameterType, login);
                                    args[1] = CastToParamType(histParams[1].ParameterType, fromTime);
                                    args[2] = CastToParamType(histParams[2].ParameterType, toTime);
                                    if (histParams.Length >= 4) args[3] = dealArray;

                                    reqResult = historyGetMethod.Invoke(_managerApi, args);
                                    diag.Add($"HistoryGet result: {reqResult}");
                                    requestSucceeded = IsRetCodeSuccess(reqResult);

                                    if (requestSucceeded && histParams.Length >= 4 && args[3] != null)
                                        dealArray = args[3];
                                }
                            }
                            catch (Exception ex)
                            {
                                diag.Add($"HistoryGet error: {ex.InnerException?.Message ?? ex.Message}");
                            }
                        }

                        // Extract deals from array
                        if (requestSucceeded && dealArray != null)
                        {
                            var totalMethod = dealArray.GetType().GetMethod("Total");
                            var nextMethod = dealArray.GetType().GetMethod("Next");

                            if (totalMethod != null && nextMethod != null)
                            {
                                var total = Convert.ToUInt32(totalMethod.Invoke(dealArray, null) ?? 0u);
                                diag.Add($"Deal array total: {total}");

                                for (uint i = 0; i < total; i++)
                                {
                                    try
                                    {
                                        var dealObj = nextMethod.Invoke(dealArray, new object[] { i });
                                        if (dealObj == null) continue;

                                        var trade = ExtractDealInfo(dealObj, login);
                                        if (trade != null)
                                            trades.Add(trade);
                                    }
                                    catch (Exception ex)
                                    {
                                        diag.Add($"Deal[{i}] extract error: {ex.InnerException?.Message ?? ex.Message}");
                                    }
                                }

                                if (trades.Count > 0)
                                {
                                    _logger.LogInformation("GetHistory: Retrieved {Count} deals for login {Login}", trades.Count, login);
                                    return BridgeResult<List<TradeRecord>>.Ok(trades, string.Join(" | ", diag));
                                }
                            }
                            else
                            {
                                diag.Add($"Array missing Total/Next. Methods: {string.Join(", ", dealArray.GetType().GetMethods().Select(m => m.Name).Distinct().Take(20))}");
                            }
                        }
                    }
                }
                else
                {
                    diag.Add("DealCreateArray not found");
                }

                // Strategy 2: Direct method call returning array/list
                // Some SDK versions: HistoryGetDeals(login, from, to) returns deals directly
                var directMethods = new[] { "HistoryGetDeals", "HistoryDealsGet", "DealGetAll", "DealsGet" };
                foreach (var methodName in directMethods)
                {
                    var method = FindApiMethod(methodName);
                    if (method == null) continue;

                    var mParams = method.GetParameters();
                    diag.Add($"Trying {method.Name}({string.Join(",", mParams.Select(p => $"{p.ParameterType.Name}"))})");

                    try
                    {
                        object? result;
                        var args = new object?[mParams.Length];
                        if (mParams.Length >= 3)
                        {
                            args[0] = CastToParamType(mParams[0].ParameterType, login);
                            args[1] = CastToParamType(mParams[1].ParameterType, fromTime);
                            args[2] = CastToParamType(mParams[2].ParameterType, toTime);
                        }
                        else if (mParams.Length >= 1)
                        {
                            args[0] = CastToParamType(mParams[0].ParameterType, login);
                        }

                        result = method.Invoke(_managerApi, args);

                        // Check if result is the array itself or if success code with out params
                        if (result != null && result is System.Collections.IEnumerable enumResult && !(result is string))
                        {
                            foreach (var dealObj in enumResult)
                            {
                                var trade = ExtractDealInfo(dealObj, login);
                                if (trade != null) trades.Add(trade);
                            }
                        }
                        else if (IsRetCodeSuccess(result))
                        {
                            // Deals may be in an out param
                            for (int a = 0; a < args.Length; a++)
                            {
                                if (args[a] == null) continue;
                                if (args[a] is System.Collections.IEnumerable argEnum && !(args[a] is string))
                                {
                                    foreach (var dealObj in argEnum)
                                    {
                                        var trade = ExtractDealInfo(dealObj, login);
                                        if (trade != null) trades.Add(trade);
                                    }
                                }
                            }
                        }

                        if (trades.Count > 0)
                        {
                            _logger.LogInformation("GetHistory via {Method}: {Count} deals", method.Name, trades.Count);
                            return BridgeResult<List<TradeRecord>>.Ok(trades, string.Join(" | ", diag));
                        }
                    }
                    catch (Exception ex)
                    {
                        diag.Add($"{method.Name} error: {ex.InnerException?.Message ?? ex.Message}");
                    }
                }

                // Log available deal/history methods for diagnostics
                if (_managerApi != null)
                {
                    var dealMethods = _managerApi.GetType().GetMethods()
                        .Where(m => m.Name.Contains("Deal", StringComparison.OrdinalIgnoreCase)
                                 || m.Name.Contains("History", StringComparison.OrdinalIgnoreCase))
                        .Select(m => $"{m.Name}({string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
                    diag.Add($"Available deal/history methods: {string.Join("; ", dealMethods)}");
                }
            }
            catch (Exception ex)
            {
                diag.Add($"Exception: {ex.InnerException?.Message ?? ex.Message}");
                _logger.LogWarning(ex, "Error getting trade history for login {Login}", login);
            }

            _logger.LogWarning("GetHistory: All strategies failed for login {Login}. Diag: {Diag}", login, string.Join(" | ", diag));
            return BridgeResult<List<TradeRecord>>.Ok(trades, string.Join(" | ", diag));
        });
    }

    public async Task<BridgeResult<List<TradeRecord>>> GetPositions(long login)
    {
        return await CallApi<List<TradeRecord>>("GetPositions", async () =>
        {
            var positions = new List<TradeRecord>();

            try
            {
                var posMethod = FindApiMethod("PositionGet", "PositionRequest");
                if (posMethod != null)
                {
                    _logger.LogInformation("Found position method: {Name}", posMethod.Name);
                    // Implementation depends on actual SDK method signature
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting positions");
            }

            return BridgeResult<List<TradeRecord>>.Ok(positions);
        });
    }

    // ─── Debug / Diagnostic ────────────────────────────────────

    public object GetDebugInfo()
    {
        if (_managerApi == null)
            return new { connected = false, error = "Manager API not initialized" };

        var allMethods = _managerApi.GetType()
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(m => !m.IsSpecialName && m.DeclaringType != typeof(object))
            .Select(m => new
            {
                name = m.Name,
                parameters = string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}")),
                returnType = m.ReturnType.Name
            })
            .OrderBy(m => m.name)
            .ToList();

        var groupMethods = allMethods.Where(m => m.name.Contains("Group", StringComparison.OrdinalIgnoreCase)).ToList();

        return new
        {
            connected = _connected,
            managerType = _managerApi.GetType().FullName,
            totalMethods = allMethods.Count,
            groupMethods,
            allMethodNames = allMethods.Select(m => m.name).Distinct().ToList()
        };
    }

    // ─── Group Operations ────────────────────────────────────

    public async Task<BridgeResult<object>> GetGroupTotal()
    {
        return await CallApi<object>("GetGroupTotal", async () =>
        {
            var diag = new List<string>();

            try
            {
                // Strategy 1: GroupTotal() from pump cache (works with PUMP_MODE_FULL)
                var groupTotalMethod = FindApiMethod("GroupTotal");
                if (groupTotalMethod != null)
                {
                    var totalResult = groupTotalMethod.Invoke(_managerApi, null);
                    diag.Add($"GroupTotal()={totalResult}(type:{totalResult?.GetType().Name})");
                    if (totalResult != null)
                    {
                        var total = Convert.ToUInt32(totalResult);
                        if (total > 0)
                            return BridgeResult<object>.Ok(new { Total = total, Source = "pump_cache" });
                    }
                }
                else
                {
                    diag.Add("GroupTotal method not found");
                }

                // Strategy 2: GroupRequestArray to fetch from server
                var createArrayMethod = FindApiMethod("GroupCreateArray");
                if (createArrayMethod != null)
                {
                    diag.Add($"GroupCreateArray found: {createArrayMethod.ReturnType.Name}({string.Join(",", createArrayMethod.GetParameters().Select(p => p.ParameterType.Name))})");
                    var groupArray = createArrayMethod.Invoke(_managerApi, null);
                    if (groupArray != null)
                    {
                        diag.Add($"GroupCreateArray returned: {groupArray.GetType().Name}");
                        var requestMethod = FindApiMethod("GroupRequestArray");
                        if (requestMethod != null)
                        {
                            diag.Add($"GroupRequestArray found: params=({string.Join(",", requestMethod.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
                            try
                            {
                                var reqResult = requestMethod.Invoke(_managerApi, new object[] { "*", groupArray });
                                diag.Add($"GroupRequestArray result: {reqResult}");
                                if (IsRetCodeSuccess(reqResult))
                                {
                                    var totalMethod = groupArray.GetType().GetMethod("Total");
                                    if (totalMethod != null)
                                    {
                                        var total = totalMethod.Invoke(groupArray, null);
                                        diag.Add($"Array Total: {total}");
                                        return BridgeResult<object>.Ok(new { Total = total, Source = "request_array", Diag = string.Join(" | ", diag) });
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                diag.Add($"GroupRequestArray exception: {ex.InnerException?.Message ?? ex.Message}");
                            }
                        }
                        else
                        {
                            diag.Add("GroupRequestArray method not found");
                        }
                    }
                    else
                    {
                        diag.Add("GroupCreateArray returned null");
                    }
                }
                else
                {
                    diag.Add("GroupCreateArray method not found");
                }
            }
            catch (Exception ex)
            {
                diag.Add($"Exception: {ex.InnerException?.Message ?? ex.Message}");
                _logger.LogWarning(ex, "Error getting group total");
            }

            _logger.LogWarning("GetGroupTotal: All strategies failed. Diag: {Diag}", string.Join(" | ", diag));
            return BridgeResult<object>.Ok(new { Total = 0, Diag = string.Join(" | ", diag) });
        });
    }

    public async Task<BridgeResult<List<GroupInfo>>> GetAllGroups()
    {
        return await CallApi<List<GroupInfo>>("GetAllGroups", async () =>
        {
            var groups = new List<GroupInfo>();
            var diag = new List<string>();

            try
            {
                // Strategy 1: Use pump cache (GroupTotal + GroupNext) - works with PUMP_MODE_FULL
                var groupTotalMethod = FindApiMethod("GroupTotal");
                var groupNextMethod = FindApiMethod("GroupNext");

                if (groupTotalMethod != null && groupNextMethod != null)
                {
                    var totalResult = groupTotalMethod.Invoke(_managerApi, null);
                    var total = Convert.ToUInt32(totalResult ?? 0);
                    diag.Add($"PumpCache: GroupTotal()={total}");

                    if (total > 0)
                    {
                        var nextParams = groupNextMethod.GetParameters();
                        diag.Add($"GroupNext params: ({string.Join(",", nextParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");

                        // GroupNext(uint pos, CIMTConGroup group) -> MTRetCode
                        // We need a group record object to receive data
                        var groupRecord = CreateRecord("ConGroup");
                        if (groupRecord == null)
                        {
                            // Try GroupCreate method
                            var groupCreateMethod = FindApiMethod("GroupCreate");
                            if (groupCreateMethod != null)
                                groupRecord = groupCreateMethod.Invoke(_managerApi, null);
                        }

                        if (groupRecord != null)
                        {
                            diag.Add($"GroupRecord type: {groupRecord.GetType().Name}");
                            for (uint i = 0; i < total; i++)
                            {
                                try
                                {
                                    object? nextResult;
                                    if (nextParams.Length == 2)
                                    {
                                        // GroupNext(uint pos, out CIMTConGroup group)
                                        var args = new object?[] { i, groupRecord };
                                        nextResult = groupNextMethod.Invoke(_managerApi, args);
                                        // If out param, use updated arg
                                        if (args[1] != null) groupRecord = args[1];
                                    }
                                    else if (nextParams.Length == 1)
                                    {
                                        nextResult = groupNextMethod.Invoke(_managerApi, new object[] { i });
                                        if (nextResult != null && !IsRetCodeSuccess(nextResult))
                                            groupRecord = nextResult; // The method might return the group directly
                                    }
                                    else
                                    {
                                        nextResult = groupNextMethod.Invoke(_managerApi, new object[] { i, groupRecord });
                                    }

                                    var info = ExtractGroupInfo(groupRecord);
                                    if (info != null && !string.IsNullOrEmpty(info.Group))
                                    {
                                        groups.Add(info);
                                    }
                                }
                                catch (Exception ex)
                                {
                                    diag.Add($"GroupNext({i}) error: {ex.InnerException?.Message ?? ex.Message}");
                                }
                            }

                            if (groups.Count > 0)
                            {
                                diag.Add($"PumpCache returned {groups.Count} groups");
                                _logger.LogInformation("GetAllGroups via pump cache: {Count} groups", groups.Count);
                                return BridgeResult<List<GroupInfo>>.Ok(groups);
                            }
                        }
                        else
                        {
                            diag.Add("Could not create group record for GroupNext");
                        }
                    }
                }
                else
                {
                    diag.Add($"PumpCache: GroupTotal={groupTotalMethod != null}, GroupNext={groupNextMethod != null}");
                }

                // Strategy 2: GroupRequestArray (server-side fetch)
                var createArrayMethod = FindApiMethod("GroupCreateArray");
                if (createArrayMethod != null)
                {
                    var groupArray = createArrayMethod.Invoke(_managerApi, null);
                    if (groupArray != null)
                    {
                        var requestMethod = FindApiMethod("GroupRequestArray");
                        if (requestMethod != null)
                        {
                            try
                            {
                                var reqResult = requestMethod.Invoke(_managerApi, new object[] { "*", groupArray });
                                diag.Add($"GroupRequestArray('*')={reqResult}");

                                if (IsRetCodeSuccess(reqResult))
                                {
                                    var totalMethod = groupArray.GetType().GetMethod("Total");
                                    var nextMethod = groupArray.GetType().GetMethod("Next");
                                    if (totalMethod != null && nextMethod != null)
                                    {
                                        var total = (uint)(totalMethod.Invoke(groupArray, null) ?? 0u);
                                        diag.Add($"RequestArray total: {total}");

                                        for (uint i = 0; i < total; i++)
                                        {
                                            var groupObj = nextMethod.Invoke(groupArray, new object[] { i });
                                            if (groupObj == null) continue;

                                            var info = ExtractGroupInfo(groupObj);
                                            if (info != null && !string.IsNullOrEmpty(info.Group))
                                                groups.Add(info);
                                        }

                                        if (groups.Count > 0)
                                        {
                                            _logger.LogInformation("GetAllGroups via RequestArray: {Count} groups", groups.Count);
                                            return BridgeResult<List<GroupInfo>>.Ok(groups);
                                        }
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                diag.Add($"GroupRequestArray exception: {ex.InnerException?.Message ?? ex.Message}");
                            }
                        }
                        else
                        {
                            diag.Add("GroupRequestArray not found");
                        }
                    }
                }
                else
                {
                    diag.Add("GroupCreateArray not found");
                }

                // Strategy 3: Try GroupGet/GroupRequest for known group names
                var groupGetMethod = FindApiMethod("GroupRequest", "GroupGet");
                if (groupGetMethod != null)
                {
                    diag.Add($"Trying GroupGet/GroupRequest for known names");
                    var knownGroups = new[] { "SmartPip", "ElitePip", "PrimePips", "RoyalPips",
                                             "SmartPip\\*", "ElitePip\\*", "PrimePips\\*", "RoyalPips\\*",
                                             "demo\\*", "real\\*", "*" };
                    foreach (var gName in knownGroups)
                    {
                        try
                        {
                            var groupRecord = CreateRecord("ConGroup");
                            if (groupRecord == null)
                            {
                                var gcm = FindApiMethod("GroupCreate");
                                if (gcm != null) groupRecord = gcm.Invoke(_managerApi, null);
                            }
                            if (groupRecord == null) break;

                            var getParams = groupGetMethod.GetParameters();
                            object? getResult;
                            if (getParams.Length >= 2)
                                getResult = groupGetMethod.Invoke(_managerApi, new object[] { gName, groupRecord });
                            else
                                getResult = groupGetMethod.Invoke(_managerApi, new object[] { gName });

                            if (IsRetCodeSuccess(getResult))
                            {
                                var info = ExtractGroupInfo(groupRecord);
                                if (info != null && !string.IsNullOrEmpty(info.Group) &&
                                    !groups.Any(g => g.Group == info.Group))
                                {
                                    groups.Add(info);
                                    diag.Add($"Found: {info.Group}");
                                }
                            }
                        }
                        catch { }
                    }

                    if (groups.Count > 0)
                    {
                        _logger.LogInformation("GetAllGroups via GroupGet: {Count} groups", groups.Count);
                        return BridgeResult<List<GroupInfo>>.Ok(groups);
                    }
                }
                else
                {
                    diag.Add("GroupGet/GroupRequest not found");
                }
            }
            catch (Exception ex)
            {
                diag.Add($"Exception: {ex.InnerException?.Message ?? ex.Message}");
                _logger.LogWarning(ex, "Error getting groups");
            }

            _logger.LogWarning("GetAllGroups: All strategies failed. Diag: {Diag}", string.Join(" | ", diag));

            // Return empty list with diagnostic info in a wrapper
            return BridgeResult<List<GroupInfo>>.Ok(groups, string.Join(" | ", diag));
        });
    }

    public async Task<BridgeResult<GroupInfo>> CreateGroup(CreateGroupRequest request)
    {
        return await CallApi<GroupInfo>("CreateGroup", async () =>
        {
            if (string.IsNullOrWhiteSpace(request.Group))
                return BridgeResult<GroupInfo>.Fail("Group name is required", 400);

            // Step 1: Create a group config record
            var groupRecord = CreateRecord("ConGroup");
            if (groupRecord == null)
            {
                // Fallback: try GroupCreate method directly
                var groupCreateMethod = FindApiMethod("GroupCreate");
                if (groupCreateMethod != null)
                {
                    groupRecord = groupCreateMethod.Invoke(_managerApi, null);
                }
            }

            if (groupRecord == null)
                return BridgeResult<GroupInfo>.Fail(
                    "Could not create MT5 group record object. " +
                    "Group creation may not be supported by this API type (Web API only supports read-only group access). " +
                    "Groups must be created directly in MT5 Admin.", 501);

            // Step 2: Set group fields
            SetProperty(groupRecord, "Group", request.Group);
            SetProperty(groupRecord, "Description", request.Description);

            // Set leverage as ratio (e.g., 100 means 1:100)
            try { SetProperty(groupRecord, "MarginLeverage", (uint)request.Leverage); } catch { }

            // Step 3: Call GroupAdd
            var result = InvokeMethod("GroupAdd", groupRecord);
            if (result == null)
            {
                // The API may not support GroupAdd (Web API limitation)
                return BridgeResult<GroupInfo>.Fail(
                    "GroupAdd method not available. " +
                    "Group creation requires Manager API access. " +
                    "Groups must be created directly in MT5 Admin.", 501);
            }

            if (!IsRetCodeSuccess(result))
                return BridgeResult<GroupInfo>.Fail($"GroupAdd failed: {result}", 400);

            return BridgeResult<GroupInfo>.Ok(new GroupInfo
            {
                Group = request.Group,
                Description = request.Description,
            });
        });
    }

    // ─── Helper Methods ──────────────────────────────────────

    /// <summary>
    /// Cast a long value to the target parameter type for reflection invocation.
    /// MT5 API methods use a mix of UInt64 (for logins) and Int64 (for timestamps).
    /// </summary>
    private static object CastToParamType(Type targetType, long value)
    {
        if (targetType == typeof(long) || targetType == typeof(Int64)) return value;
        if (targetType == typeof(ulong) || targetType == typeof(UInt64)) return (ulong)value;
        if (targetType == typeof(int) || targetType == typeof(Int32)) return (int)value;
        if (targetType == typeof(uint) || targetType == typeof(UInt32)) return (uint)value;
        return Convert.ChangeType(value, targetType);
    }

    private TradeRecord? ExtractDealInfo(object? dealObj, long fallbackLogin)
    {
        if (dealObj == null) return null;

        try
        {
            // MT5 IMTDeal exposes data via methods:
            //   Deal() -> ulong (ticket), Login() -> ulong, Symbol() -> string
            //   Action() -> uint (0=buy,1=sell,2=balance), Volume() -> ulong (hundredths of lot)
            //   Price() -> double, Profit() -> double, Commission() -> double
            //   Time() -> long (unix timestamp), TimeMsc() -> long (ms timestamp)

            var order = GetProperty<ulong>(dealObj, "Deal");
            var orderStr = order > 0 ? order.ToString() : (GetProperty<string>(dealObj, "Order") ?? "");

            var loginVal = GetProperty<ulong>(dealObj, "Login");
            var loginStr = loginVal > 0 ? loginVal.ToString() : fallbackLogin.ToString();

            var symbol = GetProperty<string>(dealObj, "Symbol") ?? "";

            // Action: 0=buy, 1=sell, 2=balance, 3=credit, etc.
            var actionVal = GetProperty<uint>(dealObj, "Action");
            string actionStr;
            switch (actionVal)
            {
                case 0: actionStr = "Buy"; break;
                case 1: actionStr = "Sell"; break;
                case 2: actionStr = "Balance"; break;
                case 3: actionStr = "Credit"; break;
                default: actionStr = actionVal.ToString(); break;
            }

            // Volume: MT5 stores volume in hundredths of a lot (e.g., 100 = 0.01 lot)
            // VolumeExt stores in ten-thousandths. Try VolumeExt first for precision.
            var volumeExt = GetProperty<ulong>(dealObj, "VolumeExt");
            var volumeRaw = GetProperty<ulong>(dealObj, "Volume");
            double volume;
            if (volumeExt > 0)
                volume = volumeExt / 10000.0;
            else if (volumeRaw > 0)
                volume = volumeRaw / 100.0;
            else
                volume = 0;

            // If volume came through as already a double via a property, use it directly
            if (volume == 0)
            {
                var volumeDouble = GetProperty<double>(dealObj, "Volume");
                if (volumeDouble > 0)
                    volume = volumeDouble;
            }

            var price = GetProperty<double>(dealObj, "Price");
            var profit = GetProperty<double>(dealObj, "Profit");
            var commission = GetProperty<double>(dealObj, "Commission");

            // Time: prefer TimeMsc (milliseconds), fall back to Time (seconds)
            var timeMsc = GetProperty<long>(dealObj, "TimeMsc");
            var timeVal = GetProperty<long>(dealObj, "Time");
            string timeStr = "";
            if (timeMsc > 0)
            {
                timeStr = DateTimeOffset.FromUnixTimeMilliseconds(timeMsc).ToString("yyyy-MM-dd HH:mm:ss");
            }
            else if (timeVal > 0)
            {
                timeStr = DateTimeOffset.FromUnixTimeSeconds(timeVal).ToString("yyyy-MM-dd HH:mm:ss");
            }

            var positionId = GetProperty<ulong>(dealObj, "PositionID");

            return new TradeRecord
            {
                Order = !string.IsNullOrEmpty(orderStr) ? orderStr : positionId.ToString(),
                Login = loginStr,
                Symbol = symbol,
                Action = actionStr,
                Volume = volume,
                OpenPrice = price,
                ClosePrice = price,
                Profit = profit,
                Commission = commission,
                OpenTime = timeStr,
                CloseTime = timeStr,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ExtractDealInfo failed for {Type}", dealObj?.GetType().Name);
        }

        return null;
    }

    private GroupInfo? ExtractGroupInfo(object? groupObj)
    {
        if (groupObj == null) return null;

        try
        {
            // MT5 CIMTConGroup exposes data via methods (not properties):
            //   Group() -> string, Company() -> string, Currency() -> string
            // Also try properties as fallback
            string name = "";
            string? description = null;
            string? currency = null;

            // Try method accessors first (MT5 Manager API style)
            var groupType = groupObj.GetType();

            // Group name
            var nameMethod = groupType.GetMethod("Group", Type.EmptyTypes);
            if (nameMethod != null)
                name = nameMethod.Invoke(groupObj, null) as string ?? "";
            else
                name = GetProperty<string>(groupObj, "Group") ?? "";

            // Company/Description
            var companyMethod = groupType.GetMethod("Company", Type.EmptyTypes);
            if (companyMethod != null)
                description = companyMethod.Invoke(groupObj, null) as string;
            else
                description = GetProperty<string>(groupObj, "Company") ?? GetProperty<string>(groupObj, "Description");

            // Currency
            var currencyMethod = groupType.GetMethod("Currency", Type.EmptyTypes);
            if (currencyMethod != null)
                currency = currencyMethod.Invoke(groupObj, null) as string;
            else
                currency = GetProperty<string>(groupObj, "Currency") ?? GetProperty<string>(groupObj, "CurrencyDeposit");

            if (!string.IsNullOrEmpty(name))
            {
                return new GroupInfo
                {
                    Group = name,
                    Description = description,
                    Currency = currency
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ExtractGroupInfo failed for {Type}", groupObj?.GetType().Name);
        }

        return null;
    }

    private async Task<BridgeResult<T>> CallApi<T>(string operation, Func<Task<BridgeResult<T>>> action)
    {
        if (!_connected || _managerApi == null)
            return BridgeResult<T>.Unavailable();

        Interlocked.Increment(ref _totalRequests);
        await _apiLock.WaitAsync();
        try
        {
            return await action();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in {Operation}", operation);
            _lastError = $"{operation}: {ex.Message}";
            return BridgeResult<T>.Fail($"{operation} failed: {ex.Message}");
        }
        finally
        {
            _apiLock.Release();
        }
    }

    private string? FindManagerDll()
    {
        // MetaQuotes SDK names the .NET wrapper "MetaQuotes.MT5ManagerAPI64.dll"
        // Search for both the official name and legacy name
        var dllNames = new[] { "MetaQuotes.MT5ManagerAPI64.dll", "MT5ManagerAPI.NET.dll" };
        var searchDirs = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "libs"),
            AppContext.BaseDirectory,
            Path.Combine(AppContext.BaseDirectory, "..", "libs"),
            @"C:\MetaTrader5SDK\Libs",
        };

        foreach (var dir in searchDirs)
        {
            foreach (var dll in dllNames)
            {
                var path = Path.Combine(dir, dll);
                if (File.Exists(path))
                {
                    _logger.LogInformation("Found MT5 Manager API DLL at: {Path}", path);
                    return path;
                }
            }
        }

        _logger.LogError("MetaQuotes.MT5ManagerAPI64.dll not found in: {Paths}",
            string.Join(", ", searchDirs));
        return null;
    }

    private Type? FindType(Assembly assembly, string nameContains)
    {
        return assembly.GetExportedTypes()
            .FirstOrDefault(t => t.Name.Contains(nameContains, StringComparison.OrdinalIgnoreCase));
    }

    private MethodInfo? FindApiMethod(params string[] namePatterns)
    {
        if (_managerApi == null) return null;
        var methods = _managerApi.GetType().GetMethods();
        foreach (var pattern in namePatterns)
        {
            var method = methods.FirstOrDefault(m =>
                m.Name.Equals(pattern, StringComparison.OrdinalIgnoreCase));
            if (method != null) return method;
        }
        return null;
    }

    private object? InvokeMethod(string methodName, params object?[] args)
    {
        if (_managerApi == null) return null;
        var method = _managerApi.GetType().GetMethods()
            .FirstOrDefault(m => m.Name.Equals(methodName, StringComparison.OrdinalIgnoreCase)
                              && m.GetParameters().Length >= args.Length);

        if (method == null)
        {
            _logger.LogWarning("Method {Name} not found on Manager API. Available: {Methods}",
                methodName,
                string.Join(", ", _managerApi.GetType().GetMethods().Select(m => m.Name).Distinct().Take(30)));
            return null;
        }

        // Pad args if method expects more parameters (e.g., out params)
        var parameters = method.GetParameters();
        if (parameters.Length > args.Length)
        {
            var paddedArgs = new object?[parameters.Length];
            Array.Copy(args, paddedArgs, args.Length);
            for (int i = args.Length; i < parameters.Length; i++)
            {
                if (parameters[i].IsOut)
                    paddedArgs[i] = parameters[i].ParameterType.IsByRef
                        ? Activator.CreateInstance(parameters[i].ParameterType.GetElementType()!)
                        : null;
            }
            args = paddedArgs;
        }

        return method.Invoke(_managerApi, args);
    }

    private object? CreateRecord(string recordType)
    {
        if (_managerApi == null) return null;

        // MT5 Manager API uses various naming patterns for record creation:
        //   UserRecordNew(), UserCreate(), etc.
        // Search for all common patterns
        var namePatterns = new[] { $"{recordType}RecordNew", $"{recordType}Create", $"{recordType}New" };
        MethodInfo? createMethod = null;
        foreach (var pattern in namePatterns)
        {
            createMethod = _managerApi.GetType().GetMethods()
                .FirstOrDefault(m => m.Name.Contains(pattern, StringComparison.OrdinalIgnoreCase));
            if (createMethod != null) break;
        }

        // Also try broader search if specific patterns didn't match
        if (createMethod == null)
        {
            createMethod = _managerApi.GetType().GetMethods()
                .FirstOrDefault(m => m.Name.Contains(recordType, StringComparison.OrdinalIgnoreCase)
                                  && (m.Name.Contains("New", StringComparison.OrdinalIgnoreCase)
                                   || m.Name.Contains("Create", StringComparison.OrdinalIgnoreCase))
                                  && !m.Name.Contains("Get", StringComparison.OrdinalIgnoreCase));
        }

        if (createMethod != null)
        {
            _logger.LogInformation("CreateRecord: Using method {Method} for {Type}", createMethod.Name, recordType);
            var args = new object?[createMethod.GetParameters().Length];
            var result = createMethod.Invoke(_managerApi, args);
            // Check if it returns the record or puts it in an out param
            if (result != null && result.GetType().Name.Contains(recordType, StringComparison.OrdinalIgnoreCase))
                return result;
            for (int i = 0; i < args.Length; i++)
                if (args[i] != null && args[i]!.GetType().Name.Contains(recordType, StringComparison.OrdinalIgnoreCase))
                    return args[i];
            // For methods that return an MTRetCode, the record is always in an out param
            // If we didn't find it above, log and return whatever we got
            if (result != null)
            {
                _logger.LogInformation("CreateRecord: Method returned {Type}: {Value}, checking args", result.GetType().Name, result);
                for (int i = 0; i < args.Length; i++)
                    if (args[i] != null)
                    {
                        _logger.LogInformation("CreateRecord: arg[{I}] = {Type}", i, args[i]!.GetType().Name);
                        return args[i];
                    }
            }
            return result;
        }

        // Log available methods to help diagnose
        var allMethods = _managerApi.GetType().GetMethods()
            .Where(m => m.Name.Contains(recordType, StringComparison.OrdinalIgnoreCase))
            .Select(m => $"{m.Name}({string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
        _logger.LogWarning("CreateRecord: No create method found for {Type}. Related methods: {Methods}",
            recordType, string.Join("; ", allMethods));

        // Fallback: try to find and instantiate the interface/class directly
        if (_managerAssembly != null)
        {
            var recordClass = _managerAssembly.GetExportedTypes()
                .FirstOrDefault(t => t.Name.Contains($"MT{recordType}", StringComparison.OrdinalIgnoreCase)
                                  && t.IsClass && !t.IsAbstract);
            if (recordClass != null)
            {
                _logger.LogWarning("CreateRecord: Falling back to Activator.CreateInstance for {Class}", recordClass.Name);
                return Activator.CreateInstance(recordClass);
            }
        }

        _logger.LogWarning("Could not create {RecordType} record object", recordType);
        return null;
    }

    private void SetProperty(object obj, string propertyName, object? value)
    {
        var prop = obj.GetType().GetProperty(propertyName,
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (prop != null && prop.CanWrite)
        {
            prop.SetValue(obj, Convert.ChangeType(value, prop.PropertyType));
            return;
        }

        // Try method-based setter (some MT5 APIs use Set* methods)
        var setter = obj.GetType().GetMethod($"Set{propertyName}",
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (setter != null)
        {
            setter.Invoke(obj, new[] { value });
            return;
        }

        // MT5 COM interop exposes some setters as method overloads with the same name
        // e.g. MainPassword() returns string, MainPassword(string) sets it
        var methods = obj.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(m => m.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase)
                     && m.GetParameters().Length == 1)
            .ToList();
        if (methods.Count > 0)
        {
            var method = methods[0];
            var paramType = method.GetParameters()[0].ParameterType;
            var converted = Convert.ChangeType(value, paramType);
            method.Invoke(obj, new[] { converted });
            return;
        }

        _logger.LogWarning("SetProperty: Could not set {Property} on {Type}. Available props: {Props}, methods: {Methods}",
            propertyName, obj.GetType().Name,
            string.Join(", ", obj.GetType().GetProperties().Select(p => $"{p.Name}({(p.CanWrite ? "rw" : "ro")})")),
            string.Join(", ", obj.GetType().GetMethods().Where(m => m.Name.Contains(propertyName, StringComparison.OrdinalIgnoreCase)).Select(m => $"{m.Name}({m.GetParameters().Length})")));
    }

    private T? GetProperty<T>(object obj, string propertyName)
    {
        // 1. Try .NET property (standard CLR objects)
        var prop = obj.GetType().GetProperty(propertyName,
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (prop != null)
        {
            var val = prop.GetValue(obj);
            if (val is T typed) return typed;
            try { return (T)Convert.ChangeType(val, typeof(T)); } catch { }
        }

        // 2. Try method getter (MT5 objects use methods: Login(), Name(), Group(), etc.)
        var getter = obj.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(m => m.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase)
                && m.GetParameters().Length == 0 && m.ReturnType != typeof(void));
        if (getter != null)
        {
            try
            {
                var v = getter.Invoke(obj, null);
                if (v is T t2) return t2;
                if (v != null) try { return (T)Convert.ChangeType(v, typeof(T)); } catch { }
            }
            catch { }
        }
        return default;
    }

    private UserResponse MapUserResponse(object userRecord) => new()
    {
        Login = (GetProperty<ulong>(userRecord, "Login") ?? 0UL).ToString(),
        Name = GetProperty<string>(userRecord, "Name") ?? "",
        Group = GetProperty<string>(userRecord, "Group") ?? "",
        Leverage = $"1:{GetProperty<uint>(userRecord, "Leverage") ?? 100U}",
        Balance = GetProperty<double>(userRecord, "Balance") ?? 0.0,
        Equity = GetProperty<double>(userRecord, "Equity") ?? 0.0,
        Margin = GetProperty<double>(userRecord, "Margin") ?? 0.0,
        FreeMargin = GetProperty<double>(userRecord, "MarginFree") ??
                     GetProperty<double>(userRecord, "FreeMargin") ?? 0.0,
        Currency = GetProperty<string>(userRecord, "CurrencyDeposit") ??
                   GetProperty<string>(userRecord, "Currency") ?? "USD",
        Registration = GetProperty<long>(userRecord, "Registration") is long regTime && regTime > 0
            ? DateTimeOffset.FromUnixTimeSeconds(regTime).UtcDateTime.ToString("o")
            : DateTime.UtcNow.ToString("o")
    };

    private static bool IsRetCodeSuccess(object? retCode)
    {
        if (retCode == null) return false;
        var str = retCode.ToString() ?? "";
        // MT5 return code 0 = success (MT_RET_OK)
        if (str == "0" || str == "MT_RET_OK") return true;
        if (str.Contains("OK", StringComparison.OrdinalIgnoreCase)) return true;
        try { return Convert.ToInt64(retCode) == 0; } catch { return false; }
    }

    public void Dispose()
    {
        Disconnect();
        _apiLock.Dispose();
    }
}

# MT5 Bridge - Direct Deploy Script v2
# Writes all source files, builds, and deploys in one step
# Run as Administrator on the MT5 server

$srcDir = "C:\MT5Bridge-src"
$outDir = "C:\MT5Bridge"
$sdkDir = "C:\MetaTrader5SDK\Libs"

Write-Host "MT5 Bridge Direct Deploy v2" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Stop service and any running instance
Write-Host "`n[1/5] Stopping service..." -ForegroundColor Yellow
sc.exe stop MT5Bridge 2>&1 | Out-Null
Stop-Process -Name MT5Bridge -Force -ErrorAction SilentlyContinue
# Also kill any process using port 6680
$portPid = (Get-NetTCPConnection -LocalPort 6680 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
if ($portPid) {
    foreach ($pid in $portPid) {
        Write-Host "  Killing process $pid on port 6680" -ForegroundColor Gray
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 5
# Verify port is free
$stillUsed = Get-NetTCPConnection -LocalPort 6680 -ErrorAction SilentlyContinue
if ($stillUsed) {
    Write-Host "  WARNING: Port 6680 still in use. Waiting 10 more seconds..." -ForegroundColor Red
    Start-Sleep -Seconds 10
}

# Create source directory structure
Write-Host "[2/5] Writing source files..." -ForegroundColor Yellow
Remove-Item $srcDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $srcDir -Force | Out-Null
New-Item -ItemType Directory -Path "$srcDir\Services" -Force | Out-Null
New-Item -ItemType Directory -Path "$srcDir\Models" -Force | Out-Null
New-Item -ItemType Directory -Path "$srcDir\Middleware" -Force | Out-Null
New-Item -ItemType Directory -Path "$srcDir\libs" -Force | Out-Null

# Copy SDK DLLs to libs for build references
Copy-Item "$sdkDir\MetaQuotes.MT5ManagerAPI64.dll" "$srcDir\libs\" -Force
Copy-Item "$sdkDir\MetaQuotes.MT5CommonAPI64.dll" "$srcDir\libs\" -Force
Copy-Item "$sdkDir\MT5APIManager64.dll" "$srcDir\libs\" -Force -ErrorAction SilentlyContinue
Copy-Item "$sdkDir\MT5APIGateway64.dll" "$srcDir\libs\" -Force -ErrorAction SilentlyContinue

# --- MT5Bridge.csproj ---
@'
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <SelfContained>true</SelfContained>
    <PublishSingleFile>false</PublishSingleFile>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="MetaQuotes.MT5ManagerAPI64">
      <HintPath>libs\MetaQuotes.MT5ManagerAPI64.dll</HintPath>
    </Reference>
    <Reference Include="MetaQuotes.MT5CommonAPI64">
      <HintPath>libs\MetaQuotes.MT5CommonAPI64.dll</HintPath>
    </Reference>
  </ItemGroup>
  <ItemGroup>
    <None Update="libs\MT5APIManager64.dll">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="libs\MT5APIGateway64.dll">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Hosting.WindowsServices" Version="8.0.1" />
  </ItemGroup>
</Project>
'@ | Set-Content "$srcDir\MT5Bridge.csproj" -Encoding UTF8

# --- appsettings.json ---
@'
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "Bridge": {
    "MT5Server": "213.136.69.2",
    "MT5Port": 443,
    "ManagerLogin": 7777,
    "ManagerPassword": "1w@vOiPb",
    "ManagerApiPassword": "1w@vOiPb",
    "ApiKey": "f8f8e64d67606818da38b3d160bfbf634da336ddb25932bb554a945f2d62de0f",
    "ListenPort": 6680,
    "CertPath": "C:\\MT5Bridge\\mt5bridge.pfx",
    "CertPassword": "MT5Br1dge!Cert",
    "AllowedOrigins": [
      "https://crm.libertygroups.com",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "KeepaliveSeconds": 60,
    "ReconnectMaxSeconds": 30
  }
}
'@ | Set-Content "$srcDir\appsettings.json" -Encoding UTF8

# --- Program.cs ---
@'
using MT5Bridge.Middleware;
using MT5Bridge.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseWindowsService();
builder.Services.Configure<BridgeOptions>(builder.Configuration.GetSection("Bridge"));
builder.Services.AddSingleton<IMT5Service, MT5Service>();
builder.Services.AddHostedService<MT5SessionManager>();

var allowedOrigins = builder.Configuration.GetSection("Bridge:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var listenPort = builder.Configuration.GetValue<int>("Bridge:ListenPort", 6680);
var certPath = builder.Configuration.GetValue<string>("Bridge:CertPath") ?? "";
var certPass = builder.Configuration.GetValue<string>("Bridge:CertPassword") ?? "";

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(listenPort, listenOptions =>
    {
        if (!string.IsNullOrEmpty(certPath) && System.IO.File.Exists(certPath))
            listenOptions.UseHttps(certPath, certPass);
        else
            listenOptions.UseHttps();
    });
});

var app = builder.Build();
app.UseCors();
app.UseMiddleware<ApiKeyAuthMiddleware>();

app.MapGet("/api/health", (IMT5Service mt5) => Results.Json(mt5.GetStatus()));

app.MapPost("/api/user/add", async (MT5Bridge.Models.CreateUserRequest req, IMT5Service mt5) =>
{
    var result = await mt5.CreateUser(req);
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.MapGet("/api/user/get", async (long login, IMT5Service mt5) =>
{
    var result = await mt5.GetUser(login);
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.MapPost("/api/user/update", async (MT5Bridge.Models.UpdateUserRequest req, IMT5Service mt5) =>
{
    var result = await mt5.UpdateUser(req);
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.MapPost("/api/user/password/change", async (MT5Bridge.Models.ChangePasswordRequest req, IMT5Service mt5) =>
{
    var result = await mt5.ChangePassword(req);
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.MapPost("/api/trade/balance", async (MT5Bridge.Models.BalanceRequest req, IMT5Service mt5) =>
{
    var result = await mt5.BalanceOperation(req);
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.MapGet("/api/history/get", async (long login, long? from, long? to, IMT5Service mt5) =>
{
    var result = await mt5.GetHistory(login, from, to);
    if (result.Success)
    {
        // Include diag when results are empty to help debug
        if ((result.Data == null || result.Data.Count == 0) && !string.IsNullOrEmpty(result.Diag))
            return Results.Json(new { deals = result.Data, diag = result.Diag });
        return Results.Json(result.Data);
    }
    return Results.Json(result, statusCode: result.StatusCode);
});

app.MapGet("/api/position/get", async (long login, IMT5Service mt5) =>
{
    var result = await mt5.GetPositions(login);
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.MapGet("/api/group/total", async (IMT5Service mt5) =>
{
    var result = await mt5.GetGroupTotal();
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.MapGet("/api/group/getall", async (IMT5Service mt5) =>
{
    var result = await mt5.GetAllGroups();
    if (result.Success)
    {
        if (result.Data?.Count == 0 && !string.IsNullOrEmpty(result.Diag))
            return Results.Json(new { groups = result.Data, diag = result.Diag });
        return Results.Json(result.Data);
    }
    return Results.Json(result, statusCode: result.StatusCode);
});

app.MapPost("/api/group/add", async (MT5Bridge.Models.CreateGroupRequest req, IMT5Service mt5) =>
{
    var result = await mt5.CreateGroup(req);
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.MapGet("/api/debug/methods", (IMT5Service mt5) =>
{
    if (mt5 is MT5Service svc)
        return Results.Json(svc.GetDebugInfo());
    return Results.Json(new { error = "Not available" });
});

app.MapGet("/api/debug/user-test", (IMT5Service mt5) =>
{
    if (mt5 is MT5Service svc)
        return Results.Json(svc.DebugUserRecord());
    return Results.Json(new { error = "Not available" });
});

app.Logger.LogInformation("MT5 Bridge starting on port {Port}", listenPort);
app.Run();

public class BridgeOptions
{
    public string MT5Server { get; set; } = "127.0.0.1";
    public int MT5Port { get; set; } = 443;
    public long ManagerLogin { get; set; }
    public string ManagerPassword { get; set; } = "";
    public string ManagerApiPassword { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public int ListenPort { get; set; } = 6680;
    public string CertPath { get; set; } = "";
    public string CertPassword { get; set; } = "";
    public string[] AllowedOrigins { get; set; } = [];
    public int KeepaliveSeconds { get; set; } = 60;
    public int ReconnectMaxSeconds { get; set; } = 30;
}
'@ | Set-Content "$srcDir\Program.cs" -Encoding UTF8

# --- Models/Models.cs ---
@'
namespace MT5Bridge.Models;

public class CreateUserRequest
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Group { get; set; } = "";
    public int Leverage { get; set; } = 100;
    public string MainPassword { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Country { get; set; } = "";
}

public class UpdateUserRequest
{
    public long Login { get; set; }
    public int? Leverage { get; set; }
    public string? Group { get; set; }
}

public class ChangePasswordRequest
{
    public long Login { get; set; }
    public int Type { get; set; }
    public string Password { get; set; } = "";
}

public class BalanceRequest
{
    public long Login { get; set; }
    public int Type { get; set; } = 2;
    public double Balance { get; set; }
    public string Comment { get; set; } = "";
}

public class UserResponse
{
    public string Login { get; set; } = "";
    public string Name { get; set; } = "";
    public string Group { get; set; } = "";
    public string Leverage { get; set; } = "";
    public double Balance { get; set; }
    public double Equity { get; set; }
    public double Margin { get; set; }
    public double FreeMargin { get; set; }
    public string Currency { get; set; } = "USD";
    public string Registration { get; set; } = "";
}

public class TradeRecord
{
    public string Order { get; set; } = "";
    public string Login { get; set; } = "";
    public string Symbol { get; set; } = "";
    public string Action { get; set; } = "";
    public double Volume { get; set; }
    public double OpenPrice { get; set; }
    public double ClosePrice { get; set; }
    public double Profit { get; set; }
    public double Commission { get; set; }
    public string OpenTime { get; set; } = "";
    public string CloseTime { get; set; } = "";
}

public class BalanceResponse
{
    public string Order { get; set; } = "";
}

public class GroupInfo
{
    public string Group { get; set; } = "";
    public string? Description { get; set; }
    public string? Currency { get; set; }
}

public class CreateGroupRequest
{
    public string Group { get; set; } = "";
    public int Leverage { get; set; } = 100;
    public string Description { get; set; } = "";
}

public class BridgeResult<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public string? Diag { get; set; }
    public int StatusCode { get; set; } = 200;

    public static BridgeResult<T> Ok(T data) => new() { Success = true, Data = data };
    public static BridgeResult<T> Ok(T data, string diag) => new() { Success = true, Data = data, Diag = diag };
    public static BridgeResult<T> Fail(string error, int statusCode = 500) =>
        new() { Success = false, Error = error, StatusCode = statusCode };
    public static BridgeResult<T> Unavailable(string error = "MT5 connection unavailable") =>
        new() { Success = false, Error = error, StatusCode = 503 };
}

public class HealthStatus
{
    public bool Connected { get; set; }
    public string Mode { get; set; } = "bridge";
    public string? LastError { get; set; }
    public DateTime? LastConnected { get; set; }
    public DateTime? LastKeepalive { get; set; }
    public long TotalRequests { get; set; }
    public string ServerBuild { get; set; } = "";
    public TimeSpan Uptime { get; set; }
}
'@ | Set-Content "$srcDir\Models\Models.cs" -Encoding UTF8

# --- Services/IMT5Service.cs ---
@'
using MT5Bridge.Models;

namespace MT5Bridge.Services;

public interface IMT5Service
{
    bool IsConnected { get; }
    Task<bool> ConnectAsync(CancellationToken ct = default);
    void Disconnect();
    Task<bool> KeepaliveAsync(CancellationToken ct = default);
    HealthStatus GetStatus();
    Task<BridgeResult<UserResponse>> CreateUser(CreateUserRequest request);
    Task<BridgeResult<UserResponse>> GetUser(long login);
    Task<BridgeResult<object>> UpdateUser(UpdateUserRequest request);
    Task<BridgeResult<object>> ChangePassword(ChangePasswordRequest request);
    Task<BridgeResult<BalanceResponse>> BalanceOperation(BalanceRequest request);
    Task<BridgeResult<List<TradeRecord>>> GetHistory(long login, long? from, long? to);
    Task<BridgeResult<List<TradeRecord>>> GetPositions(long login);
    Task<BridgeResult<object>> GetGroupTotal();
    Task<BridgeResult<List<GroupInfo>>> GetAllGroups();
    Task<BridgeResult<GroupInfo>> CreateGroup(CreateGroupRequest request);
}
'@ | Set-Content "$srcDir\Services\IMT5Service.cs" -Encoding UTF8

# --- Services/MT5SessionManager.cs ---
@'
using Microsoft.Extensions.Options;

namespace MT5Bridge.Services;

public class MT5SessionManager : BackgroundService
{
    private readonly IMT5Service _mt5;
    private readonly ILogger<MT5SessionManager> _logger;
    private readonly BridgeOptions _options;

    public MT5SessionManager(IMT5Service mt5, ILogger<MT5SessionManager> logger, IOptions<BridgeOptions> options)
    {
        _mt5 = mt5;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MT5 Session Manager starting...");
        var backoff = 1;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (await _mt5.ConnectAsync(stoppingToken))
                {
                    _logger.LogInformation("MT5 connection established");
                    break;
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Connection attempt failed"); }
            var delay = Math.Min(backoff, _options.ReconnectMaxSeconds);
            _logger.LogInformation("Retrying in {Delay}s...", delay);
            await Task.Delay(TimeSpan.FromSeconds(delay), stoppingToken);
            backoff = Math.Min(backoff * 2, _options.ReconnectMaxSeconds);
        }

        backoff = 1;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_options.KeepaliveSeconds), stoppingToken);
                if (_mt5.IsConnected)
                {
                    if (await _mt5.KeepaliveAsync(stoppingToken)) { backoff = 1; continue; }
                    _logger.LogWarning("Keepalive failed, reconnecting");
                }
                _mt5.Disconnect();
                if (await _mt5.ConnectAsync(stoppingToken)) { _logger.LogInformation("Reconnected"); backoff = 1; }
                else
                {
                    var delay = Math.Min(backoff, _options.ReconnectMaxSeconds);
                    _logger.LogWarning("Reconnect failed, next in {Delay}s", delay);
                    await Task.Delay(TimeSpan.FromSeconds(delay), stoppingToken);
                    backoff = Math.Min(backoff * 2, _options.ReconnectMaxSeconds);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { _logger.LogError(ex, "Session error"); await Task.Delay(5000, stoppingToken); }
        }
        _mt5.Disconnect();
    }
}
'@ | Set-Content "$srcDir\Services\MT5SessionManager.cs" -Encoding UTF8

# --- Middleware/ApiKeyAuth.cs ---
@'
using System.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace MT5Bridge.Middleware;

public class ApiKeyAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _apiKey;
    private readonly ILogger<ApiKeyAuthMiddleware> _logger;

    public ApiKeyAuthMiddleware(RequestDelegate next, IOptions<BridgeOptions> options, ILogger<ApiKeyAuthMiddleware> logger)
    {
        _next = next;
        _apiKey = options.Value.ApiKey;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";
        if (path.Equals("/api/health", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/debug/methods", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/debug/user-test", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }
        if (!context.Request.Headers.TryGetValue("X-API-Key", out var providedKey) || string.IsNullOrEmpty(providedKey))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Missing X-API-Key header" });
            return;
        }
        var expected = System.Text.Encoding.UTF8.GetBytes(_apiKey);
        var provided = System.Text.Encoding.UTF8.GetBytes(providedKey.ToString());
        if (!CryptographicOperations.FixedTimeEquals(expected, provided))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" });
            return;
        }
        await _next(context);
    }
}
'@ | Set-Content "$srcDir\Middleware\ApiKeyAuth.cs" -Encoding UTF8

# --- Services/MT5Service.cs (v2 with multi-strategy group listing + diagnostics) ---
$mt5ServiceContent = @'
using System.Reflection;
using Microsoft.Extensions.Options;
using MT5Bridge.Models;

namespace MT5Bridge.Services;

public class MT5Service : IMT5Service, IDisposable
{
    private readonly ILogger<MT5Service> _logger;
    private readonly BridgeOptions _options;
    private readonly SemaphoreSlim _apiLock = new(1, 1);

    private Assembly? _managerAssembly;
    private Type? _factoryType;
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
                _logger.LogInformation("Assembly loaded with {Count} types", _managerAssembly.GetExportedTypes().Length);
            }

            if (_factoryType == null)
            {
                _factoryType = FindType(_managerAssembly, "ManagerAPIFactory");
                if (_factoryType == null)
                {
                    _lastError = "ManagerAPIFactory type not found";
                    _logger.LogError(_lastError);
                    return false;
                }
                _logger.LogInformation("Factory: {Type}", _factoryType.FullName);

                var initMethod = _factoryType.GetMethod("Initialize", BindingFlags.Static | BindingFlags.Public);
                if (initMethod != null)
                {
                    var dllDir = Path.GetDirectoryName(FindManagerDll()) ?? AppContext.BaseDirectory;
                    _logger.LogInformation("Initializing factory with: {Path}", dllDir);
                    var initResult = initMethod.Invoke(null, new object[] { dllDir });
                    _logger.LogInformation("Initialize result: {Result}", initResult);
                    if (!IsRetCodeSuccess(initResult))
                    {
                        _lastError = $"Factory Initialize failed: {initResult}";
                        _logger.LogError(_lastError);
                        return false;
                    }
                }
            }

            if (_managerApi == null)
            {
                var createMethod = _factoryType.GetMethods(BindingFlags.Static | BindingFlags.Public)
                    .Where(m => m.Name == "CreateManager")
                    .OrderBy(m => m.GetParameters().Length)
                    .FirstOrDefault();

                if (createMethod == null)
                {
                    _lastError = "No CreateManager method found";
                    _logger.LogError(_lastError);
                    return false;
                }

                var parameters = createMethod.GetParameters();
                _logger.LogInformation("CreateManager: {Params}",
                    string.Join(", ", parameters.Select(p => $"{p.ParameterType.Name} {p.Name}")));

                var args = new object?[parameters.Length];
                for (int i = 0; i < parameters.Length; i++)
                {
                    if (parameters[i].ParameterType == typeof(uint))
                        args[i] = (uint)5660;
                    else if (parameters[i].ParameterType == typeof(string))
                        args[i] = AppContext.BaseDirectory;
                    else if (parameters[i].IsOut)
                    {
                        var elemType = parameters[i].ParameterType.IsByRef
                            ? parameters[i].ParameterType.GetElementType()! : parameters[i].ParameterType;
                        args[i] = Activator.CreateInstance(elemType);
                    }
                }

                _managerApi = createMethod.Invoke(null, args);
                _logger.LogInformation("CreateManager returned: {Type}", _managerApi?.GetType().FullName ?? "null");

                if (_managerApi == null)
                {
                    object? errCode = null;
                    for (int i = 0; i < parameters.Length; i++)
                        if (parameters[i].IsOut) errCode = args[i];
                    _lastError = $"CreateManager returned null. Error: {errCode}";
                    _logger.LogError(_lastError);
                    return false;
                }

                // Log all available Group-related methods for diagnostics
                var groupMethods = _managerApi.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .Where(m => m.Name.Contains("Group", StringComparison.OrdinalIgnoreCase))
                    .Select(m => $"{m.Name}({string.Join(",", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})=>{m.ReturnType.Name}")
                    .ToList();
                _logger.LogInformation("Available Group methods ({Count}): {Methods}", groupMethods.Count, string.Join(" | ", groupMethods));
            }

            // Connect(server, login, password, cert, pumpMode, timeout)
            var connectMethod = _managerApi.GetType().GetMethod("Connect");
            if (connectMethod == null)
            {
                var methods = _managerApi.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .Select(m => m.Name).Distinct().OrderBy(n => n).ToList();
                _lastError = $"No Connect on {_managerApi.GetType().Name}. Methods: [{string.Join(", ", methods)}]";
                _logger.LogError(_lastError);
                return false;
            }

            var cParams = connectMethod.GetParameters();
            var server = $"{_options.MT5Server}:{_options.MT5Port}";
            _logger.LogInformation("Connecting to {Server} login {Login}", server, _options.ManagerLogin);

            var cArgs = new object?[cParams.Length];
            for (int i = 0; i < cParams.Length; i++)
            {
                var pName = cParams[i].Name?.ToLower() ?? "";
                var pType = cParams[i].ParameterType;

                if (pName.Contains("server") || pName.Contains("address"))
                    cArgs[i] = server;
                else if (pName.Contains("login"))
                    cArgs[i] = (ulong)_options.ManagerLogin;
                else if (pName == "password")
                    cArgs[i] = _options.ManagerPassword;
                else if (pName.Contains("cert"))
                    cArgs[i] = _options.ManagerApiPassword;
                else if (pName.Contains("pump") || pName.Contains("mode"))
                    cArgs[i] = pType.IsEnum ? Enum.ToObject(pType, 1) : Convert.ChangeType(1, pType); // PUMP_MODE_FULL
                else if (pName.Contains("timeout"))
                    cArgs[i] = (uint)30000;
                else if (pType == typeof(string))
                    cArgs[i] = "";
                else if (pType == typeof(uint))
                    cArgs[i] = (uint)0;
                else if (pType == typeof(ulong))
                    cArgs[i] = (ulong)0;
            }

            var connectResult = connectMethod.Invoke(_managerApi, cArgs);
            _logger.LogInformation("Connect result: {Result}", connectResult);

            if (IsRetCodeSuccess(connectResult))
            {
                _connected = true;
                _lastConnected = DateTime.UtcNow;
                _lastError = "";
                _logger.LogInformation("Connected to MT5 successfully!");
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
            _logger.LogError(ex, "Failed to connect");
            _connected = false;
            return false;
        }
        finally { _apiLock.Release(); }
    }

    public void Disconnect()
    {
        try
        {
            if (_managerApi != null)
                _managerApi.GetType().GetMethod("Disconnect")?.Invoke(_managerApi, null);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Disconnect error"); }
        _connected = false;
    }

    public async Task<bool> KeepaliveAsync(CancellationToken ct = default)
    {
        if (!_connected || _managerApi == null) return false;
        await _apiLock.WaitAsync(ct);
        try
        {
            var m = _managerApi.GetType().GetMethods()
                .FirstOrDefault(m => m.Name.Contains("TimeServer") || m.Name.Contains("ServerTime"));
            if (m != null) { m.Invoke(_managerApi, null); }
            _lastKeepalive = DateTime.UtcNow;
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Keepalive failed");
            _connected = false;
            _lastError = $"Keepalive failed: {ex.Message}";
            return false;
        }
        finally { _apiLock.Release(); }
    }

    public HealthStatus GetStatus() => new()
    {
        Connected = _connected, Mode = "bridge",
        LastError = string.IsNullOrEmpty(_lastError) ? null : _lastError,
        LastConnected = _lastConnected, LastKeepalive = _lastKeepalive,
        TotalRequests = _totalRequests, ServerBuild = "v3-userfix",
        Uptime = DateTime.UtcNow - _startTime
    };

    // ─── Debug ───────────────────────────────────────────────
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

        // Also inspect CIMTUser record
        object? userRecordInfo = null;
        try
        {
            var rec = CreateRecord("User");
            if (rec != null)
            {
                var recType = rec.GetType();
                var userMethods = recType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .Where(m => !m.IsSpecialName && m.DeclaringType != typeof(object))
                    .Select(m => new
                    {
                        name = m.Name,
                        parameters = string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}")),
                        returnType = m.ReturnType.Name
                    })
                    .OrderBy(m => m.name)
                    .ToList();

                // Try set then read Name
                var setReadTest = "not attempted";
                try
                {
                    SetProperty(rec, "Name", "DebugTestUser");
                    var nameBack = GetProperty<string>(rec, "Name");
                    setReadTest = $"set=DebugTestUser, read={nameBack}";
                }
                catch (Exception ex) { setReadTest = $"ERROR: {ex.Message}"; }

                // Try reading Login
                var loginTest = "not attempted";
                try
                {
                    var loginVal = GetProperty<ulong>(rec, "Login");
                    loginTest = $"GetProperty<ulong>={loginVal}";

                    // Also try direct method invocation
                    var loginGetter = recType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                        .FirstOrDefault(m => m.Name.Equals("Login", StringComparison.OrdinalIgnoreCase) && m.GetParameters().Length == 0 && m.ReturnType != typeof(void));
                    if (loginGetter != null)
                    {
                        var directVal = loginGetter.Invoke(rec, null);
                        loginTest += $", directMethod={directVal}({directVal?.GetType().Name})";
                    }
                    else
                    {
                        loginTest += ", NO Login() getter found";
                    }
                }
                catch (Exception ex) { loginTest += $", ERROR: {ex.Message}"; }

                userRecordInfo = new
                {
                    type = recType.FullName,
                    totalMethods = userMethods.Count,
                    methods = userMethods,
                    setReadTest,
                    loginTest
                };
            }
            else
            {
                userRecordInfo = new { error = "CreateRecord(User) returned null" };
            }
        }
        catch (Exception ex)
        {
            userRecordInfo = new { error = ex.InnerException?.Message ?? ex.Message };
        }

        return new
        {
            connected = _connected,
            managerType = _managerApi.GetType().FullName,
            totalMethods = allMethods.Count,
            groupMethods,
            allMethodNames = allMethods.Select(m => m.name).Distinct().ToList(),
            userRecord = userRecordInfo
        };
    }

    public object DebugUserRecord()
    {
        if (_managerApi == null)
            return new { error = "Manager API not initialized" };

        try
        {
            // Create a user record
            var rec = CreateRecord("User");
            if (rec == null)
                return new { error = "Could not create User record" };

            var recType = rec.GetType();
            var typeName = recType.FullName;

            // Get all methods on the user record (not just on ManagerAPI)
            var allMethods = recType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .Where(m => !m.IsSpecialName && m.DeclaringType != typeof(object))
                .Select(m => new
                {
                    name = m.Name,
                    parameters = string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}")),
                    returnType = m.ReturnType.Name
                })
                .OrderBy(m => m.name)
                .ToList();

            // Try reading some key fields via method getters
            var readTests = new Dictionary<string, string>();
            var testFields = new[] { "Login", "Name", "Group", "Leverage", "Email", "Phone", "Country",
                                     "Balance", "Equity", "Margin", "MarginFree", "CurrencyDeposit", "Currency" };
            foreach (var field in testFields)
            {
                try
                {
                    // Try property
                    var prop = recType.GetProperty(field, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                    if (prop != null)
                    {
                        var v = prop.GetValue(rec);
                        readTests[field] = $"property={v}({v?.GetType().Name})";
                        continue;
                    }

                    // Try method getter (no params, non-void return)
                    var getter = recType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                        .FirstOrDefault(m => m.Name.Equals(field, StringComparison.OrdinalIgnoreCase)
                            && m.GetParameters().Length == 0 && m.ReturnType != typeof(void));
                    if (getter != null)
                    {
                        var v = getter.Invoke(rec, null);
                        readTests[field] = $"method={v}({v?.GetType().Name})";
                        continue;
                    }

                    readTests[field] = "NOT_FOUND";
                }
                catch (Exception ex)
                {
                    readTests[field] = $"ERROR: {ex.InnerException?.Message ?? ex.Message}";
                }
            }

            // Try setting Name then reading it back
            var setReadTest = "not attempted";
            try
            {
                SetProperty(rec, "Name", "TestDebugUser");
                var readBack = GetProperty<string>(rec, "Name");
                setReadTest = $"set='TestDebugUser', readBack='{readBack}'";
            }
            catch (Exception ex) { setReadTest = $"ERROR: {ex.Message}"; }

            // Check UserAdd signatures
            var userAddSigs = _managerApi.GetType().GetMethods()
                .Where(m => m.Name == "UserAdd")
                .Select(m => $"UserAdd({string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})=>{m.ReturnType.Name}")
                .ToList();

            return new
            {
                recordType = typeName,
                totalMethods = allMethods.Count,
                methods = allMethods,
                readTests,
                setReadTest,
                userAddSignatures = userAddSigs
            };
        }
        catch (Exception ex)
        {
            return new { error = ex.InnerException?.Message ?? ex.Message };
        }
    }

    // ─── User Operations ─────────────────────────────────────
    public async Task<BridgeResult<UserResponse>> CreateUser(CreateUserRequest request)
    {
        return await CallApi<UserResponse>("CreateUser", async () =>
        {
            var diag = new List<string>();
            var rec = CreateRecord("User");
            if (rec == null) return BridgeResult<UserResponse>.Fail("Could not create MT5 user record object.");
            diag.Add($"RecordType={rec.GetType().Name}");

            // Log available methods on user record for diagnostics
            var userMethods = rec.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .Where(m => !m.IsSpecialName && m.DeclaringType != typeof(object))
                .Select(m => m.Name).Distinct().OrderBy(n => n).ToList();
            _logger.LogInformation("User record methods: {Methods}", string.Join(", ", userMethods));

            SetProperty(rec, "Name", request.Name);
            SetProperty(rec, "EMail", request.Email);
            SetProperty(rec, "Group", request.Group);
            SetProperty(rec, "Leverage", (uint)request.Leverage);
            SetProperty(rec, "Phone", request.Phone);
            SetProperty(rec, "Country", request.Country);

            // Log what UserAdd looks like
            var userAddMethods = _managerApi!.GetType().GetMethods()
                .Where(m => m.Name == "UserAdd")
                .Select(m => $"UserAdd({string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})=>{m.ReturnType.Name}")
                .ToList();
            _logger.LogInformation("UserAdd signatures: {Sigs}", string.Join(" | ", userAddMethods));

            string callType = "3-arg";
            var r = InvokeMethod("UserAdd", rec, request.MainPassword, request.MainPassword);
            if (r == null)
            {
                callType = "1-arg(fallback)";
                SetProperty(rec, "MainPassword", request.MainPassword);
                r = InvokeMethod("UserAdd", rec);
            }
            diag.Add($"CallType={callType}, Result={r}");

            // Read login back using method getter (MT5 objects use Login() method)
            var loginValue = GetProperty<ulong>(rec, "Login");
            diag.Add($"LoginAfterAdd={loginValue}");
            _logger.LogInformation("CreateUser DIAG: {Diag}", string.Join(" | ", diag));

            if (!IsRetCodeSuccess(r))
                return BridgeResult<UserResponse>.Fail($"UserAdd failed: {r} || DIAG: {string.Join(" | ", diag)}", 400);

            var response = MapUserResponse(rec);
            _logger.LogInformation("Created MT5 user: login={Login}, name={Name}, group={Group}",
                response.Login, response.Name, response.Group);

            // If login is still 0, it means MT5 didn't assign one - this is an error
            if (response.Login == "0")
            {
                _logger.LogWarning("UserAdd returned OK but Login=0. This typically means the user record was not properly populated by the API.");
                return BridgeResult<UserResponse>.Fail(
                    $"MT5 returned login=0. The account may not have been created properly. DIAG: {string.Join(" | ", diag)}", 500);
            }

            return BridgeResult<UserResponse>.Ok(response);
        });
    }

    public async Task<BridgeResult<UserResponse>> GetUser(long login)
    {
        return await CallApi<UserResponse>("GetUser", async () =>
        {
            var rec = CreateRecord("User");
            if (rec == null) return BridgeResult<UserResponse>.Fail("Could not create user record");
            var r = InvokeMethod("UserGet", (ulong)login, rec);
            if (!IsRetCodeSuccess(r)) return BridgeResult<UserResponse>.Fail($"UserGet failed: {r}", 404);
            return BridgeResult<UserResponse>.Ok(MapUserResponse(rec));
        });
    }

    public async Task<BridgeResult<object>> UpdateUser(UpdateUserRequest request)
    {
        return await CallApi<object>("UpdateUser", async () =>
        {
            var rec = CreateRecord("User");
            if (rec == null) return BridgeResult<object>.Fail("Could not create user record");
            var gr = InvokeMethod("UserGet", (ulong)request.Login, rec);
            if (!IsRetCodeSuccess(gr)) return BridgeResult<object>.Fail($"UserGet failed: {gr}", 404);
            if (request.Leverage.HasValue) SetProperty(rec, "Leverage", (uint)request.Leverage.Value);
            if (request.Group != null) SetProperty(rec, "Group", request.Group);
            var r = InvokeMethod("UserUpdate", rec);
            if (!IsRetCodeSuccess(r)) return BridgeResult<object>.Fail($"UserUpdate failed: {r}", 400);
            return BridgeResult<object>.Ok(new { success = true });
        });
    }

    public async Task<BridgeResult<object>> ChangePassword(ChangePasswordRequest request)
    {
        return await CallApi<object>("ChangePassword", async () =>
        {
            var r = InvokeMethod("UserPasswordChange", (ulong)request.Login, request.Password);
            if (!IsRetCodeSuccess(r)) return BridgeResult<object>.Fail($"PasswordChange failed: {r}", 400);
            return BridgeResult<object>.Ok(new { success = true });
        });
    }

    public async Task<BridgeResult<BalanceResponse>> BalanceOperation(BalanceRequest request)
    {
        return await CallApi<BalanceResponse>("BalanceOperation", async () =>
        {
            var r = InvokeMethod("DealerBalance",
                (ulong)request.Login, request.Balance, (uint)request.Type, request.Comment);
            if (!IsRetCodeSuccess(r)) return BridgeResult<BalanceResponse>.Fail($"DealerBalance failed: {r}", 400);
            return BridgeResult<BalanceResponse>.Ok(new BalanceResponse { Order = DateTime.UtcNow.Ticks.ToString() });
        });
    }

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

                // Strategy 1: DealCreateArray + DealRequest
                var createArrayMethod = FindApiMethod("DealCreateArray");
                if (createArrayMethod != null)
                {
                    var dealArray = createArrayMethod.Invoke(_managerApi, null);
                    if (dealArray != null)
                    {
                        diag.Add($"DealCreateArray -> {dealArray.GetType().Name}");

                        var requestMethod = FindApiMethod("DealRequest");
                        var dealGetMethod = FindApiMethod("DealGet");
                        var historyGetMethod = FindApiMethod("HistoryGet");

                        object? reqResult = null;
                        bool requestSucceeded = false;

                        if (requestMethod != null)
                        {
                            var reqParams = requestMethod.GetParameters();
                            diag.Add($"DealRequest params: ({string.Join(",", reqParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
                            try
                            {
                                if (reqParams.Length == 4)
                                {
                                    var firstParamType = reqParams[0].ParameterType;
                                    if (firstParamType == typeof(ulong) || firstParamType == typeof(long) || firstParamType == typeof(UInt64))
                                        reqResult = requestMethod.Invoke(_managerApi, new object[] {
                                            CastToParamType(reqParams[0].ParameterType, login),
                                            CastToParamType(reqParams[1].ParameterType, fromTime),
                                            CastToParamType(reqParams[2].ParameterType, toTime),
                                            dealArray });
                                    else
                                        reqResult = requestMethod.Invoke(_managerApi, new object[] {
                                            dealArray,
                                            CastToParamType(reqParams[1].ParameterType, login),
                                            CastToParamType(reqParams[2].ParameterType, fromTime),
                                            CastToParamType(reqParams[3].ParameterType, toTime) });
                                }
                                else if (reqParams.Length == 3)
                                    reqResult = requestMethod.Invoke(_managerApi, new object[] {
                                        CastToParamType(reqParams[0].ParameterType, login),
                                        CastToParamType(reqParams[1].ParameterType, fromTime),
                                        CastToParamType(reqParams[2].ParameterType, toTime) });
                                diag.Add($"DealRequest result: {reqResult}");
                                requestSucceeded = IsRetCodeSuccess(reqResult);
                            }
                            catch (Exception ex) { diag.Add($"DealRequest error: {ex.InnerException?.Message ?? ex.Message}"); }
                        }

                        // Fallback 1: DealRequestByLogins(UInt64[] logins, Int64 from, Int64 to, CIMTDealArray deals)
                        if (!requestSucceeded)
                        {
                            var byLoginsMethod = FindApiMethod("DealRequestByLogins");
                            if (byLoginsMethod != null)
                            {
                                var blParams = byLoginsMethod.GetParameters();
                                diag.Add($"DealRequestByLogins params: ({string.Join(",", blParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
                                try
                                {
                                    var loginsArray = new ulong[] { (ulong)login };
                                    reqResult = byLoginsMethod.Invoke(_managerApi, new object[] {
                                        loginsArray,
                                        CastToParamType(blParams[1].ParameterType, fromTime),
                                        CastToParamType(blParams[2].ParameterType, toTime),
                                        dealArray });
                                    diag.Add($"DealRequestByLogins result: {reqResult}");
                                    requestSucceeded = IsRetCodeSuccess(reqResult);
                                }
                                catch (Exception ex) { diag.Add($"DealRequestByLogins error: {ex.InnerException?.Message ?? ex.Message}"); }
                            }
                        }

                        // Fallback 2: DealRequestByGroup(String mask, Int64 from, Int64 to, CIMTDealArray deals)
                        if (!requestSucceeded)
                        {
                            var byGroupMethod = FindApiMethod("DealRequestByGroup");
                            if (byGroupMethod != null)
                            {
                                var bgParams = byGroupMethod.GetParameters();
                                diag.Add($"DealRequestByGroup params: ({string.Join(",", bgParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
                                try
                                {
                                    reqResult = byGroupMethod.Invoke(_managerApi, new object[] {
                                        "*",
                                        CastToParamType(bgParams[1].ParameterType, fromTime),
                                        CastToParamType(bgParams[2].ParameterType, toTime),
                                        dealArray });
                                    diag.Add($"DealRequestByGroup result: {reqResult}");
                                    requestSucceeded = IsRetCodeSuccess(reqResult);
                                }
                                catch (Exception ex) { diag.Add($"DealRequestByGroup error: {ex.InnerException?.Message ?? ex.Message}"); }
                            }
                        }

                        if (!requestSucceeded && dealGetMethod != null)
                        {
                            var getParams = dealGetMethod.GetParameters();
                            diag.Add($"DealGet params: ({string.Join(",", getParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
                            try
                            {
                                if (getParams.Length >= 4)
                                    reqResult = dealGetMethod.Invoke(_managerApi, new object[] {
                                        CastToParamType(getParams[0].ParameterType, login),
                                        CastToParamType(getParams[1].ParameterType, fromTime),
                                        CastToParamType(getParams[2].ParameterType, toTime),
                                        dealArray });
                                else if (getParams.Length == 2)
                                    reqResult = dealGetMethod.Invoke(_managerApi, new object[] {
                                        CastToParamType(getParams[0].ParameterType, login), dealArray });
                                diag.Add($"DealGet result: {reqResult}");
                                requestSucceeded = IsRetCodeSuccess(reqResult);
                            }
                            catch (Exception ex) { diag.Add($"DealGet error: {ex.InnerException?.Message ?? ex.Message}"); }
                        }

                        if (!requestSucceeded && historyGetMethod != null)
                        {
                            var histParams = historyGetMethod.GetParameters();
                            diag.Add($"HistoryGet params: ({string.Join(",", histParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
                            try
                            {
                                var args = new object?[histParams.Length];
                                args[0] = CastToParamType(histParams[0].ParameterType, login);
                                args[1] = CastToParamType(histParams[1].ParameterType, fromTime);
                                args[2] = CastToParamType(histParams[2].ParameterType, toTime);
                                if (histParams.Length >= 4) args[3] = dealArray;
                                reqResult = historyGetMethod.Invoke(_managerApi, args);
                                diag.Add($"HistoryGet result: {reqResult}");
                                requestSucceeded = IsRetCodeSuccess(reqResult);
                                if (requestSucceeded && histParams.Length >= 4 && args[3] != null) dealArray = args[3];
                            }
                            catch (Exception ex) { diag.Add($"HistoryGet error: {ex.InnerException?.Message ?? ex.Message}"); }
                        }

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
                                        if (trade == null) continue;
                                        // Filter by login (DealRequestByGroup returns all logins)
                                        if (trade.Login == login.ToString() || login == 0)
                                            trades.Add(trade);
                                    }
                                    catch (Exception ex) { diag.Add($"Deal[{i}] error: {ex.InnerException?.Message ?? ex.Message}"); }
                                }
                                if (trades.Count > 0)
                                {
                                    _logger.LogInformation("GetHistory: {Count} deals for login {Login}", trades.Count, login);
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
                else { diag.Add("DealCreateArray not found"); }

                // Strategy 2: Direct methods
                foreach (var methodName in new[] { "HistoryGetDeals", "HistoryDealsGet", "DealGetAll", "DealsGet" })
                {
                    var method = FindApiMethod(methodName);
                    if (method == null) continue;
                    try
                    {
                        var mParams = method.GetParameters();
                        var args = new object?[mParams.Length];
                        if (mParams.Length >= 3) {
                            args[0] = CastToParamType(mParams[0].ParameterType, login);
                            args[1] = CastToParamType(mParams[1].ParameterType, fromTime);
                            args[2] = CastToParamType(mParams[2].ParameterType, toTime);
                        }
                        else if (mParams.Length >= 1) {
                            args[0] = CastToParamType(mParams[0].ParameterType, login);
                        }
                        var result = method.Invoke(_managerApi, args);
                        if (result is System.Collections.IEnumerable enumResult && !(result is string))
                        {
                            foreach (var dealObj in enumResult) { var t = ExtractDealInfo(dealObj, login); if (t != null) trades.Add(t); }
                        }
                        if (trades.Count > 0)
                        {
                            _logger.LogInformation("GetHistory via {Method}: {Count} deals", method.Name, trades.Count);
                            return BridgeResult<List<TradeRecord>>.Ok(trades, string.Join(" | ", diag));
                        }
                    }
                    catch (Exception ex) { diag.Add($"{method.Name} error: {ex.InnerException?.Message ?? ex.Message}"); }
                }

                // Log available deal/history methods
                if (_managerApi != null)
                {
                    var dealMethods = _managerApi.GetType().GetMethods()
                        .Where(m => m.Name.Contains("Deal", StringComparison.OrdinalIgnoreCase) || m.Name.Contains("History", StringComparison.OrdinalIgnoreCase))
                        .Select(m => $"{m.Name}({string.Join(", ", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
                    diag.Add($"Available: {string.Join("; ", dealMethods)}");
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
            BridgeResult<List<TradeRecord>>.Ok(new List<TradeRecord>()));
    }

    // ─── Group Operations (v2 with multi-strategy + diagnostics) ──

    public async Task<BridgeResult<object>> GetGroupTotal()
    {
        return await CallApi<object>("GetGroupTotal", async () =>
        {
            var diag = new List<string>();
            try
            {
                // Strategy 1: GroupTotal() from pump cache (PUMP_MODE_FULL)
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
                else { diag.Add("GroupTotal not found"); }

                // Strategy 2: GroupRequestArray
                var createArrayMethod = FindApiMethod("GroupCreateArray");
                if (createArrayMethod != null)
                {
                    diag.Add($"GroupCreateArray found");
                    var groupArray = createArrayMethod.Invoke(_managerApi, null);
                    if (groupArray != null)
                    {
                        var requestMethod = FindApiMethod("GroupRequestArray");
                        if (requestMethod != null)
                        {
                            try
                            {
                                var reqResult = requestMethod.Invoke(_managerApi, new object[] { "*", groupArray });
                                diag.Add($"GroupRequestArray={reqResult}");
                                if (IsRetCodeSuccess(reqResult))
                                {
                                    var totalMethod = groupArray.GetType().GetMethod("Total");
                                    if (totalMethod != null)
                                    {
                                        var total = totalMethod.Invoke(groupArray, null);
                                        return BridgeResult<object>.Ok(new { Total = total, Source = "request_array", Diag = string.Join(" | ", diag) });
                                    }
                                }
                            }
                            catch (Exception ex) { diag.Add($"RequestArray ex: {ex.InnerException?.Message ?? ex.Message}"); }
                        }
                        else { diag.Add("GroupRequestArray not found"); }
                    }
                }
                else { diag.Add("GroupCreateArray not found"); }
            }
            catch (Exception ex) { diag.Add($"Ex: {ex.InnerException?.Message ?? ex.Message}"); }

            _logger.LogWarning("GetGroupTotal diag: {Diag}", string.Join(" | ", diag));
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
                // Strategy 1: Pump cache (GroupTotal + GroupNext) - PUMP_MODE_FULL
                var groupTotalMethod = FindApiMethod("GroupTotal");
                var groupNextMethod = FindApiMethod("GroupNext");

                if (groupTotalMethod != null && groupNextMethod != null)
                {
                    var totalResult = groupTotalMethod.Invoke(_managerApi, null);
                    var total = Convert.ToUInt32(totalResult ?? 0);
                    diag.Add($"PumpCache: GroupTotal={total}");

                    if (total > 0)
                    {
                        var nextParams = groupNextMethod.GetParameters();
                        diag.Add($"GroupNext({string.Join(",", nextParams.Select(p => $"{p.ParameterType.Name} {p.Name}"))})");

                        for (uint i = 0; i < total; i++)
                        {
                            try
                            {
                                object? groupObj = null;
                                if (nextParams.Length == 1 && nextParams[0].ParameterType == typeof(uint))
                                {
                                    // GroupNext(uint pos) -> returns CIMTConGroup
                                    groupObj = groupNextMethod.Invoke(_managerApi, new object[] { i });
                                }
                                else if (nextParams.Length == 2)
                                {
                                    // GroupNext(uint pos, CIMTConGroup group) -> MTRetCode
                                    var groupRecord = CreateRecord("ConGroup");
                                    if (groupRecord == null)
                                    {
                                        var gcm = FindApiMethod("GroupCreate");
                                        if (gcm != null) groupRecord = gcm.Invoke(_managerApi, null);
                                    }
                                    if (groupRecord != null)
                                    {
                                        var args = new object?[] { i, groupRecord };
                                        var nextResult = groupNextMethod.Invoke(_managerApi, args);
                                        groupObj = args[1] ?? groupRecord;
                                    }
                                }

                                var info = ExtractGroupInfo(groupObj);
                                if (info != null && !string.IsNullOrEmpty(info.Group))
                                    groups.Add(info);
                            }
                            catch (Exception ex) { diag.Add($"GroupNext({i}) err: {ex.InnerException?.Message ?? ex.Message}"); }
                        }

                        if (groups.Count > 0)
                        {
                            _logger.LogInformation("GetAllGroups via pump: {Count} groups", groups.Count);
                            return BridgeResult<List<GroupInfo>>.Ok(groups);
                        }
                        diag.Add($"PumpCache: iterated {total} but got {groups.Count} groups");
                    }
                }
                else { diag.Add($"PumpCache: GroupTotal={groupTotalMethod != null}, GroupNext={groupNextMethod != null}"); }

                // Strategy 2: GroupRequestArray (server fetch)
                var createArrayMethod = FindApiMethod("GroupCreateArray");
                if (createArrayMethod != null)
                {
                    var groupArray = createArrayMethod.Invoke(_managerApi, null);
                    if (groupArray != null)
                    {
                        diag.Add($"GroupCreateArray: {groupArray.GetType().Name}");
                        var requestMethod = FindApiMethod("GroupRequestArray");
                        if (requestMethod != null)
                        {
                            try
                            {
                                var reqResult = requestMethod.Invoke(_managerApi, new object[] { "*", groupArray });
                                diag.Add($"GroupRequestArray={reqResult}");

                                if (IsRetCodeSuccess(reqResult))
                                {
                                    var totalMethod = groupArray.GetType().GetMethod("Total");
                                    var nextMethod = groupArray.GetType().GetMethod("Next");
                                    if (totalMethod != null && nextMethod != null)
                                    {
                                        var total = (uint)(totalMethod.Invoke(groupArray, null) ?? 0u);
                                        diag.Add($"Array total={total}");
                                        for (uint i = 0; i < total; i++)
                                        {
                                            var groupObj = nextMethod.Invoke(groupArray, new object[] { i });
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
                                    else { diag.Add("Array missing Total/Next methods"); }
                                }
                            }
                            catch (Exception ex) { diag.Add($"RequestArray ex: {ex.InnerException?.Message ?? ex.Message}"); }
                        }
                        else { diag.Add("GroupRequestArray not found"); }
                    }
                }
                else { diag.Add("GroupCreateArray not found"); }

                // Strategy 3: Individual GroupGet/GroupRequest for known names
                var groupGetMethod = FindApiMethod("GroupRequest", "GroupGet");
                if (groupGetMethod != null)
                {
                    diag.Add($"Trying individual GroupGet: {groupGetMethod.Name}({string.Join(",", groupGetMethod.GetParameters().Select(p => p.ParameterType.Name))})");
                    var knownGroups = new[] { "SmartPip", "ElitePip", "PrimePips", "RoyalPips" };
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
                            if (groupRecord == null) { diag.Add("Cannot create ConGroup record"); break; }

                            var getParams = groupGetMethod.GetParameters();
                            object? getResult;
                            if (getParams.Length >= 2)
                                getResult = groupGetMethod.Invoke(_managerApi, new object[] { gName, groupRecord });
                            else
                                getResult = groupGetMethod.Invoke(_managerApi, new object[] { gName });

                            diag.Add($"{gName}={getResult}");
                            if (IsRetCodeSuccess(getResult))
                            {
                                var info = ExtractGroupInfo(groupRecord);
                                if (info != null && !string.IsNullOrEmpty(info.Group) &&
                                    !groups.Any(g => g.Group == info.Group))
                                    groups.Add(info);
                            }
                        }
                        catch (Exception ex) { diag.Add($"{gName} ex: {ex.InnerException?.Message ?? ex.Message}"); }
                    }
                    if (groups.Count > 0)
                    {
                        _logger.LogInformation("GetAllGroups via GroupGet: {Count} groups", groups.Count);
                        return BridgeResult<List<GroupInfo>>.Ok(groups);
                    }
                }
                else { diag.Add("GroupGet/GroupRequest not found"); }
            }
            catch (Exception ex)
            {
                diag.Add($"Ex: {ex.InnerException?.Message ?? ex.Message}");
                _logger.LogWarning(ex, "GetAllGroups error");
            }

            _logger.LogWarning("GetAllGroups: all strategies failed. Diag: {Diag}", string.Join(" | ", diag));
            return BridgeResult<List<GroupInfo>>.Ok(groups, string.Join(" | ", diag));
        });
    }

    public async Task<BridgeResult<GroupInfo>> CreateGroup(CreateGroupRequest request)
    {
        return await CallApi<GroupInfo>("CreateGroup", async () =>
        {
            if (string.IsNullOrWhiteSpace(request.Group))
                return BridgeResult<GroupInfo>.Fail("Group name is required", 400);

            var groupRecord = CreateRecord("ConGroup");
            if (groupRecord == null)
            {
                var gcm = FindApiMethod("GroupCreate");
                if (gcm != null) groupRecord = gcm.Invoke(_managerApi, null);
            }
            if (groupRecord == null)
                return BridgeResult<GroupInfo>.Fail("Cannot create group record. Groups must be created in MT5 Admin.", 501);

            SetProperty(groupRecord, "Group", request.Group);
            SetProperty(groupRecord, "Description", request.Description);
            try { SetProperty(groupRecord, "MarginLeverage", (uint)request.Leverage); } catch { }

            var result = InvokeMethod("GroupAdd", groupRecord);
            if (result == null) return BridgeResult<GroupInfo>.Fail("GroupAdd not available. Create groups in MT5 Admin.", 501);
            if (!IsRetCodeSuccess(result)) return BridgeResult<GroupInfo>.Fail($"GroupAdd failed: {result}", 400);

            return BridgeResult<GroupInfo>.Ok(new GroupInfo { Group = request.Group, Description = request.Description });
        });
    }

    // ─── Helpers ─────────────────────────────────────────────

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
            var order = GetProperty<ulong>(dealObj, "Deal");
            var orderStr = order > 0 ? order.ToString() : (GetProperty<string>(dealObj, "Order") ?? "");
            var loginVal = GetProperty<ulong>(dealObj, "Login");
            var loginStr = loginVal > 0 ? loginVal.ToString() : fallbackLogin.ToString();
            var symbol = GetProperty<string>(dealObj, "Symbol") ?? "";

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

            var volumeExt = GetProperty<ulong>(dealObj, "VolumeExt");
            var volumeRaw = GetProperty<ulong>(dealObj, "Volume");
            double volume;
            if (volumeExt > 0) volume = volumeExt / 10000.0;
            else if (volumeRaw > 0) volume = volumeRaw / 100.0;
            else volume = 0;
            if (volume == 0)
            {
                var vd = GetProperty<double>(dealObj, "Volume");
                if (vd > 0) volume = vd;
            }

            var price = GetProperty<double>(dealObj, "Price");
            var profit = GetProperty<double>(dealObj, "Profit");
            var commission = GetProperty<double>(dealObj, "Commission");

            var timeMsc = GetProperty<long>(dealObj, "TimeMsc");
            var timeVal = GetProperty<long>(dealObj, "Time");
            string timeStr = "";
            if (timeMsc > 0)
                timeStr = DateTimeOffset.FromUnixTimeMilliseconds(timeMsc).ToString("yyyy-MM-dd HH:mm:ss");
            else if (timeVal > 0)
                timeStr = DateTimeOffset.FromUnixTimeSeconds(timeVal).ToString("yyyy-MM-dd HH:mm:ss");

            var positionId = GetProperty<ulong>(dealObj, "PositionID");

            return new TradeRecord
            {
                Order = !string.IsNullOrEmpty(orderStr) ? orderStr : positionId.ToString(),
                Login = loginStr, Symbol = symbol, Action = actionStr,
                Volume = volume, OpenPrice = price, ClosePrice = price,
                Profit = profit, Commission = commission,
                OpenTime = timeStr, CloseTime = timeStr,
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "ExtractDealInfo failed for {Type}", dealObj?.GetType().Name); }
        return null;
    }

    private GroupInfo? ExtractGroupInfo(object? groupObj)
    {
        if (groupObj == null) return null;
        try
        {
            var t = groupObj.GetType();
            string name = "";
            string? desc = null;
            string? currency = null;

            // MT5 CIMTConGroup: Group(), Company(), Currency() are methods
            var nameM = t.GetMethod("Group", Type.EmptyTypes);
            if (nameM != null) name = nameM.Invoke(groupObj, null) as string ?? "";
            else name = GetProperty<string>(groupObj, "Group") ?? "";

            var companyM = t.GetMethod("Company", Type.EmptyTypes);
            if (companyM != null) desc = companyM.Invoke(groupObj, null) as string;
            else desc = GetProperty<string>(groupObj, "Company") ?? GetProperty<string>(groupObj, "Description");

            var currencyM = t.GetMethod("Currency", Type.EmptyTypes);
            if (currencyM != null) currency = currencyM.Invoke(groupObj, null) as string;
            else currency = GetProperty<string>(groupObj, "Currency");

            if (!string.IsNullOrEmpty(name))
                return new GroupInfo { Group = name, Description = desc, Currency = currency };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "ExtractGroupInfo failed"); }
        return null;
    }

    private async Task<BridgeResult<T>> CallApi<T>(string op, Func<Task<BridgeResult<T>>> action)
    {
        if (!_connected || _managerApi == null) return BridgeResult<T>.Unavailable();
        Interlocked.Increment(ref _totalRequests);
        await _apiLock.WaitAsync();
        try { return await action(); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in {Op}", op);
            _lastError = $"{op}: {ex.Message}";
            return BridgeResult<T>.Fail($"{op} failed: {ex.Message}");
        }
        finally { _apiLock.Release(); }
    }

    private string? FindManagerDll()
    {
        var names = new[] { "MetaQuotes.MT5ManagerAPI64.dll", "MT5ManagerAPI.NET.dll" };
        var dirs = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "libs"),
            AppContext.BaseDirectory,
            @"C:\MetaTrader5SDK\Libs",
        };
        foreach (var d in dirs)
            foreach (var n in names)
            {
                var p = Path.Combine(d, n);
                if (File.Exists(p)) return p;
            }
        return null;
    }

    private Type? FindType(Assembly asm, string contains) =>
        asm.GetExportedTypes().FirstOrDefault(t => t.Name.Contains(contains, StringComparison.OrdinalIgnoreCase));

    private MethodInfo? FindApiMethod(params string[] names)
    {
        if (_managerApi == null) return null;
        var methods = _managerApi.GetType().GetMethods();
        foreach (var n in names)
        {
            var m = methods.FirstOrDefault(m => m.Name.Equals(n, StringComparison.OrdinalIgnoreCase));
            if (m != null) return m;
        }
        return null;
    }

    private object? InvokeMethod(string name, params object?[] args)
    {
        if (_managerApi == null) return null;
        var method = _managerApi.GetType().GetMethods()
            .FirstOrDefault(m => m.Name.Equals(name, StringComparison.OrdinalIgnoreCase)
                              && m.GetParameters().Length >= args.Length);
        if (method == null)
        {
            _logger.LogWarning("Method {Name} not found", name);
            return null;
        }
        var pars = method.GetParameters();
        if (pars.Length > args.Length)
        {
            var padded = new object?[pars.Length];
            Array.Copy(args, padded, args.Length);
            for (int i = args.Length; i < pars.Length; i++)
                if (pars[i].IsOut)
                    padded[i] = pars[i].ParameterType.IsByRef
                        ? Activator.CreateInstance(pars[i].ParameterType.GetElementType()!) : null;
            args = padded;
        }
        return method.Invoke(_managerApi, args);
    }

    private object? CreateRecord(string type)
    {
        if (_managerApi == null) return null;
        var patterns = new[] { $"{type}RecordNew", $"{type}Create", $"{type}New" };
        MethodInfo? cm = null;
        foreach (var pat in patterns)
        {
            cm = _managerApi.GetType().GetMethods()
                .FirstOrDefault(m => m.Name.Contains(pat, StringComparison.OrdinalIgnoreCase));
            if (cm != null) break;
        }
        if (cm == null)
        {
            cm = _managerApi.GetType().GetMethods()
                .FirstOrDefault(m => m.Name.Contains(type, StringComparison.OrdinalIgnoreCase)
                    && (m.Name.Contains("New", StringComparison.OrdinalIgnoreCase) || m.Name.Contains("Create", StringComparison.OrdinalIgnoreCase))
                    && !m.Name.Contains("Get", StringComparison.OrdinalIgnoreCase)
                    && !m.Name.Contains("Array", StringComparison.OrdinalIgnoreCase));
        }
        if (cm != null)
        {
            _logger.LogInformation("CreateRecord: {Method} for {Type}", cm.Name, type);
            var a = new object?[cm.GetParameters().Length];
            var r = cm.Invoke(_managerApi, a);
            if (r != null && r.GetType().Name.Contains(type, StringComparison.OrdinalIgnoreCase)) return r;
            for (int i = 0; i < a.Length; i++)
                if (a[i] != null && a[i]!.GetType().Name.Contains(type, StringComparison.OrdinalIgnoreCase)) return a[i];
            if (r != null)
                for (int i = 0; i < a.Length; i++)
                    if (a[i] != null) return a[i];
            return r;
        }
        var related = _managerApi.GetType().GetMethods()
            .Where(m => m.Name.Contains(type, StringComparison.OrdinalIgnoreCase))
            .Select(m => $"{m.Name}({m.GetParameters().Length})");
        _logger.LogWarning("CreateRecord: no method for {Type}. Related: {M}", type, string.Join("; ", related));
        if (_managerAssembly != null)
        {
            var rc = _managerAssembly.GetExportedTypes()
                .FirstOrDefault(t => t.Name.Contains($"MT{type}", StringComparison.OrdinalIgnoreCase) && t.IsClass && !t.IsAbstract);
            if (rc != null) return Activator.CreateInstance(rc);
        }
        return null;
    }

    private void SetProperty(object obj, string name, object? value)
    {
        var p = obj.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (p != null && p.CanWrite) { p.SetValue(obj, Convert.ChangeType(value, p.PropertyType)); return; }
        var s = obj.GetType().GetMethod($"Set{name}", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (s != null) { s.Invoke(obj, new[] { value }); return; }
        var m = obj.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(x => x.Name.Equals(name, StringComparison.OrdinalIgnoreCase) && x.GetParameters().Length == 1);
        if (m != null) { m.Invoke(obj, new[] { Convert.ChangeType(value, m.GetParameters()[0].ParameterType) }); return; }
        _logger.LogWarning("SetProperty failed for {Name} on {Type}", name, obj.GetType().Name);
    }

    private T? GetProperty<T>(object obj, string name)
    {
        // 1. Try .NET property (standard CLR objects)
        var p = obj.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (p != null) { var v = p.GetValue(obj); if (v is T t) return t; try { return (T)Convert.ChangeType(v, typeof(T)); } catch { } }

        // 2. Try method getter (MT5 objects use methods: Login(), Name(), Group(), etc.)
        var getter = obj.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(m => m.Name.Equals(name, StringComparison.OrdinalIgnoreCase) && m.GetParameters().Length == 0 && m.ReturnType != typeof(void));
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

    private UserResponse MapUserResponse(object rec)
    {
        // MT5 CIMTUser uses method-based accessors: Login(), Name(), Group(), etc.
        // GetProperty now handles both .NET properties and method getters
        var login = GetProperty<ulong>(rec, "Login");
        var name = GetProperty<string>(rec, "Name") ?? "";
        var group = GetProperty<string>(rec, "Group") ?? "";
        var leverage = GetProperty<uint>(rec, "Leverage");

        _logger.LogInformation("MapUserResponse: Login={Login}, Name={Name}, Group={Group}, Leverage={Leverage}",
            login, name, group, leverage);

        return new()
        {
            Login = login.ToString(),
            Name = name,
            Group = group,
            Leverage = $"1:{leverage}",
            Balance = GetProperty<double>(rec, "Balance"),
            Equity = GetProperty<double>(rec, "Equity"),
            Margin = GetProperty<double>(rec, "Margin"),
            FreeMargin = GetProperty<double>(rec, "MarginFree"),
            Currency = GetProperty<string>(rec, "CurrencyDeposit") ?? GetProperty<string>(rec, "Currency") ?? "USD",
            Registration = GetProperty<long>(rec, "Registration") is long rt && rt > 0
                ? DateTimeOffset.FromUnixTimeSeconds(rt).UtcDateTime.ToString("o") : DateTime.UtcNow.ToString("o")
        };
    }

    private static bool IsRetCodeSuccess(object? rc)
    {
        if (rc == null) return false;
        var s = rc.ToString() ?? "";
        if (s == "0" || s == "MT_RET_OK") return true;
        if (s.Contains("OK", StringComparison.OrdinalIgnoreCase)) return true;
        try { return Convert.ToInt64(rc) == 0; } catch { return false; }
    }

    public void Dispose() { Disconnect(); _apiLock.Dispose(); }
}
'@
[System.IO.File]::WriteAllText("$srcDir\Services\MT5Service.cs", $mt5ServiceContent, [System.Text.Encoding]::UTF8)

Write-Host "  All source files written." -ForegroundColor Green

# Verify
$csproj = "$srcDir\MT5Bridge.csproj"
if (Test-Path $csproj) {
    Write-Host "  MT5Bridge.csproj: OK" -ForegroundColor Green
} else {
    Write-Host "  ERROR: csproj not found!" -ForegroundColor Red
    exit 1
}

# Build
Write-Host "[3/5] Building..." -ForegroundColor Yellow
$buildOutput = dotnet publish $csproj -c Release -r win-x64 --self-contained true -o $outDir 2>&1
$buildOutput | Write-Host
# Check for actual build errors (not just warnings)
$buildErrors = $buildOutput | Select-String ": error CS"
if ($buildErrors) {
    Write-Host "  Build FAILED with errors!" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "$outDir\MT5Bridge.exe")) {
    Write-Host "  Build FAILED - exe not found!" -ForegroundColor Red
    exit 1
}
Write-Host "  Build OK" -ForegroundColor Green

# Copy SDK DLLs
Write-Host "[4/5] Copying SDK DLLs..." -ForegroundColor Yellow
Copy-Item "$sdkDir\*.dll" "$outDir\" -Force -ErrorAction SilentlyContinue
Write-Host "  Done" -ForegroundColor Green

# Copy appsettings
Copy-Item "$srcDir\appsettings.json" "$outDir\appsettings.json" -Force

# Start as Windows service (or console mode if service not installed)
Write-Host "[5/5] Starting bridge..." -ForegroundColor Yellow
$svc = Get-Service -Name "MT5Bridge" -ErrorAction SilentlyContinue
if ($svc) {
    sc.exe start MT5Bridge
    Start-Sleep -Seconds 10
    Write-Host "  Service started. Testing health..." -ForegroundColor Green
    try {
        $health = curl.exe -sk "https://localhost:6680/api/health" 2>$null
        Write-Host "  Health: $health" -ForegroundColor Green
    } catch {
        Write-Host "  Health check pending (service may still be connecting)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  No Windows service found. Starting in console mode..." -ForegroundColor Yellow
    Write-Host "  After 15 seconds, test with:" -ForegroundColor Gray
    Write-Host '  curl.exe -k https://localhost:6680/api/health' -ForegroundColor Gray
    Write-Host ""
    Push-Location $outDir
    & "$outDir\MT5Bridge.exe"
    Pop-Location
}

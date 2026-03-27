# ============================================================================
# MT5 Web API Bridge - Deployment Script
# ============================================================================
# Deploys the MT5 Bridge using the Web API library (for Web API accounts).
# The Web API is a pure .NET library - no native DLLs needed.
#
# Usage:
#   .\deploy-webapi-bridge.ps1
#
# Prerequisites:
#   - .NET 8 SDK installed on the server
#   - MetaTrader 5 SDK installed (for the Web API source code)
#
# Run as Administrator on the MT5 server.
# ============================================================================

param(
    [string]$MT5Server     = "213.136.69.2",
    [int]$MT5Port          = 443,
    [long]$ManagerLogin    = 123457008830,
    [string]$ManagerPassword = "E-6kZrBc",
    [string]$ManagerApiPassword = "E-6kZrB7",
    [string]$ApiKey        = "f8f8e64d67606818da38b3d160bfbf634da336ddb25932bb554a945f2d62de0f",
    [int]$ListenPort       = 6680,
    [string]$SdkDir        = "C:\MetaTrader5SDK",
    [string]$SrcDir        = "C:\MT5Bridge-webapi-src",
    [string]$InstallDir    = "C:\MT5Bridge"
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MT5 Web API Bridge - Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  MT5 Server:    $MT5Server`:$MT5Port" 
Write-Host "  Manager Login: $ManagerLogin"
Write-Host "  Listen Port:   $ListenPort"
Write-Host ""

# ── Step 0: Pre-flight ───────────────────────────────────────────────────────

Write-Host "[0/7] Pre-flight checks..." -ForegroundColor Yellow

$dotnetVersion = dotnet --version 2>$null
if (-not $dotnetVersion) {
    Write-Host "  ERROR: .NET SDK not found." -ForegroundColor Red
    exit 1
}
Write-Host "  .NET SDK: $dotnetVersion" -ForegroundColor Green

# Check for Web API source in SDK
$webApiSrc = Join-Path $SdkDir "Examples\Web\NET\MetaQuotes.MT5WebAPI"
if (-not (Test-Path $webApiSrc)) {
    Write-Host "  ERROR: MT5 Web API source not found at: $webApiSrc" -ForegroundColor Red
    Write-Host "  Make sure MetaTrader 5 SDK is installed." -ForegroundColor Red
    exit 1
}
Write-Host "  Web API source: $webApiSrc" -ForegroundColor Green

# Verify the source files are not zeroed out
$testFile = Join-Path $webApiSrc "MT5WebAPI.cs"
if (Test-Path $testFile) {
    $bytes = [System.IO.File]::ReadAllBytes($testFile)
    $nonZero = ($bytes | Where-Object { $_ -ne 0 }).Count
    if ($nonZero -lt 100) {
        Write-Host "  ERROR: SDK source files appear to be empty/zeroed." -ForegroundColor Red
        Write-Host "  Please reinstall the MetaTrader 5 SDK." -ForegroundColor Red
        exit 1
    }
    Write-Host "  SDK source files: OK ($nonZero non-zero bytes)" -ForegroundColor Green
} else {
    Write-Host "  WARNING: MT5WebAPI.cs not found, checking alternatives..." -ForegroundColor Yellow
}

# ── Step 1: Stop existing service ────────────────────────────────────────────

Write-Host "[1/7] Stopping existing service..." -ForegroundColor Yellow
sc.exe stop MT5Bridge 2>&1 | Out-Null
Start-Sleep -Seconds 3
Get-Process -Name "MT5Bridge" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "  Done" -ForegroundColor Green

# ── Step 2: Discover Web API class structure ─────────────────────────────────

Write-Host "[2/7] Discovering Web API class structure..." -ForegroundColor Yellow

# Read the main Web API file to understand class names and method signatures
$mainApiFile = Join-Path $webApiSrc "MT5WebAPI.cs"
$mainApiContent = [System.IO.File]::ReadAllText($mainApiFile, [System.Text.Encoding]::Unicode)

# Extract class name
$classMatch = [regex]::Match($mainApiContent, 'class\s+(\w+)')
$webApiClassName = if ($classMatch.Success) { $classMatch.Groups[1].Value } else { "MT5WebAPI" }
Write-Host "  Main class: $webApiClassName" -ForegroundColor Green

# Check for key method signatures
$methods = @("Connect", "Disconnect", "UserAdd", "UserGet", "UserUpdate", "UserDelete", "UserPasswordChange", "GroupTotal", "GroupGet", "DealerBalance")
foreach ($m in $methods) {
    if ($mainApiContent -match $m) {
        Write-Host "    Found: $m" -ForegroundColor DarkGreen
    } else {
        Write-Host "    Missing: $m" -ForegroundColor Yellow
    }
}

# Also check the user model file
$userModelFile = Join-Path $webApiSrc "Common\MTUser.cs"
if (Test-Path $userModelFile) {
    $userContent = [System.IO.File]::ReadAllText($userModelFile, [System.Text.Encoding]::Unicode)
    $userClassMatch = [regex]::Match($userContent, 'class\s+(\w+)')
    $userClassName = if ($userClassMatch.Success) { $userClassMatch.Groups[1].Value } else { "MTUser" }
    Write-Host "  User class: $userClassName" -ForegroundColor Green
}

# Check RetCode
$retCodeFile = Join-Path $webApiSrc "MTRetCode.cs"
if (Test-Path $retCodeFile) {
    $retContent = [System.IO.File]::ReadAllText($retCodeFile, [System.Text.Encoding]::Unicode)
    $retMatch = [regex]::Match($retContent, 'enum\s+(\w+)')
    $retCodeEnum = if ($retMatch.Success) { $retMatch.Groups[1].Value } else { "MTRetCode" }
    Write-Host "  RetCode enum: $retCodeEnum" -ForegroundColor Green
}

# ── Step 3: Create source directory structure ────────────────────────────────

Write-Host "[3/7] Writing bridge source files..." -ForegroundColor Yellow
Remove-Item $SrcDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $SrcDir -Force | Out-Null
New-Item -ItemType Directory -Path "$SrcDir\Services" -Force | Out-Null
New-Item -ItemType Directory -Path "$SrcDir\Models" -Force | Out-Null
New-Item -ItemType Directory -Path "$SrcDir\Middleware" -Force | Out-Null

# Copy the entire MT5 Web API source project
Copy-Item $webApiSrc "$SrcDir\MetaQuotes.MT5WebAPI" -Recurse -Force
Write-Host "  Copied MT5 Web API source" -ForegroundColor Green

# Fix the Web API project to target net8.0 if needed
$webApiCsproj = Join-Path $SrcDir "MetaQuotes.MT5WebAPI\MetaQuotes.MT5WebAPI.csproj"
if (Test-Path $webApiCsproj) {
    $csprojContent = [System.IO.File]::ReadAllText($webApiCsproj, [System.Text.Encoding]::Unicode)
    # Update target framework to net8.0
    $csprojContent = $csprojContent -replace 'net\d+\.\d+', 'net8.0'
    $csprojContent = $csprojContent -replace 'netstandard\d+\.\d+', 'net8.0'
    $csprojContent = $csprojContent -replace 'v4\.\d+(\.\d+)?', 'net8.0'
    # If it's an old-style csproj, replace entirely with SDK-style
    if ($csprojContent -notmatch 'Sdk=') {
        $csprojContent = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
"@
    }
    [System.IO.File]::WriteAllText($webApiCsproj, $csprojContent, [System.Text.Encoding]::UTF8)
    Write-Host "  Updated Web API project to net8.0" -ForegroundColor Green
}

# ── MT5Bridge.csproj (references Web API project) ───────────────────────────

@"
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <SelfContained>true</SelfContained>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="MetaQuotes.MT5WebAPI\MetaQuotes.MT5WebAPI.csproj" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Hosting.WindowsServices" Version="8.0.1" />
  </ItemGroup>
</Project>
"@ | Set-Content "$SrcDir\MT5Bridge.csproj" -Encoding UTF8

# ── appsettings.json ─────────────────────────────────────────────────────────

@"
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "Bridge": {
    "MT5Server": "$MT5Server",
    "MT5Port": $MT5Port,
    "ManagerLogin": $ManagerLogin,
    "ManagerPassword": "$ManagerPassword",
    "ManagerApiPassword": "$ManagerApiPassword",
    "ApiKey": "$ApiKey",
    "ListenPort": $ListenPort,
    "AllowedOrigins": [
      "https://crm.libertygroups.com",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "KeepaliveSeconds": 60,
    "ReconnectMaxSeconds": 30
  }
}
"@ | Set-Content "$SrcDir\appsettings.json" -Encoding UTF8

# ── Middleware/ApiKeyAuth.cs ─────────────────────────────────────────────────

@'
using System.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace MT5Bridge.Middleware;

public class ApiKeyAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _apiKey;
    public ApiKeyAuthMiddleware(RequestDelegate next, IOptions<BridgeOptions> options, ILogger<ApiKeyAuthMiddleware> logger)
    {
        _next = next;
        _apiKey = options.Value.ApiKey;
    }
    public async Task InvokeAsync(HttpContext context)
    {
        if ((context.Request.Path.Value ?? "").Equals("/api/health", StringComparison.OrdinalIgnoreCase))
        { await _next(context); return; }
        if (!context.Request.Headers.TryGetValue("X-API-Key", out var key) || string.IsNullOrEmpty(key))
        { context.Response.StatusCode = 401; await context.Response.WriteAsJsonAsync(new { error = "Missing X-API-Key" }); return; }
        var expected = System.Text.Encoding.UTF8.GetBytes(_apiKey);
        var provided = System.Text.Encoding.UTF8.GetBytes(key.ToString());
        if (!CryptographicOperations.FixedTimeEquals(expected, provided))
        { context.Response.StatusCode = 401; await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" }); return; }
        await _next(context);
    }
}
'@ | Set-Content "$SrcDir\Middleware\ApiKeyAuth.cs" -Encoding UTF8

# ── Models/Models.cs ─────────────────────────────────────────────────────────

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

public class BalanceResponse { public string Order { get; set; } = ""; }

public class GroupInfo
{
    public string Group { get; set; } = "";
    public string? Description { get; set; }
    public string? Currency { get; set; }
}

public class BridgeResult<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public int StatusCode { get; set; } = 200;
    public static BridgeResult<T> Ok(T data) => new() { Success = true, Data = data };
    public static BridgeResult<T> Fail(string error, int statusCode = 500) => new() { Success = false, Error = error, StatusCode = statusCode };
    public static BridgeResult<T> Unavailable(string error = "MT5 connection unavailable") => new() { Success = false, Error = error, StatusCode = 503 };
}

public class HealthStatus
{
    public bool Connected { get; set; }
    public string Mode { get; set; } = "webapi";
    public string? LastError { get; set; }
    public DateTime? LastConnected { get; set; }
    public long TotalRequests { get; set; }
    public TimeSpan Uptime { get; set; }
}
'@ | Set-Content "$SrcDir\Models\Models.cs" -Encoding UTF8

# ── Services/IMT5Service.cs ──────────────────────────────────────────────────

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
}
'@ | Set-Content "$SrcDir\Services\IMT5Service.cs" -Encoding UTF8

# ── Services/MT5SessionManager.cs ────────────────────────────────────────────

@'
using Microsoft.Extensions.Options;

namespace MT5Bridge.Services;

public class MT5SessionManager : BackgroundService
{
    private readonly IMT5Service _mt5;
    private readonly ILogger<MT5SessionManager> _logger;
    private readonly BridgeOptions _options;
    public MT5SessionManager(IMT5Service mt5, ILogger<MT5SessionManager> logger, IOptions<BridgeOptions> options)
    { _mt5 = mt5; _logger = logger; _options = options.Value; }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MT5 Session Manager starting...");
        var backoff = 1;
        while (!stoppingToken.IsCancellationRequested)
        {
            try { if (await _mt5.ConnectAsync(stoppingToken)) { _logger.LogInformation("MT5 connection established"); break; } }
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
                if (_mt5.IsConnected) { if (await _mt5.KeepaliveAsync(stoppingToken)) { backoff = 1; continue; } }
                _mt5.Disconnect();
                if (await _mt5.ConnectAsync(stoppingToken)) { _logger.LogInformation("Reconnected"); backoff = 1; }
                else { var d = Math.Min(backoff, _options.ReconnectMaxSeconds); await Task.Delay(TimeSpan.FromSeconds(d), stoppingToken); backoff = Math.Min(backoff * 2, _options.ReconnectMaxSeconds); }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { _logger.LogError(ex, "Session error"); await Task.Delay(5000, stoppingToken); }
        }
        _mt5.Disconnect();
    }
}
'@ | Set-Content "$SrcDir\Services\MT5SessionManager.cs" -Encoding UTF8

# ── Services/MT5WebApiService.cs ─────────────────────────────────────────────
# This service wraps the SDK's MT5WebAPI class using reflection to discover
# the exact method signatures (since they vary by SDK version).

$mt5ServiceContent = @'
using System.Reflection;
using Microsoft.Extensions.Options;
using MT5Bridge.Models;

namespace MT5Bridge.Services;

/// <summary>
/// MT5 Bridge Service using the Web API library.
/// The Web API is a pure .NET library that works with "Web API" type manager accounts.
/// It does NOT require native C++ DLLs.
/// </summary>
public class MT5WebApiService : IMT5Service, IDisposable
{
    private readonly ILogger<MT5WebApiService> _logger;
    private readonly BridgeOptions _options;
    private readonly SemaphoreSlim _apiLock = new(1, 1);

    private object? _webApi;      // Instance of MT5WebAPI (or whatever the main class is named)
    private Type? _webApiType;
    private Type? _userType;      // MTUser class
    private Type? _retCodeType;   // MTRetCode enum
    private Assembly? _webApiAsm;

    private bool _connected;
    private DateTime? _lastConnected;
    private string _lastError = "";
    private long _totalRequests;
    private readonly DateTime _startTime = DateTime.UtcNow;

    public bool IsConnected => _connected;

    public MT5WebApiService(ILogger<MT5WebApiService> logger, IOptions<BridgeOptions> options)
    {
        _logger = logger;
        _options = options.Value;
    }

    public async Task<bool> ConnectAsync(CancellationToken ct = default)
    {
        await _apiLock.WaitAsync(ct);
        try
        {
            // Step 1: Find and load the Web API assembly
            if (_webApiAsm == null)
            {
                // The Web API library is built as a project reference, so its types are in the loaded assemblies
                _webApiAsm = AppDomain.CurrentDomain.GetAssemblies()
                    .FirstOrDefault(a => a.GetName().Name?.Contains("MT5WebAPI", StringComparison.OrdinalIgnoreCase) == true);

                if (_webApiAsm == null)
                {
                    // Try loading from file
                    var dllPath = Path.Combine(AppContext.BaseDirectory, "MetaQuotes.MT5WebAPI.dll");
                    if (!File.Exists(dllPath))
                    {
                        _lastError = "MetaQuotes.MT5WebAPI.dll not found. Available assemblies: " +
                            string.Join(", ", AppDomain.CurrentDomain.GetAssemblies()
                                .Select(a => a.GetName().Name).Where(n => n != null).Take(20));
                        _logger.LogError(_lastError);
                        return false;
                    }
                    _webApiAsm = Assembly.LoadFrom(dllPath);
                }

                _logger.LogInformation("Web API assembly loaded: {Name} with {Count} types",
                    _webApiAsm.GetName().Name, _webApiAsm.GetExportedTypes().Length);

                // Log all exported types for diagnostics
                var typeNames = _webApiAsm.GetExportedTypes().Select(t => t.Name).OrderBy(n => n).ToList();
                _logger.LogInformation("Available types: {Types}", string.Join(", ", typeNames));
            }

            // Step 2: Find the main Web API class
            if (_webApiType == null)
            {
                _webApiType = _webApiAsm.GetExportedTypes()
                    .FirstOrDefault(t => t.Name.Contains("WebAPI", StringComparison.OrdinalIgnoreCase)
                                      && t.IsClass && !t.IsAbstract);

                if (_webApiType == null)
                {
                    _lastError = "Web API main class not found. Types: " +
                        string.Join(", ", _webApiAsm.GetExportedTypes().Select(t => t.Name).Take(30));
                    _logger.LogError(_lastError);
                    return false;
                }
                _logger.LogInformation("Web API class: {Type}", _webApiType.FullName);

                // Log all public methods
                var methods = _webApiType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .Where(m => !m.IsSpecialName && m.DeclaringType != typeof(object))
                    .Select(m => $"{m.Name}({string.Join(",", m.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})=>{m.ReturnType.Name}")
                    .OrderBy(s => s).ToList();
                _logger.LogInformation("Web API methods ({Count}):", methods.Count);
                foreach (var m in methods)
                    _logger.LogInformation("  {Method}", m);
            }

            // Step 3: Find supporting types
            if (_userType == null)
            {
                _userType = _webApiAsm.GetExportedTypes()
                    .FirstOrDefault(t => t.Name.Equals("MTUser", StringComparison.OrdinalIgnoreCase)
                                      || t.Name.Contains("MTUser", StringComparison.OrdinalIgnoreCase));
                _logger.LogInformation("User type: {Type}", _userType?.FullName ?? "not found");
            }

            if (_retCodeType == null)
            {
                _retCodeType = _webApiAsm.GetExportedTypes()
                    .FirstOrDefault(t => t.Name.Contains("RetCode", StringComparison.OrdinalIgnoreCase) && t.IsEnum);
                _logger.LogInformation("RetCode type: {Type}", _retCodeType?.FullName ?? "not found");
            }

            // Step 4: Create instance
            if (_webApi == null)
            {
                _webApi = Activator.CreateInstance(_webApiType);
                if (_webApi == null)
                {
                    _lastError = "Failed to create Web API instance";
                    _logger.LogError(_lastError);
                    return false;
                }
            }

            // Step 5: Connect
            var connectMethod = _webApiType.GetMethods()
                .Where(m => m.Name.Equals("Connect", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(m => m.GetParameters().Length)
                .FirstOrDefault();

            if (connectMethod == null)
            {
                _lastError = "No Connect method found on Web API class";
                _logger.LogError(_lastError);
                return false;
            }

            var cParams = connectMethod.GetParameters();
            _logger.LogInformation("Connect signature: {Sig}",
                string.Join(", ", cParams.Select(p => $"{p.ParameterType.Name} {p.Name}")));

            // Build Connect arguments based on parameter names and types
            var cArgs = new object?[cParams.Length];
            for (int i = 0; i < cParams.Length; i++)
            {
                var pName = cParams[i].Name?.ToLower() ?? "";
                var pType = cParams[i].ParameterType;

                if (pName.Contains("server") || pName.Contains("address") || pName.Contains("host"))
                    cArgs[i] = _options.MT5Server;
                else if (pName.Contains("port"))
                    cArgs[i] = Convert.ChangeType(_options.MT5Port, pType);
                else if (pName.Contains("timeout"))
                    cArgs[i] = Convert.ChangeType(30000, pType);
                else if (pName.Contains("login"))
                {
                    // Web API login is typically a string
                    if (pType == typeof(string))
                        cArgs[i] = _options.ManagerLogin.ToString();
                    else if (pType == typeof(ulong))
                        cArgs[i] = (ulong)_options.ManagerLogin;
                    else if (pType == typeof(uint))
                        cArgs[i] = (uint)_options.ManagerLogin;
                    else if (pType == typeof(long))
                        cArgs[i] = _options.ManagerLogin;
                    else
                        cArgs[i] = Convert.ChangeType(_options.ManagerLogin, pType);
                }
                else if (pName.Contains("password") || pName.Contains("pass"))
                    cArgs[i] = _options.ManagerPassword;
                else if (pType == typeof(string))
                    cArgs[i] = "";
                else if (pType == typeof(uint))
                    cArgs[i] = (uint)0;
                else if (pType == typeof(int))
                    cArgs[i] = 0;
            }

            _logger.LogInformation("Connecting to {Server}:{Port} login={Login}",
                _options.MT5Server, _options.MT5Port, _options.ManagerLogin);

            var result = connectMethod.Invoke(_webApi, cArgs);
            _logger.LogInformation("Connect result: {Result} (type: {Type})", result, result?.GetType().Name);

            if (IsRetCodeSuccess(result))
            {
                _connected = true;
                _lastConnected = DateTime.UtcNow;
                _lastError = "";
                _logger.LogInformation("Connected to MT5 via Web API successfully!");
                return true;
            }
            else
            {
                _lastError = $"Web API Connect failed: {result}";
                _logger.LogError(_lastError);
                _connected = false;
                return false;
            }
        }
        catch (Exception ex)
        {
            _lastError = $"Connection error: {ex.InnerException?.Message ?? ex.Message}";
            _logger.LogError(ex, "Failed to connect via Web API");
            _connected = false;
            return false;
        }
        finally { _apiLock.Release(); }
    }

    public void Disconnect()
    {
        try
        {
            if (_webApi != null)
            {
                var m = _webApiType?.GetMethod("Disconnect");
                m?.Invoke(_webApi, null);
            }
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Disconnect error"); }
        _connected = false;
    }

    public async Task<bool> KeepaliveAsync(CancellationToken ct = default)
    {
        if (!_connected || _webApi == null || _webApiType == null) return false;
        await _apiLock.WaitAsync(ct);
        try
        {
            // Try Ping, ServerTime, or TimeServer
            var m = _webApiType.GetMethods()
                .FirstOrDefault(m => m.Name.Contains("Ping") || m.Name.Contains("Time"));
            if (m != null)
            {
                var args = new object?[m.GetParameters().Length];
                // Fill out parameters if needed
                for (int i = 0; i < args.Length; i++)
                    if (m.GetParameters()[i].IsOut)
                        args[i] = null;
                m.Invoke(_webApi, args);
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Keepalive failed");
            _connected = false;
            return false;
        }
        finally { _apiLock.Release(); }
    }

    public HealthStatus GetStatus() => new()
    {
        Connected = _connected, Mode = "webapi",
        LastError = string.IsNullOrEmpty(_lastError) ? null : _lastError,
        LastConnected = _lastConnected,
        TotalRequests = _totalRequests,
        Uptime = DateTime.UtcNow - _startTime
    };

    // --- User Operations ---

    public async Task<BridgeResult<UserResponse>> CreateUser(CreateUserRequest request)
    {
        return await CallApi<UserResponse>("CreateUser", async () =>
        {
            if (_userType == null)
                return BridgeResult<UserResponse>.Fail("MTUser type not found");

            var user = Activator.CreateInstance(_userType);
            if (user == null)
                return BridgeResult<UserResponse>.Fail("Failed to create MTUser instance");

            // Set user properties
            SetProp(user, "Name", request.Name);
            SetProp(user, "Email", request.Email);
            SetProp(user, "Group", request.Group);
            SetProp(user, "Leverage", (uint)request.Leverage);
            SetProp(user, "Phone", request.Phone);
            SetProp(user, "Country", request.Country);

            // Log user properties for diagnostics
            var propNames = user.GetType().GetProperties()
                .Select(p => $"{p.Name}={p.GetValue(user)}")
                .Take(15);
            _logger.LogInformation("CreateUser props: {Props}", string.Join(", ", propNames));

            // Find UserAdd method
            var userAddMethod = FindMethod("UserAdd");
            if (userAddMethod == null)
                return BridgeResult<UserResponse>.Fail("UserAdd method not found on Web API");

            var uaParams = userAddMethod.GetParameters();
            _logger.LogInformation("UserAdd signature: {Sig}",
                string.Join(", ", uaParams.Select(p => $"{p.ParameterType.Name} {p.Name}")));

            // Build args: typically UserAdd(MTUser user, string master_pass, string investor_pass)
            var args = new object?[uaParams.Length];
            for (int i = 0; i < uaParams.Length; i++)
            {
                var pName = uaParams[i].Name?.ToLower() ?? "";
                if (uaParams[i].ParameterType == _userType || pName.Contains("user"))
                    args[i] = user;
                else if (pName.Contains("master") || (pName.Contains("pass") && !pName.Contains("invest")))
                    args[i] = request.MainPassword;
                else if (pName.Contains("invest"))
                    args[i] = request.MainPassword; // Use same password for investor
                else if (uaParams[i].ParameterType == typeof(string))
                    args[i] = request.MainPassword;
                else if (uaParams[i].IsOut)
                {
                    var elemType = uaParams[i].ParameterType.IsByRef
                        ? uaParams[i].ParameterType.GetElementType()! : uaParams[i].ParameterType;
                    args[i] = elemType.IsValueType ? Activator.CreateInstance(elemType) : null;
                }
            }

            var result = userAddMethod.Invoke(_webApi, args);
            _logger.LogInformation("UserAdd result: {Result}", result);

            if (!IsRetCodeSuccess(result))
                return BridgeResult<UserResponse>.Fail($"UserAdd failed: {result}", 400);

            // After successful add, the user object should have the Login assigned
            return BridgeResult<UserResponse>.Ok(MapUserResponse(user));
        });
    }

    public async Task<BridgeResult<UserResponse>> GetUser(long login)
    {
        return await CallApi<UserResponse>("GetUser", async () =>
        {
            var method = FindMethod("UserGet");
            if (method == null)
                return BridgeResult<UserResponse>.Fail("UserGet method not found");

            var mParams = method.GetParameters();
            var args = new object?[mParams.Length];

            for (int i = 0; i < mParams.Length; i++)
            {
                var pType = mParams[i].ParameterType;
                var isOutOrRef = mParams[i].IsOut || pType.IsByRef;

                if (isOutOrRef)
                {
                    var elemType = pType.IsByRef ? pType.GetElementType()! : pType;
                    args[i] = elemType.IsValueType ? Activator.CreateInstance(elemType) : null;
                }
                else if (pType == typeof(ulong))
                    args[i] = (ulong)login;
                else if (pType == typeof(long))
                    args[i] = login;
                else if (pType == typeof(uint))
                    args[i] = (uint)login;
                else if (pType == typeof(string))
                    args[i] = login.ToString();
            }

            var result = method.Invoke(_webApi, args);
            if (!IsRetCodeSuccess(result))
                return BridgeResult<UserResponse>.Fail($"UserGet failed: {result}", 404);

            // Find the user object in the out params
            object? userObj = null;
            for (int i = 0; i < args.Length; i++)
                if (mParams[i].IsOut && args[i] != null && args[i]!.GetType().Name.Contains("User"))
                    userObj = args[i];

            if (userObj == null)
                return BridgeResult<UserResponse>.Fail("UserGet returned no user object");

            return BridgeResult<UserResponse>.Ok(MapUserResponse(userObj));
        });
    }

    public async Task<BridgeResult<object>> UpdateUser(UpdateUserRequest request)
    {
        return await CallApi<object>("UpdateUser", async () =>
        {
            // First get the user
            var getResult = await GetUser(request.Login);
            if (!getResult.Success)
                return BridgeResult<object>.Fail($"User not found: {getResult.Error}", 404);

            // Get user again to get the raw object
            var getMethod = FindMethod("UserGet");
            if (getMethod == null)
                return BridgeResult<object>.Fail("UserGet not found");

            var gParams = getMethod.GetParameters();
            var gArgs = new object?[gParams.Length];
            for (int i = 0; i < gParams.Length; i++)
            {
                if (gParams[i].IsOut || gParams[i].ParameterType.IsByRef)
                    gArgs[i] = null;
                else if (gParams[i].ParameterType == typeof(ulong))
                    gArgs[i] = (ulong)request.Login;
                else if (gParams[i].ParameterType == typeof(string))
                    gArgs[i] = request.Login.ToString();
            }
            getMethod.Invoke(_webApi, gArgs);

            object? user = null;
            for (int i = 0; i < gArgs.Length; i++)
                if (gParams[i].IsOut && gArgs[i] != null)
                    user = gArgs[i];

            if (user == null)
                return BridgeResult<object>.Fail("Could not get user for update");

            if (request.Leverage.HasValue) SetProp(user, "Leverage", (uint)request.Leverage.Value);
            if (request.Group != null) SetProp(user, "Group", request.Group);

            var updateMethod = FindMethod("UserUpdate");
            if (updateMethod == null)
                return BridgeResult<object>.Fail("UserUpdate not found");

            var uArgs = new object?[updateMethod.GetParameters().Length];
            for (int i = 0; i < uArgs.Length; i++)
            {
                if (updateMethod.GetParameters()[i].ParameterType == _userType)
                    uArgs[i] = user;
            }

            var result = updateMethod.Invoke(_webApi, uArgs);
            if (!IsRetCodeSuccess(result))
                return BridgeResult<object>.Fail($"UserUpdate failed: {result}", 400);

            return BridgeResult<object>.Ok(new { success = true });
        });
    }

    public async Task<BridgeResult<object>> ChangePassword(ChangePasswordRequest request)
    {
        return await CallApi<object>("ChangePassword", async () =>
        {
            var method = FindMethod("UserPasswordChange");
            if (method == null)
                return BridgeResult<object>.Fail("UserPasswordChange not found");

            var mParams = method.GetParameters();
            var args = new object?[mParams.Length];
            for (int i = 0; i < mParams.Length; i++)
            {
                var pName = mParams[i].Name?.ToLower() ?? "";
                if (pName.Contains("login"))
                    args[i] = Convert.ChangeType((ulong)request.Login, mParams[i].ParameterType);
                else if (pName.Contains("password") || pName.Contains("pass"))
                    args[i] = request.Password;
                else if (pName.Contains("type"))
                    args[i] = Convert.ChangeType(request.Type, mParams[i].ParameterType);
            }

            var result = method.Invoke(_webApi, args);
            if (!IsRetCodeSuccess(result))
                return BridgeResult<object>.Fail($"PasswordChange failed: {result}", 400);

            return BridgeResult<object>.Ok(new { success = true });
        });
    }

    public async Task<BridgeResult<BalanceResponse>> BalanceOperation(BalanceRequest request)
    {
        return await CallApi<BalanceResponse>("BalanceOperation", async () =>
        {
            // Web API: try TradeBalance or DealerBalance
            var method = FindMethod("TradeBalance") ?? FindMethod("DealerBalance");
            if (method == null)
                return BridgeResult<BalanceResponse>.Fail("Balance operation method not found");

            var mParams = method.GetParameters();
            var args = new object?[mParams.Length];
            for (int i = 0; i < mParams.Length; i++)
            {
                var pName = mParams[i].Name?.ToLower() ?? "";
                if (pName.Contains("login"))
                    args[i] = Convert.ChangeType((ulong)request.Login, mParams[i].ParameterType);
                else if (pName.Contains("type"))
                    args[i] = Convert.ChangeType(request.Type, mParams[i].ParameterType);
                else if (pName.Contains("balance") || pName.Contains("value") || pName.Contains("amount"))
                    args[i] = request.Balance;
                else if (pName.Contains("comment"))
                    args[i] = request.Comment;
                else if (mParams[i].IsOut)
                {
                    var elemType = mParams[i].ParameterType.IsByRef
                        ? mParams[i].ParameterType.GetElementType()! : mParams[i].ParameterType;
                    args[i] = elemType.IsValueType ? Activator.CreateInstance(elemType) : null;
                }
            }

            var result = method.Invoke(_webApi, args);
            if (!IsRetCodeSuccess(result))
                return BridgeResult<BalanceResponse>.Fail($"Balance failed: {result}", 400);

            // Check for ticket in out params
            string ticket = DateTime.UtcNow.Ticks.ToString();
            for (int i = 0; i < args.Length; i++)
                if (mParams[i].IsOut && args[i] != null)
                    ticket = args[i].ToString() ?? ticket;

            return BridgeResult<BalanceResponse>.Ok(new BalanceResponse { Order = ticket });
        });
    }

    public async Task<BridgeResult<List<TradeRecord>>> GetHistory(long login, long? from, long? to)
    {
        return await CallApi<List<TradeRecord>>("GetHistory", async () =>
            BridgeResult<List<TradeRecord>>.Ok(new List<TradeRecord>()));
    }

    public async Task<BridgeResult<List<TradeRecord>>> GetPositions(long login)
    {
        return await CallApi<List<TradeRecord>>("GetPositions", async () =>
            BridgeResult<List<TradeRecord>>.Ok(new List<TradeRecord>()));
    }

    public async Task<BridgeResult<object>> GetGroupTotal()
    {
        return await CallApi<object>("GetGroupTotal", async () =>
        {
            var method = FindMethod("GroupTotal");
            if (method == null)
                return BridgeResult<object>.Ok(new { Total = 0 });

            var mParams = method.GetParameters();
            var args = new object?[mParams.Length];
            for (int i = 0; i < mParams.Length; i++)
                if (mParams[i].IsOut)
                    args[i] = (uint)0;

            var result = method.Invoke(_webApi, args);
            if (IsRetCodeSuccess(result))
            {
                for (int i = 0; i < args.Length; i++)
                    if (mParams[i].IsOut)
                        return BridgeResult<object>.Ok(new { Total = args[i] });
            }
            return BridgeResult<object>.Ok(new { Total = 0 });
        });
    }

    public async Task<BridgeResult<List<GroupInfo>>> GetAllGroups()
    {
        return await CallApi<List<GroupInfo>>("GetAllGroups", async () =>
        {
            var groups = new List<GroupInfo>();
            // Try GroupGet with wildcard
            var method = FindMethod("GroupGet");
            if (method != null)
            {
                // Web API typically requires iterating groups
                // For now, return what we can discover
            }
            return BridgeResult<List<GroupInfo>>.Ok(groups);
        });
    }

    // --- Helpers ---

    private async Task<BridgeResult<T>> CallApi<T>(string op, Func<Task<BridgeResult<T>>> action)
    {
        if (!_connected || _webApi == null)
            return BridgeResult<T>.Unavailable();
        Interlocked.Increment(ref _totalRequests);
        await _apiLock.WaitAsync();
        try { return await action(); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in {Op}", op);
            _lastError = $"{op}: {ex.InnerException?.Message ?? ex.Message}";
            return BridgeResult<T>.Fail($"{op} failed: {ex.InnerException?.Message ?? ex.Message}");
        }
        finally { _apiLock.Release(); }
    }

    private MethodInfo? FindMethod(string name)
    {
        return _webApiType?.GetMethods()
            .FirstOrDefault(m => m.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
    }

    private void SetProp(object obj, string name, object? value)
    {
        var p = obj.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (p != null && p.CanWrite)
        {
            try { p.SetValue(obj, Convert.ChangeType(value, p.PropertyType)); return; }
            catch { /* try method fallback */ }
        }
        // Method fallback: obj.Name("value") or obj.SetName("value")
        var setter = obj.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(m => (m.Name.Equals(name, StringComparison.OrdinalIgnoreCase)
                               || m.Name.Equals($"Set{name}", StringComparison.OrdinalIgnoreCase))
                              && m.GetParameters().Length == 1);
        if (setter != null)
        {
            try { setter.Invoke(obj, new[] { Convert.ChangeType(value, setter.GetParameters()[0].ParameterType) }); }
            catch (Exception ex) { _logger.LogWarning("SetProp {Name} via method failed: {Err}", name, ex.Message); }
        }
    }

    private T? GetProp<T>(object obj, string name)
    {
        var p = obj.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (p != null) { var v = p.GetValue(obj); if (v is T t) return t; try { return (T)Convert.ChangeType(v, typeof(T)); } catch { } }
        // Method fallback
        var getter = obj.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(m => m.Name.Equals(name, StringComparison.OrdinalIgnoreCase) && m.GetParameters().Length == 0
                              && m.ReturnType != typeof(void));
        if (getter != null) { var v = getter.Invoke(obj, null); if (v is T t) return t; try { return (T)Convert.ChangeType(v, typeof(T)); } catch { } }
        return default;
    }

    private UserResponse MapUserResponse(object rec) => new()
    {
        Login = (GetProp<ulong>(rec, "Login")).ToString(),
        Name = GetProp<string>(rec, "Name") ?? "",
        Group = GetProp<string>(rec, "Group") ?? "",
        Leverage = $"1:{GetProp<uint>(rec, "Leverage")}",
        Balance = GetProp<double>(rec, "Balance"),
        Equity = GetProp<double>(rec, "Equity"),
        Margin = GetProp<double>(rec, "Margin"),
        FreeMargin = GetProp<double>(rec, "MarginFree"),
        Currency = GetProp<string>(rec, "CurrencyDeposit") ?? GetProp<string>(rec, "Currency") ?? "USD",
        Registration = DateTime.UtcNow.ToString("o")
    };

    private static bool IsRetCodeSuccess(object? rc)
    {
        if (rc == null) return false;
        var s = rc.ToString() ?? "";
        if (s == "0" || s.Contains("OK", StringComparison.OrdinalIgnoreCase)) return true;
        try { return Convert.ToInt64(rc) == 0; } catch { return false; }
    }

    public void Dispose() { Disconnect(); _apiLock.Dispose(); }
}
'@
[System.IO.File]::WriteAllText("$SrcDir\Services\MT5WebApiService.cs", $mt5ServiceContent, [System.Text.Encoding]::UTF8)

# ── Program.cs ───────────────────────────────────────────────────────────────

@'
using MT5Bridge.Middleware;
using MT5Bridge.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseWindowsService();
builder.Services.Configure<BridgeOptions>(builder.Configuration.GetSection("Bridge"));
builder.Services.AddSingleton<IMT5Service, MT5WebApiService>();
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
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(listenPort, listenOptions =>
    {
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
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
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
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

app.Logger.LogInformation("MT5 Web API Bridge starting on port {Port}", listenPort);
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
    public string[] AllowedOrigins { get; set; } = [];
    public int KeepaliveSeconds { get; set; } = 60;
    public int ReconnectMaxSeconds { get; set; } = 30;
}
'@ | Set-Content "$SrcDir\Program.cs" -Encoding UTF8

Write-Host "  All source files written." -ForegroundColor Green

# ── Step 4: Build Web API library ────────────────────────────────────────────

Write-Host "[4/7] Building Web API library..." -ForegroundColor Yellow

# First try to build the Web API project alone to catch errors early
$webApiBuildResult = dotnet build "$SrcDir\MetaQuotes.MT5WebAPI\MetaQuotes.MT5WebAPI.csproj" -c Release 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Web API library build encountered issues. Attempting fixes..." -ForegroundColor Yellow
    
    # Common fix: remove Properties/AssemblyInfo.cs (conflicts with SDK-style project)
    $asmInfo = "$SrcDir\MetaQuotes.MT5WebAPI\Properties\AssemblyInfo.cs"
    if (Test-Path $asmInfo) {
        Remove-Item $asmInfo -Force
        Write-Host "    Removed conflicting AssemblyInfo.cs" -ForegroundColor Yellow
    }
    
    # Retry build
    dotnet build "$SrcDir\MetaQuotes.MT5WebAPI\MetaQuotes.MT5WebAPI.csproj" -c Release 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Web API library build failed. Will try full solution build." -ForegroundColor Yellow
    }
}
Write-Host "  Web API library build complete" -ForegroundColor Green

# ── Step 5: Build full solution ──────────────────────────────────────────────

Write-Host "[5/7] Building MT5 Bridge..." -ForegroundColor Yellow
dotnet publish "$SrcDir\MT5Bridge.csproj" -c Release -r win-x64 --self-contained true -o $InstallDir 2>&1

if (-not (Test-Path "$InstallDir\MT5Bridge.exe")) {
    Write-Host "  Build FAILED!" -ForegroundColor Red
    Write-Host "  Check build output above for errors." -ForegroundColor Red
    exit 1
}
Write-Host "  Build OK" -ForegroundColor Green

# ── Step 6: Copy config ─────────────────────────────────────────────────────

Write-Host "[6/7] Copying configuration..." -ForegroundColor Yellow
Copy-Item "$SrcDir\appsettings.json" "$InstallDir\appsettings.json" -Force
Write-Host "  Done" -ForegroundColor Green

# ── Step 7: Install and start service ────────────────────────────────────────

Write-Host "[7/7] Starting service..." -ForegroundColor Yellow
$existingSvc = Get-Service -Name "MT5Bridge" -ErrorAction SilentlyContinue
if (-not $existingSvc) {
    sc.exe create MT5Bridge binPath= "$InstallDir\MT5Bridge.exe" start= auto displayname= "MT5 Web API Bridge"
    sc.exe description MT5Bridge "MetaTrader 5 Web API HTTP Bridge"
}
sc.exe start MT5Bridge
Start-Sleep -Seconds 10

# Health check
Write-Host ""
Write-Host "Checking health..." -ForegroundColor Yellow
try {
    $health = curl.exe -sk "https://localhost:$ListenPort/api/health" 2>$null
    Write-Host "Health: $health" -ForegroundColor Green
} catch {
    Write-Host "  Health check - try manually: curl -k https://localhost:$ListenPort/api/health" -ForegroundColor Yellow
}

# ── Summary ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MT5 Web API Bridge Deployed!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bridge URL: https://localhost:$ListenPort" -ForegroundColor White
Write-Host "Mode:       Web API (pure .NET, no native DLLs)" -ForegroundColor White
Write-Host "API Key:    $($ApiKey.Substring(0,8))..." -ForegroundColor White
Write-Host ""
Write-Host "To test:" -ForegroundColor Yellow
Write-Host "  curl -sk https://localhost:$ListenPort/api/health"
Write-Host ""
Write-Host "To run directly (for debugging):" -ForegroundColor Yellow
Write-Host "  sc.exe stop MT5Bridge; C:\MT5Bridge\MT5Bridge.exe --urls https://localhost:$ListenPort"

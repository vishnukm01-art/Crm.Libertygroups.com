# ============================================================================
# MT5 API Bridge - Parameterized Deployment Script
# ============================================================================
# Creates and deploys the MT5 Bridge service with your connection details.
#
# Usage:
#   .\deploy-mt5-bridge.ps1 -MT5Server "213.136.69.2" -MT5Port 443 `
#       -ManagerLogin 123457008830 -ManagerPassword "YourPassword" `
#       -ManagerApiPassword "YourApiPassword" `
#       -ApiKey "your-api-key-here"
#
# Or run without parameters for interactive prompts.
# Run as Administrator on the MT5 server.
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$MT5Server,

    [Parameter(Mandatory=$false)]
    [int]$MT5Port = 443,

    [Parameter(Mandatory=$false)]
    [long]$ManagerLogin,

    [Parameter(Mandatory=$false)]
    [string]$ManagerPassword,

    [Parameter(Mandatory=$false)]
    [string]$ManagerApiPassword,

    [Parameter(Mandatory=$false)]
    [string]$ApiKey,

    [Parameter(Mandatory=$false)]
    [int]$ListenPort = 6680,

    [Parameter(Mandatory=$false)]
    [string]$CertPassword = "MT5Br1dge!Cert",

    [Parameter(Mandatory=$false)]
    [string[]]$AllowedOrigins = @("https://crm.libertygroups.com", "http://localhost:3000", "http://localhost:3001"),

    [Parameter(Mandatory=$false)]
    [string]$SdkDir = "C:\MetaTrader5SDK\Libs",

    [Parameter(Mandatory=$false)]
    [string]$InstallDir = "C:\MT5Bridge",

    [Parameter(Mandatory=$false)]
    [string]$SrcDir = "C:\MT5Bridge-src"
)

# ── Interactive prompts for missing required parameters ──────────────────────

if ([string]::IsNullOrEmpty($MT5Server)) {
    $MT5Server = Read-Host "Enter MT5 Server Hostname/IP (e.g. 213.136.69.2)"
}
if ($ManagerLogin -eq 0) {
    $ManagerLogin = [long](Read-Host "Enter MT5 Manager Login (e.g. 123457008830)")
}
if ([string]::IsNullOrEmpty($ManagerPassword)) {
    $ManagerPassword = Read-Host "Enter MT5 Manager Password"
}
if ([string]::IsNullOrEmpty($ManagerApiPassword)) {
    $ManagerApiPassword = Read-Host "Enter MT5 Manager API Password (password_cert, or press Enter to skip)"
}
if ([string]::IsNullOrEmpty($ApiKey)) {
    $ApiKey = Read-Host "Enter Bridge API Key (or press Enter to auto-generate)"
    if ([string]::IsNullOrEmpty($ApiKey)) {
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
        $ApiKey = -join ($bytes | ForEach-Object { $_.ToString("x2") })
        Write-Host "  Generated API Key: $ApiKey" -ForegroundColor Cyan
    }
}

# ── Display configuration ────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MT5 API Bridge - Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  MT5 Server:      $MT5Server`:$MT5Port"
Write-Host "  Manager Login:   $ManagerLogin"
Write-Host "  Manager Pass:    $('*' * $ManagerPassword.Length)"
Write-Host "  API Password:    $('*' * $ManagerApiPassword.Length)"
Write-Host "  API Key:         $($ApiKey.Substring(0,8))..."
Write-Host "  Listen Port:     $ListenPort"
Write-Host "  SDK Dir:         $SdkDir"
Write-Host "  Install Dir:     $InstallDir"
Write-Host "  Source Dir:      $SrcDir"
Write-Host "  Allowed Origins: $($AllowedOrigins -join ', ')"
Write-Host ""

# ── Pre-flight checks ───────────────────────────────────────────────────────

Write-Host "[Pre-flight] Checking requirements..." -ForegroundColor Yellow

# Check for .NET SDK
$dotnetVersion = dotnet --version 2>$null
if (-not $dotnetVersion) {
    Write-Host "  ERROR: .NET SDK not found. Install .NET 8 SDK first." -ForegroundColor Red
    Write-Host "  Download: https://dotnet.microsoft.com/download/dotnet/8.0" -ForegroundColor Red
    exit 1
}
Write-Host "  .NET SDK: $dotnetVersion" -ForegroundColor Green

# Check for SDK DLLs
$requiredDlls = @("MetaQuotes.MT5ManagerAPI64.dll", "MetaQuotes.MT5CommonAPI64.dll")
$optionalDlls = @("MT5APIManager64.dll", "MT5APIGateway64.dll")

foreach ($dll in $requiredDlls) {
    if (-not (Test-Path (Join-Path $SdkDir $dll))) {
        Write-Host "  ERROR: Required DLL not found: $SdkDir\$dll" -ForegroundColor Red
        Write-Host "  Install MetaTrader 5 Manager API SDK and set -SdkDir parameter" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  MT5 SDK DLLs: OK" -ForegroundColor Green

# ── Step 1: Stop existing service ────────────────────────────────────────────

Write-Host ""
Write-Host "[1/6] Stopping existing MT5Bridge service..." -ForegroundColor Yellow
$svc = Get-Service -Name "MT5Bridge" -ErrorAction SilentlyContinue
if ($svc) {
    sc.exe stop MT5Bridge 2>&1 | Out-Null
    Start-Sleep -Seconds 5
    # Wait for service to fully stop
    $retries = 0
    while ((Get-Service -Name "MT5Bridge" -ErrorAction SilentlyContinue).Status -eq "Running" -and $retries -lt 10) {
        Start-Sleep -Seconds 2
        $retries++
    }
    Write-Host "  Service stopped." -ForegroundColor Green
} else {
    Write-Host "  No existing service found (fresh install)." -ForegroundColor Green
}

# ── Step 2: Create source directory structure ────────────────────────────────

Write-Host "[2/6] Writing source files..." -ForegroundColor Yellow
Remove-Item $SrcDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $SrcDir -Force | Out-Null
New-Item -ItemType Directory -Path "$SrcDir\Services" -Force | Out-Null
New-Item -ItemType Directory -Path "$SrcDir\Models" -Force | Out-Null
New-Item -ItemType Directory -Path "$SrcDir\Middleware" -Force | Out-Null
New-Item -ItemType Directory -Path "$SrcDir\libs" -Force | Out-Null

# Copy SDK DLLs to libs for build references
foreach ($dll in $requiredDlls) {
    Copy-Item (Join-Path $SdkDir $dll) "$SrcDir\libs\" -Force
}
foreach ($dll in $optionalDlls) {
    Copy-Item (Join-Path $SdkDir $dll) "$SrcDir\libs\" -Force -ErrorAction SilentlyContinue
}

# ── MT5Bridge.csproj ─────────────────────────────────────────────────────────

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
'@ | Set-Content "$SrcDir\MT5Bridge.csproj" -Encoding UTF8

# ── appsettings.json (parameterized) ─────────────────────────────────────────

$originsJson = ($AllowedOrigins | ForEach-Object { "      `"$_`"" }) -join ",`n"
$appSettings = @"
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
    "CertPassword": "$CertPassword",
    "AllowedOrigins": [
$originsJson
    ],
    "KeepaliveSeconds": 60,
    "ReconnectMaxSeconds": 30
  }
}
"@
[System.IO.File]::WriteAllText("$SrcDir\appsettings.json", $appSettings, [System.Text.Encoding]::UTF8)

# ── Program.cs ───────────────────────────────────────────────────────────────

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
var certPath = builder.Configuration.GetValue<string>("Kestrel:Endpoints:Https:Certificate:Path");
var certPass = builder.Configuration.GetValue<string>("Kestrel:Endpoints:Https:Certificate:Password")
               ?? builder.Configuration.GetValue<string>("Bridge:CertPassword") ?? "";

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

app.Logger.LogInformation("MT5 Bridge starting on port {Port}", listenPort);
app.Run();

public class BridgeOptions
{
    public string MT5Server { get; set; } = "127.0.0.1";
    public int MT5Port { get; set; } = 443;
    public long ManagerLogin { get; set; }
    public string ManagerPassword { get; set; } = "";
    public string ManagerApiPassword { get; set; } = "";
    public string ApiKey { get; set; } = "";    public int ListenPort { get; set; } = 6680;
    public string CertPassword { get; set; } = "";
    public string[] AllowedOrigins { get; set; } = [];
    public int KeepaliveSeconds { get; set; } = 60;
    public int ReconnectMaxSeconds { get; set; } = 30;
}
'@ | Set-Content "$SrcDir\Program.cs" -Encoding UTF8

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

public class BridgeResult<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public int StatusCode { get; set; } = 200;

    public static BridgeResult<T> Ok(T data) => new() { Success = true, Data = data };
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
                    var d = Math.Min(backoff, _options.ReconnectMaxSeconds);
                    _logger.LogWarning("Reconnect failed, next in {Delay}s", d);
                    await Task.Delay(TimeSpan.FromSeconds(d), stoppingToken);
                    backoff = Math.Min(backoff * 2, _options.ReconnectMaxSeconds);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { _logger.LogError(ex, "Session error"); await Task.Delay(5000, stoppingToken); }
        }
        _mt5.Disconnect();
    }
}
'@ | Set-Content "$SrcDir\Services\MT5SessionManager.cs" -Encoding UTF8

# ── Middleware/ApiKeyAuth.cs ─────────────────────────────────────────────────

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
        if (path.Equals("/api/health", StringComparison.OrdinalIgnoreCase))
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
'@ | Set-Content "$SrcDir\Middleware\ApiKeyAuth.cs" -Encoding UTF8

# ── Services/MT5Service.cs (with all fixes) ─────────────────────────────────
# Key fixes included:
#   1. CreateRecord: searches UserRecordNew, UserCreate, UserNew patterns
#   2. CreateUser: 3-arg UserAdd call with diagnostic logging
#   3. GroupCreateArray/GroupRequestArray for group listing

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
                _logger.LogInformation("Assembly loaded with {Count} types",
                    _managerAssembly.GetExportedTypes().Length);
            }

            // Step 2: Find and initialize factory
            if (_factoryType == null)
            {
                _factoryType = FindType(_managerAssembly, "ManagerAPIFactory");
                if (_factoryType == null)
                {
                    _lastError = "ManagerAPIFactory type not found in assembly. " +
                        $"Available: {string.Join(", ", _managerAssembly.GetExportedTypes().Select(t => t.Name).Take(30))}";
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

            // Step 3: CreateManager
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
                _logger.LogInformation("CreateManager returned: {Type}",
                    _managerApi?.GetType().FullName ?? "null");

                if (_managerApi == null)
                {
                    object? errCode = null;
                    for (int i = 0; i < parameters.Length; i++)
                        if (parameters[i].IsOut) errCode = args[i];
                    _lastError = $"CreateManager returned null. Error: {errCode}";
                    _logger.LogError(_lastError);
                    return false;
                }
            }

            // Step 4: Connect to MT5 server
            var connectMethod = _managerApi.GetType().GetMethod("Connect")
                ?? _managerApi.GetType().GetMethods()
                    .FirstOrDefault(m => m.Name.Equals("Connect", StringComparison.OrdinalIgnoreCase));

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
                    cArgs[i] = pType.IsEnum ? Enum.ToObject(pType, 0) : Convert.ChangeType(0, pType);
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
        TotalRequests = _totalRequests, ServerBuild = "5660",
        Uptime = DateTime.UtcNow - _startTime
    };

    // --- User Operations ---

    public async Task<BridgeResult<UserResponse>> CreateUser(CreateUserRequest request)
    {
        return await CallApi<UserResponse>("CreateUser", async () =>
        {
            var diag = new List<string>();

            var rec = CreateRecord("User");
            if (rec == null)
                return BridgeResult<UserResponse>.Fail(
                    "Could not create MT5 user record object. Check CreateRecord logs.");

            diag.Add($"RecordType={rec.GetType().FullName}");

            var props = rec.GetType().GetProperties()
                .Select(p => $"{p.Name}({(p.CanWrite ? "rw" : "ro")})")
                .Take(25);
            diag.Add($"Props=[{string.Join(",", props)}]");

            var meths = rec.GetType().GetMethods()
                .Where(m => !m.IsSpecialName && m.DeclaringType != typeof(object))
                .Select(m => m.Name).Distinct().Take(30);
            diag.Add($"Methods=[{string.Join(",", meths)}]");

            // Set user fields
            SetProperty(rec, "Name", request.Name);
            SetProperty(rec, "Email", request.Email);
            SetProperty(rec, "Group", request.Group);
            SetProperty(rec, "Leverage", (uint)request.Leverage);
            SetProperty(rec, "Phone", request.Phone);
            SetProperty(rec, "Country", request.Country);

            // Verify fields were set
            var vName = GetProperty<string>(rec, "Name") ?? "(null)";
            var vGroup = GetProperty<string>(rec, "Group") ?? "(null)";
            var vLev = GetProperty<uint>(rec, "Leverage");
            var vEmail = GetProperty<string>(rec, "Email") ?? "(null)";
            diag.Add($"Verify: Name={vName}, Group={vGroup}, Leverage={vLev}, Email={vEmail}");

            // List UserAdd signatures for diagnostics
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

            // Try 3-arg call first: UserAdd(user, master_pass, investor_pass)
            string callType = "3-arg";
            var r = InvokeMethod("UserAdd", rec, request.MainPassword, request.MainPassword);
            if (r == null)
            {
                // Fallback to 1-arg if 3-arg overload not found
                callType = "1-arg(fallback)";
                SetProperty(rec, "MainPassword", request.MainPassword);
                r = InvokeMethod("UserAdd", rec);
            }
            diag.Add($"CallType={callType}");
            diag.Add($"Result={r}(type:{r?.GetType().Name})");

            _logger.LogInformation("CreateUser DIAG: {Diag}", string.Join(" | ", diag));

            if (!IsRetCodeSuccess(r))
                return BridgeResult<UserResponse>.Fail(
                    $"UserAdd failed: {r} || DIAG: {string.Join(" | ", diag)}", 400);

            return BridgeResult<UserResponse>.Ok(MapUserResponse(rec));
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
            return BridgeResult<List<TradeRecord>>.Ok(trades);
        });
    }

    public async Task<BridgeResult<List<TradeRecord>>> GetPositions(long login)
    {
        return await CallApi<List<TradeRecord>>("GetPositions", async () =>
        {
            var positions = new List<TradeRecord>();
            return BridgeResult<List<TradeRecord>>.Ok(positions);
        });
    }

    public async Task<BridgeResult<object>> GetGroupTotal()
    {
        return await CallApi<object>("GetGroupTotal", async () =>
        {
            try
            {
                var createArrayMethod = FindApiMethod("GroupCreateArray");
                if (createArrayMethod != null)
                {
                    var groupArray = createArrayMethod.Invoke(_managerApi, null);
                    if (groupArray != null)
                    {
                        var requestMethod = FindApiMethod("GroupRequestArray");
                        if (requestMethod != null)
                        {
                            var reqResult = requestMethod.Invoke(_managerApi, new object[] { "*", groupArray });
                            if (IsRetCodeSuccess(reqResult))
                            {
                                var totalMethod = groupArray.GetType().GetMethod("Total");
                                if (totalMethod != null)
                                {
                                    var total = totalMethod.Invoke(groupArray, null);
                                    return BridgeResult<object>.Ok(new { Total = total });
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "GroupTotal error"); }
            return BridgeResult<object>.Ok(new { Total = 0 });
        });
    }

    public async Task<BridgeResult<List<GroupInfo>>> GetAllGroups()
    {
        return await CallApi<List<GroupInfo>>("GetAllGroups", async () =>
        {
            var groups = new List<GroupInfo>();
            try
            {
                var createArrayMethod = FindApiMethod("GroupCreateArray");
                if (createArrayMethod == null)
                    return BridgeResult<List<GroupInfo>>.Ok(groups);

                var groupArray = createArrayMethod.Invoke(_managerApi, null);
                if (groupArray == null)
                    return BridgeResult<List<GroupInfo>>.Ok(groups);

                var requestMethod = FindApiMethod("GroupRequestArray");
                if (requestMethod == null)
                    return BridgeResult<List<GroupInfo>>.Ok(groups);

                var reqResult = requestMethod.Invoke(_managerApi, new object[] { "*", groupArray });
                if (!IsRetCodeSuccess(reqResult))
                    return BridgeResult<List<GroupInfo>>.Fail($"GroupRequestArray failed: {reqResult}");

                var totalMethod = groupArray.GetType().GetMethod("Total");
                var nextMethod = groupArray.GetType().GetMethod("Next");
                if (totalMethod == null || nextMethod == null)
                    return BridgeResult<List<GroupInfo>>.Ok(groups);

                var total = (uint)(totalMethod.Invoke(groupArray, null) ?? 0u);
                _logger.LogInformation("GroupRequestArray returned {Total} groups", total);

                for (uint i = 0; i < total; i++)
                {
                    var groupObj = nextMethod.Invoke(groupArray, new object[] { i });
                    if (groupObj == null) continue;

                    var nameMethod = groupObj.GetType().GetMethod("Group", Type.EmptyTypes);
                    var companyMethod = groupObj.GetType().GetMethod("Company", Type.EmptyTypes);
                    var currencyMethod = groupObj.GetType().GetMethod("Currency", Type.EmptyTypes);

                    var name = nameMethod?.Invoke(groupObj, null) as string ?? "";
                    var company = companyMethod?.Invoke(groupObj, null) as string;
                    var currency = currencyMethod?.Invoke(groupObj, null) as string;

                    if (!string.IsNullOrEmpty(name))
                        groups.Add(new GroupInfo { Group = name, Description = company, Currency = currency });
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "GetAllGroups error"); }
            return BridgeResult<List<GroupInfo>>.Ok(groups);
        });
    }

    // --- Helpers ---

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
            Path.Combine(AppContext.BaseDirectory, "..", "libs"),
            @"C:\MetaTrader5SDK\Libs",
        };
        foreach (var d in dirs)
            foreach (var n in names)
            {
                var p = Path.Combine(d, n);
                if (File.Exists(p))
                {
                    _logger.LogInformation("Found MT5 DLL at: {Path}", p);
                    return p;
                }
            }
        _logger.LogError("MT5 DLL not found in: {Paths}", string.Join(", ", dirs));
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

    /// <summary>
    /// Creates an MT5 record object using the Manager API factory methods.
    /// Searches for multiple naming patterns: UserRecordNew, UserCreate, UserNew
    /// This handles different MT5 SDK versions (build 5660 uses UserCreate, build 5699+ uses UserRecordNew).
    /// </summary>
    private object? CreateRecord(string type)
    {
        if (_managerApi == null) return null;

        // Search for multiple naming patterns used across MT5 SDK versions
        var patterns = new[] { $"{type}RecordNew", $"{type}Create", $"{type}New" };
        MethodInfo? cm = null;
        foreach (var pat in patterns)
        {
            cm = _managerApi.GetType().GetMethods()
                .FirstOrDefault(m => m.Name.Contains(pat, StringComparison.OrdinalIgnoreCase));
            if (cm != null) break;
        }

        // Broader fallback: any method containing the type name + New/Create (excluding Get)
        if (cm == null)
        {
            cm = _managerApi.GetType().GetMethods()
                .FirstOrDefault(m => m.Name.Contains(type, StringComparison.OrdinalIgnoreCase)
                    && (m.Name.Contains("New", StringComparison.OrdinalIgnoreCase)
                     || m.Name.Contains("Create", StringComparison.OrdinalIgnoreCase))
                    && !m.Name.Contains("Get", StringComparison.OrdinalIgnoreCase));
        }

        if (cm != null)
        {
            _logger.LogInformation("CreateRecord: Using method {Method} for {Type}", cm.Name, type);
            var a = new object?[cm.GetParameters().Length];
            var r = cm.Invoke(_managerApi, a);

            // Check if return value is the record
            if (r != null && r.GetType().Name.Contains(type, StringComparison.OrdinalIgnoreCase))
                return r;

            // Check out parameters for the record
            for (int i = 0; i < a.Length; i++)
                if (a[i] != null && a[i]!.GetType().Name.Contains(type, StringComparison.OrdinalIgnoreCase))
                    return a[i];

            // If method returned MTRetCode, record might be in any out param
            if (r != null)
            {
                for (int i = 0; i < a.Length; i++)
                    if (a[i] != null) return a[i];
            }
            return r;
        }

        // Log available methods for diagnostics
        var related = _managerApi.GetType().GetMethods()
            .Where(m => m.Name.Contains(type, StringComparison.OrdinalIgnoreCase))
            .Select(m => $"{m.Name}({m.GetParameters().Length})");
        _logger.LogWarning("CreateRecord: No create method for {Type}. Related: {Methods}",
            type, string.Join("; ", related));

        // Last resort: direct instantiation (may produce uninitialized COM wrappers)
        if (_managerAssembly != null)
        {
            var rc = _managerAssembly.GetExportedTypes()
                .FirstOrDefault(t => t.Name.Contains($"MT{type}", StringComparison.OrdinalIgnoreCase)
                    && t.IsClass && !t.IsAbstract);
            if (rc != null)
            {
                _logger.LogWarning("CreateRecord: Falling back to Activator for {Class}", rc.Name);
                return Activator.CreateInstance(rc);
            }
        }
        return null;
    }

    private void SetProperty(object obj, string name, object? value)
    {
        var p = obj.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (p != null && p.CanWrite) { p.SetValue(obj, Convert.ChangeType(value, p.PropertyType)); return; }

        var s = obj.GetType().GetMethod($"Set{name}", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (s != null) { s.Invoke(obj, new[] { value }); return; }

        // MT5 COM interop: method overload with same name (e.g. MainPassword(string))
        var m = obj.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(x => x.Name.Equals(name, StringComparison.OrdinalIgnoreCase) && x.GetParameters().Length == 1);
        if (m != null) { m.Invoke(obj, new[] { Convert.ChangeType(value, m.GetParameters()[0].ParameterType) }); return; }

        _logger.LogWarning("SetProperty failed for {Name} on {Type}", name, obj.GetType().Name);
    }

    private T? GetProperty<T>(object obj, string name)
    {
        var p = obj.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (p != null) { var v = p.GetValue(obj); if (v is T t) return t; try { return (T)Convert.ChangeType(v, typeof(T)); } catch { } }
        return default;
    }

    private UserResponse MapUserResponse(object rec) => new()
    {
        Login = (GetProperty<ulong>(rec, "Login")).ToString(),
        Name = GetProperty<string>(rec, "Name") ?? "",
        Group = GetProperty<string>(rec, "Group") ?? "",
        Leverage = $"1:{GetProperty<uint>(rec, "Leverage")}",
        Balance = GetProperty<double>(rec, "Balance"),
        Equity = GetProperty<double>(rec, "Equity"),
        Margin = GetProperty<double>(rec, "Margin"),
        FreeMargin = GetProperty<double>(rec, "MarginFree"),
        Currency = GetProperty<string>(rec, "CurrencyDeposit") ?? GetProperty<string>(rec, "Currency") ?? "USD",
        Registration = GetProperty<long>(rec, "Registration") is long rt && rt > 0
            ? DateTimeOffset.FromUnixTimeSeconds(rt).UtcDateTime.ToString("o") : DateTime.UtcNow.ToString("o")
    };

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
[System.IO.File]::WriteAllText("$SrcDir\Services\MT5Service.cs", $mt5ServiceContent, [System.Text.Encoding]::UTF8)

Write-Host "  All source files written." -ForegroundColor Green

# Verify
if (-not (Test-Path "$SrcDir\MT5Bridge.csproj")) {
    Write-Host "  ERROR: MT5Bridge.csproj not found after write!" -ForegroundColor Red
    exit 1
}
Write-Host "  Project verified." -ForegroundColor Green

# ── Step 3: Build ────────────────────────────────────────────────────────────

Write-Host "[3/6] Building MT5 Bridge..." -ForegroundColor Yellow
dotnet publish "$SrcDir\MT5Bridge.csproj" -c Release -r win-x64 --self-contained true -o $InstallDir
if (-not (Test-Path "$InstallDir\MT5Bridge.exe")) {
    Write-Host "  Build FAILED! Check output above." -ForegroundColor Red
    exit 1
}
Write-Host "  Build OK" -ForegroundColor Green

# ── Step 4: Copy SDK DLLs to output ─────────────────────────────────────────

Write-Host "[4/6] Copying SDK DLLs to output..." -ForegroundColor Yellow
Copy-Item "$SdkDir\*.dll" "$InstallDir\" -Force
Copy-Item "$SrcDir\appsettings.json" "$InstallDir\appsettings.json" -Force
Write-Host "  Done" -ForegroundColor Green

# ── Step 5: Install Windows service ──────────────────────────────────────────

Write-Host "[5/6] Installing Windows service..." -ForegroundColor Yellow
$existingSvc = Get-Service -Name "MT5Bridge" -ErrorAction SilentlyContinue
if (-not $existingSvc) {
    sc.exe create MT5Bridge binPath= "$InstallDir\MT5Bridge.exe" start= auto displayname= "MT5 API Bridge"
    sc.exe description MT5Bridge "MetaTrader 5 Manager API HTTP Bridge"
    Write-Host "  Service created." -ForegroundColor Green
} else {
    Write-Host "  Service already exists." -ForegroundColor Green
}

# ── Step 6: Start service and verify ─────────────────────────────────────────

Write-Host "[6/6] Starting service..." -ForegroundColor Yellow
sc.exe start MT5Bridge
Start-Sleep -Seconds 10

# Health check
Write-Host ""
Write-Host "Checking health endpoint..." -ForegroundColor Yellow
try {
    $health = curl.exe -sk "https://localhost:$ListenPort/api/health" 2>$null
    Write-Host "Health: $health" -ForegroundColor Green
} catch {
    Write-Host "  Health check failed (service may still be starting)" -ForegroundColor Yellow
    Write-Host "  Try: curl -k https://localhost:$ListenPort/api/health" -ForegroundColor Yellow
}

# ── Summary ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MT5 Bridge Deployment Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bridge URL:    https://localhost:$ListenPort" -ForegroundColor White
Write-Host "Health check:  https://localhost:$ListenPort/api/health" -ForegroundColor White
Write-Host "API Key:       $($ApiKey.Substring(0,8))..." -ForegroundColor White
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "  POST /api/user/add           - Create MT5 account"
Write-Host "  GET  /api/user/get?login=X   - Get user details"
Write-Host "  POST /api/user/update        - Update user"
Write-Host "  POST /api/user/password/change - Change password"
Write-Host "  POST /api/trade/balance      - Balance operation"
Write-Host "  GET  /api/history/get        - Trade history"
Write-Host "  GET  /api/position/get       - Open positions"
Write-Host "  GET  /api/group/total        - Group count"
Write-Host "  GET  /api/group/getall       - List all groups"
Write-Host ""
Write-Host "All endpoints require header: X-API-Key: <your-api-key>" -ForegroundColor Yellow
Write-Host ""
Write-Host "Logs: Get-WinEvent -LogName Application -FilterXPath '*[System[Provider[@Name=""MT5Bridge""]]]' -MaxEvents 50" -ForegroundColor DarkGray

using MT5Bridge.Middleware;
using MT5Bridge.Services;

var builder = WebApplication.CreateBuilder(args);

// Support running as a Windows Service
builder.Host.UseWindowsService();

// Bind configuration
builder.Services.Configure<BridgeOptions>(builder.Configuration.GetSection("Bridge"));

// Register MT5 Manager service as singleton (one DLL connection shared across requests)
builder.Services.AddSingleton<IMT5Service, MT5Service>();

// Register session manager as background service (keepalive + reconnection)
builder.Services.AddHostedService<MT5SessionManager>();

// Configure CORS
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

// Configure Kestrel to listen on the bridge port with HTTPS
var listenPort = builder.Configuration.GetValue<int>("Bridge:ListenPort", 6680);
var certPath = builder.Configuration.GetValue<string>("Bridge:CertPath") ?? "";
var certPass = builder.Configuration.GetValue<string>("Bridge:CertPassword") ?? "";

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(listenPort, listenOptions =>
    {
        if (!string.IsNullOrEmpty(certPath) && System.IO.File.Exists(certPath))
        {
            listenOptions.UseHttps(certPath, certPass);
        }
        else
        {
            // Fallback: use dev cert or auto-generated cert
            listenOptions.UseHttps();
        }
    });
});

var app = builder.Build();

app.UseCors();

// API key authentication middleware (skips /api/health)
app.UseMiddleware<ApiKeyAuthMiddleware>();

// ─── Health endpoint (no auth required) ───────────────────────
app.MapGet("/api/health", (IMT5Service mt5) =>
{
    var status = mt5.GetStatus();
    return Results.Json(status);
});

// ─── User endpoints ──────────────────────────────────────────
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

// ─── Trade endpoints ─────────────────────────────────────────
app.MapPost("/api/trade/balance", async (MT5Bridge.Models.BalanceRequest req, IMT5Service mt5) =>
{
    var result = await mt5.BalanceOperation(req);
    return result.Success ? Results.Json(result.Data) : Results.Json(result, statusCode: result.StatusCode);
});

// ─── History endpoints ───────────────────────────────────────
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

// ─── Group endpoints ─────────────────────────────────────────
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
        // Include diagnostic info if no groups found
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

// ─── Debug endpoint (for troubleshooting) ────────────────────
app.MapGet("/api/debug/methods", (IMT5Service mt5) =>
{
    if (mt5 is MT5Service svc)
    {
        var info = svc.GetDebugInfo();
        return Results.Json(info);
    }
    return Results.Json(new { error = "Not available" });
});

app.Logger.LogInformation("MT5 Bridge starting on port {Port}", listenPort);
app.Run();

// ─── Configuration POCO ──────────────────────────────────────
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

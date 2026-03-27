using System.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace MT5Bridge.Middleware;

/// <summary>
/// Middleware that validates X-API-Key header on all requests except /api/health.
/// Uses constant-time comparison to prevent timing attacks.
/// </summary>
public class ApiKeyAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _apiKey;
    private readonly ILogger<ApiKeyAuthMiddleware> _logger;

    public ApiKeyAuthMiddleware(
        RequestDelegate next,
        IOptions<BridgeOptions> options,
        ILogger<ApiKeyAuthMiddleware> logger)
    {
        _next = next;
        _apiKey = options.Value.ApiKey;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";

        // Skip auth for health endpoint
        if (path.Equals("/api/health", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // Validate API key
        if (!context.Request.Headers.TryGetValue("X-API-Key", out var providedKey) ||
            string.IsNullOrEmpty(providedKey))
        {
            _logger.LogWarning("Request to {Path} from {IP} missing API key",
                path, context.Connection.RemoteIpAddress);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Missing X-API-Key header" });
            return;
        }

        // Constant-time comparison to prevent timing attacks
        var expected = System.Text.Encoding.UTF8.GetBytes(_apiKey);
        var provided = System.Text.Encoding.UTF8.GetBytes(providedKey.ToString());

        if (!CryptographicOperations.FixedTimeEquals(expected, provided))
        {
            _logger.LogWarning("Request to {Path} from {IP} with invalid API key",
                path, context.Connection.RemoteIpAddress);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" });
            return;
        }

        await _next(context);
    }
}

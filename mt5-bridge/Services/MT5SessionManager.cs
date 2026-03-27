using Microsoft.Extensions.Options;

namespace MT5Bridge.Services;

/// <summary>
/// Background service managing the MT5 Manager API connection lifecycle.
/// Handles: initial connection, periodic keepalive pings, automatic reconnection.
/// </summary>
public class MT5SessionManager : BackgroundService
{
    private readonly IMT5Service _mt5;
    private readonly ILogger<MT5SessionManager> _logger;
    private readonly BridgeOptions _options;

    public MT5SessionManager(
        IMT5Service mt5,
        ILogger<MT5SessionManager> logger,
        IOptions<BridgeOptions> options)
    {
        _mt5 = mt5;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MT5 Session Manager starting...");

        // Initial connection with retries
        var backoff = 1;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var connected = await _mt5.ConnectAsync(stoppingToken);
                if (connected)
                {
                    _logger.LogInformation("MT5 connection established");
                    break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Connection attempt failed");
            }

            var delay = Math.Min(backoff, _options.ReconnectMaxSeconds);
            _logger.LogInformation("Retrying connection in {Delay}s...", delay);
            await Task.Delay(TimeSpan.FromSeconds(delay), stoppingToken);
            backoff = Math.Min(backoff * 2, _options.ReconnectMaxSeconds);
        }

        // Keepalive + reconnection loop
        backoff = 1;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_options.KeepaliveSeconds), stoppingToken);

                if (_mt5.IsConnected)
                {
                    var alive = await _mt5.KeepaliveAsync(stoppingToken);
                    if (alive)
                    {
                        backoff = 1; // Reset backoff on successful keepalive
                        continue;
                    }
                    _logger.LogWarning("Keepalive failed, attempting reconnection");
                }

                // Reconnect with exponential backoff
                _mt5.Disconnect();
                var connected = await _mt5.ConnectAsync(stoppingToken);
                if (connected)
                {
                    _logger.LogInformation("Reconnected to MT5 server");
                    backoff = 1;
                }
                else
                {
                    var delay = Math.Min(backoff, _options.ReconnectMaxSeconds);
                    _logger.LogWarning("Reconnection failed, next attempt in {Delay}s", delay);
                    await Task.Delay(TimeSpan.FromSeconds(delay), stoppingToken);
                    backoff = Math.Min(backoff * 2, _options.ReconnectMaxSeconds);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in session management loop");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        _logger.LogInformation("MT5 Session Manager shutting down, disconnecting...");
        _mt5.Disconnect();
    }
}

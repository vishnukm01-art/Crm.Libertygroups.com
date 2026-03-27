using MT5Bridge.Models;

namespace MT5Bridge.Services;

/// <summary>
/// Interface for all MT5 Manager API operations.
/// Implemented by MT5Service which wraps the MT5ManagerAPI.NET.dll.
/// </summary>
public interface IMT5Service
{
    /// <summary>Whether the bridge is connected to MT5</summary>
    bool IsConnected { get; }

    /// <summary>Connect to the MT5 server using Manager API</summary>
    Task<bool> ConnectAsync(CancellationToken ct = default);

    /// <summary>Disconnect from the MT5 server</summary>
    void Disconnect();

    /// <summary>Ping the server to keep the session alive</summary>
    Task<bool> KeepaliveAsync(CancellationToken ct = default);

    /// <summary>Get bridge/connection health status</summary>
    HealthStatus GetStatus();

    // ─── User operations ─────────────────────────────────────
    Task<BridgeResult<UserResponse>> CreateUser(CreateUserRequest request);
    Task<BridgeResult<UserResponse>> GetUser(long login);
    Task<BridgeResult<object>> UpdateUser(UpdateUserRequest request);
    Task<BridgeResult<object>> ChangePassword(ChangePasswordRequest request);

    // ─── Trade operations ────────────────────────────────────
    Task<BridgeResult<BalanceResponse>> BalanceOperation(BalanceRequest request);

    // ─── History operations ──────────────────────────────────
    Task<BridgeResult<List<TradeRecord>>> GetHistory(long login, long? from, long? to);
    Task<BridgeResult<List<TradeRecord>>> GetPositions(long login);

    // ─── Group operations ────────────────────────────────────
    Task<BridgeResult<object>> GetGroupTotal();
    Task<BridgeResult<List<GroupInfo>>> GetAllGroups();
    Task<BridgeResult<GroupInfo>> CreateGroup(CreateGroupRequest request);
}

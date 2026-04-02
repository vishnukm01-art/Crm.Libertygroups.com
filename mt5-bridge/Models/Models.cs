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
    public int Type { get; set; } // 0 = main, 1 = investor
    public string Password { get; set; } = "";
}

public class BalanceRequest
{
    public long Login { get; set; }
    public int Type { get; set; } = 2; // 2 = balance adjustment
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
    // Diagnostics: raw volume values from MT5 for verification
    public ulong VolumeExtRaw { get; set; }
    public ulong VolumeRaw { get; set; }
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

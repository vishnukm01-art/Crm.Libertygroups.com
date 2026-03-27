# MT5Bridge Patch Script - Fixes CreateRecord and CreateUser methods
# Run on the MT5 server: powershell -ExecutionPolicy Bypass -File patch-server.ps1

$csFile = "C:\mt5-bridge\Services\MT5Service.cs"
Write-Host "=== MT5Bridge Patcher ===" -ForegroundColor Cyan

# Read the current file
$content = Get-Content $csFile -Raw
$backup = "$csFile.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $csFile $backup
Write-Host "Backup saved to: $backup" -ForegroundColor Green

# ─── PATCH 1: Fix CreateRecord method ───
# Find the CreateRecord method and replace it entirely
$createRecordPattern = '(?s)(    private object\? CreateRecord\(string recordType\)\s*\{).*?(    private void SetProperty)'
$createRecordNew = @'
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

    private void SetProperty
'@

if ($content -match '(?s)private object\? CreateRecord\(string recordType\)') {
    $content = [regex]::Replace($content, $createRecordPattern, $createRecordNew)
    Write-Host "PATCH 1: CreateRecord method - APPLIED" -ForegroundColor Green
} else {
    Write-Host "PATCH 1: CreateRecord method - NOT FOUND (may already be patched)" -ForegroundColor Yellow
}

# ─── PATCH 2: Fix CreateUser method with diagnostics ───
$createUserPattern = '(?s)(    public async Task<BridgeResult<UserResponse>> CreateUser\(CreateUserRequest request\)\s*\{).*?(    public async Task<BridgeResult<UserResponse>> GetUser)'
$createUserNew = @'
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

    public async Task<BridgeResult<UserResponse>> GetUser
'@

if ($content -match '(?s)public async Task<BridgeResult<UserResponse>> CreateUser') {
    $content = [regex]::Replace($content, $createUserPattern, $createUserNew)
    Write-Host "PATCH 2: CreateUser method with diagnostics - APPLIED" -ForegroundColor Green
} else {
    Write-Host "PATCH 2: CreateUser method - NOT FOUND" -ForegroundColor Yellow
}

# Write patched file
Set-Content $csFile -Value $content -NoNewline
Write-Host "File written: $csFile" -ForegroundColor Green

# ─── REBUILD ───
Write-Host "`n=== Rebuilding MT5Bridge ===" -ForegroundColor Cyan
Stop-Service MT5Bridge -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Push-Location C:\mt5-bridge
dotnet build -c Release -o C:\MT5Bridge\bin 2>&1 | ForEach-Object { Write-Host $_ }
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild succeeded!" -ForegroundColor Green
    Start-Service MT5Bridge
    Start-Sleep -Seconds 3
    $svc = Get-Service MT5Bridge
    Write-Host "Service status: $($svc.Status)" -ForegroundColor $(if($svc.Status -eq 'Running'){'Green'}else{'Red'})
} else {
    Write-Host "`nBuild FAILED!" -ForegroundColor Red
    Write-Host "Restoring backup..." -ForegroundColor Yellow
    Copy-Item $backup $csFile
    Start-Service MT5Bridge
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan

# MT5 API Method Signature Dump
# Run this on the MT5 server to discover all available API methods and types
# This helps verify the correct method names for UserAdd, UserCreate, etc.

Write-Host "MT5 Manager API - Method Signature Dump" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Find the .NET wrapper DLL
$dllPaths = @(
    "C:\MT5Bridge\libs\MetaQuotes.MT5ManagerAPI64.dll",
    "C:\MT5Bridge\MetaQuotes.MT5ManagerAPI64.dll",
    "C:\MT5Bridge-src\libs\MetaQuotes.MT5ManagerAPI64.dll",
    "C:\MetaTrader5SDK\Libs\MetaQuotes.MT5ManagerAPI64.dll"
)

$dllPath = $null
foreach ($p in $dllPaths) {
    if (Test-Path $p) { $dllPath = $p; break }
}

if (-not $dllPath) {
    Write-Host "ERROR: MetaQuotes.MT5ManagerAPI64.dll not found" -ForegroundColor Red
    exit 1
}

Write-Host "`nLoading: $dllPath" -ForegroundColor Yellow
$asm = [System.Reflection.Assembly]::LoadFrom($dllPath)

Write-Host "`n--- ALL EXPORTED TYPES ---" -ForegroundColor Green
$types = $asm.GetExportedTypes()
foreach ($t in $types) {
    Write-Host "  $($t.FullName) (IsClass=$($t.IsClass), IsInterface=$($t.IsInterface), IsAbstract=$($t.IsAbstract))"
}

# Find the Manager API type (CIMTManagerAPI or similar)
Write-Host "`n--- MANAGER API TYPE ---" -ForegroundColor Green
$mgrType = $types | Where-Object { $_.Name -match "Manager" -and $_.Name -notmatch "Factory" } | Select-Object -First 1
if ($mgrType) {
    Write-Host "  Manager type: $($mgrType.FullName)"
    Write-Host "`n  ALL METHODS:" -ForegroundColor Yellow
    $methods = $mgrType.GetMethods() | Where-Object { $_.DeclaringType -ne [object] } | Sort-Object Name
    foreach ($m in $methods) {
        $params = ($m.GetParameters() | ForEach-Object {
            "$($_.ParameterType.Name)$(if($_.IsOut){' [out]'}) $($_.Name)"
        }) -join ", "
        Write-Host "    $($m.ReturnType.Name) $($m.Name)($params)"
    }
}

# Find the Factory type
Write-Host "`n--- FACTORY TYPE ---" -ForegroundColor Green
$factType = $types | Where-Object { $_.Name -match "Factory" } | Select-Object -First 1
if ($factType) {
    Write-Host "  Factory type: $($factType.FullName)"
    $methods = $factType.GetMethods([System.Reflection.BindingFlags]::Static -bor [System.Reflection.BindingFlags]::Public)
    foreach ($m in $methods) {
        $params = ($m.GetParameters() | ForEach-Object {
            "$($_.ParameterType.Name)$(if($_.IsOut){' [out]'}) $($_.Name)"
        }) -join ", "
        Write-Host "    $($m.ReturnType.Name) $($m.Name)($params)"
    }
}

# Focus on User-related methods
Write-Host "`n--- USER-RELATED METHODS (on Manager API) ---" -ForegroundColor Green
if ($mgrType) {
    $userMethods = $mgrType.GetMethods() | Where-Object { $_.Name -match "User" } | Sort-Object Name
    foreach ($m in $userMethods) {
        $params = ($m.GetParameters() | ForEach-Object {
            "$($_.ParameterType.Name)$(if($_.IsOut){' [out]'}) $($_.Name)"
        }) -join ", "
        Write-Host "    $($m.ReturnType.Name) $($m.Name)($params)" -ForegroundColor White
    }
}

# Focus on Group-related methods
Write-Host "`n--- GROUP-RELATED METHODS ---" -ForegroundColor Green
if ($mgrType) {
    $groupMethods = $mgrType.GetMethods() | Where-Object { $_.Name -match "Group" } | Sort-Object Name
    foreach ($m in $groupMethods) {
        $params = ($m.GetParameters() | ForEach-Object {
            "$($_.ParameterType.Name)$(if($_.IsOut){' [out]'}) $($_.Name)"
        }) -join ", "
        Write-Host "    $($m.ReturnType.Name) $($m.Name)($params)" -ForegroundColor White
    }
}

# Focus on Connect method
Write-Host "`n--- CONNECT METHOD ---" -ForegroundColor Green
if ($mgrType) {
    $connectMethods = $mgrType.GetMethods() | Where-Object { $_.Name -eq "Connect" }
    foreach ($m in $connectMethods) {
        $params = ($m.GetParameters() | ForEach-Object {
            "$($_.ParameterType.Name)$(if($_.IsOut){' [out]'}) $($_.Name)"
        }) -join ", "
        Write-Host "    $($m.ReturnType.Name) $($m.Name)($params)" -ForegroundColor White
    }
}

# Look for IMTUser or user record types
Write-Host "`n--- USER RECORD TYPES ---" -ForegroundColor Green
$userTypes = $types | Where-Object { $_.Name -match "User" -or $_.Name -match "IMTUser" }
foreach ($t in $userTypes) {
    Write-Host "`n  Type: $($t.FullName)" -ForegroundColor Yellow
    Write-Host "  Properties:" -ForegroundColor White
    foreach ($p in $t.GetProperties()) {
        Write-Host "    $($p.PropertyType.Name) $($p.Name) (CanRead=$($p.CanRead), CanWrite=$($p.CanWrite))"
    }
    Write-Host "  Methods (non-special):" -ForegroundColor White
    $tMethods = $t.GetMethods() | Where-Object { -not $_.IsSpecialName -and $_.DeclaringType -ne [object] } | Sort-Object Name
    foreach ($m in $tMethods) {
        $params = ($m.GetParameters() | ForEach-Object {
            "$($_.ParameterType.Name) $($_.Name)"
        }) -join ", "
        Write-Host "    $($m.ReturnType.Name) $($m.Name)($params)"
    }
}

Write-Host "`nDump complete." -ForegroundColor Cyan

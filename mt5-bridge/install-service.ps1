# MT5 Bridge - Server-Side Build and Deploy Script
# Run as Administrator on the MT5 Windows server (213.136.69.2)

param(
    [string]$ServiceName = "MT5Bridge",
    [string]$SourcePath  = "C:\MT5Bridge-src",
    [string]$InstallPath = "C:\MT5Bridge",
    [string]$SdkPath     = "C:\MetaTrader5SDK\Libs",
    [string]$Action      = "deploy"
)

$ExePath      = Join-Path $InstallPath "MT5Bridge.exe"
$LibsPath     = Join-Path $SourcePath "libs"
$CertPath     = Join-Path $InstallPath "bridge-cert.pfx"
$CertPassword = "MT5Br1dge!Cert"
$ApiKey       = "f8f8e64d67606818da38b3d160bfbf634da336ddb25932bb554a945f2d62de0f"

$requiredDlls = @(
    "MetaQuotes.MT5ManagerAPI64.dll",
    "MetaQuotes.MT5CommonAPI64.dll",
    "MT5APIManager64.dll",
    "MT5APIGateway64.dll"
)

function Write-Step {
    param([string]$StepNum, [string]$TotalNum, [string]$Msg)
    Write-Host ""
    Write-Host "  [$StepNum/$TotalNum] $Msg" -ForegroundColor Cyan
    Write-Host ("  " + ("-" * 56)) -ForegroundColor DarkGray
}

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-DotNetSdk {
    try {
        $version = $null
        $version = & dotnet --version 2>&1
        if ($version -and $version.ToString().StartsWith("8.")) {
            Write-Host "  .NET SDK $version already installed." -ForegroundColor Green
            return $true
        }
    }
    catch { }

    Write-Host "  .NET 8 SDK not found. Installing..." -ForegroundColor Yellow
    $installerUrl = "https://dot.net/v1/dotnet-install.ps1"
    $installerPath = Join-Path $env:TEMP "dotnet-install.ps1"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        & $installerPath -Channel 8.0 -InstallDir "C:\dotnet"
        $env:PATH = "C:\dotnet;" + $env:PATH
        $env:DOTNET_ROOT = "C:\dotnet"
        $ver = & dotnet --version 2>&1
        if ($ver) {
            Write-Host "  .NET SDK $ver installed at C:\dotnet" -ForegroundColor Green
            $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
            if ($currentPath -notlike "*C:\dotnet*") {
                [Environment]::SetEnvironmentVariable("PATH", "C:\dotnet;" + $currentPath, "Machine")
            }
            return $true
        }
    }
    catch {
        Write-Host "  ERROR installing .NET SDK: $_" -ForegroundColor Red
    }
    return $false
}

function Copy-SdkDlls {
    if (-not (Test-Path $LibsPath)) {
        New-Item -ItemType Directory -Path $LibsPath -Force | Out-Null
    }
    $allOk = $true
    foreach ($dll in $requiredDlls) {
        $src = Join-Path $SdkPath $dll
        $dst = Join-Path $LibsPath $dll
        if (Test-Path $src) {
            Copy-Item $src $dst -Force
            Write-Host "  OK: $dll" -ForegroundColor Green
        }
        else {
            Write-Host "  MISSING: $dll" -ForegroundColor Red
            $allOk = $false
        }
    }
    return $allOk
}

function Copy-NativeDllsToOutput {
    foreach ($dll in @("MT5APIManager64.dll", "MT5APIGateway64.dll")) {
        $src = Join-Path $SdkPath $dll
        $dst = Join-Path $InstallPath $dll
        if (Test-Path $src) { Copy-Item $src $dst -Force }
    }
    $outLibs = Join-Path $InstallPath "libs"
    if (-not (Test-Path $outLibs)) {
        New-Item -ItemType Directory -Path $outLibs -Force | Out-Null
    }
    foreach ($dll in $requiredDlls) {
        $src = Join-Path $SdkPath $dll
        $dst = Join-Path $outLibs $dll
        if (Test-Path $src) { Copy-Item $src $dst -Force }
    }
}

switch ($Action.ToLower()) {

    "deploy" {
        Write-Host ""
        Write-Host "  ================================================" -ForegroundColor Green
        Write-Host "    MT5 Bridge - Full Server-Side Deployment"       -ForegroundColor Green
        Write-Host "  ================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Source : $SourcePath"
        Write-Host "  Output : $InstallPath"
        Write-Host "  SDK    : $SdkPath"

        if (-not (Test-Admin)) {
            Write-Host "  ERROR: Run this script as Administrator!" -ForegroundColor Red
            exit 1
        }

        # Step 1
        Write-Step -StepNum "1" -TotalNum "8" -Msg "Verifying bridge source files..."
        $csprojPath = Join-Path $SourcePath "MT5Bridge.csproj"
        if (-not (Test-Path $csprojPath)) {
            Write-Host "  ERROR: MT5Bridge.csproj not found at $SourcePath" -ForegroundColor Red
            exit 1
        }
        Write-Host "  Source files verified." -ForegroundColor Green

        # Step 2
        Write-Step -StepNum "2" -TotalNum "8" -Msg "Copying MetaQuotes SDK DLLs..."
        $allFound = Copy-SdkDlls
        if (-not $allFound) {
            Write-Host "  WARNING: Some SDK DLLs not found at $SdkPath" -ForegroundColor Yellow
            $cont = Read-Host "  Continue anyway? (y/n)"
            if ($cont -ne "y") { exit 1 }
        }

        # Step 3
        Write-Step -StepNum "3" -TotalNum "8" -Msg "Checking .NET 8 SDK..."
        $dotnetOk = Install-DotNetSdk
        if (-not $dotnetOk) {
            Write-Host "  ERROR: .NET 8 SDK required." -ForegroundColor Red
            exit 1
        }

        # Step 4
        Write-Step -StepNum "4" -TotalNum "8" -Msg "Building MT5 Bridge (Release, win-x64)..."
        Write-Host "  Running dotnet publish..." -ForegroundColor Gray
        Push-Location $SourcePath
        & dotnet publish -c Release -r win-x64 --self-contained true -o $InstallPath
        Pop-Location

        if (-not (Test-Path $ExePath)) {
            Write-Host "  ERROR: Build failed." -ForegroundColor Red
            exit 1
        }
        Write-Host "  Build successful: $ExePath" -ForegroundColor Green

        Copy-NativeDllsToOutput

        $srcSettings = Join-Path $SourcePath "appsettings.json"
        $dstSettings = Join-Path $InstallPath "appsettings.json"
        if (-not (Test-Path $dstSettings)) {
            Copy-Item $srcSettings $dstSettings
        }

        # Step 5
        Write-Step -StepNum "5" -TotalNum "8" -Msg "Generating self-signed HTTPS certificate..."
        if (Test-Path $CertPath) {
            Write-Host "  Certificate already exists, skipping." -ForegroundColor Yellow
        }
        else {
            try {
                $certParams = @{
                    DnsName           = @("213.136.69.2", "localhost", "mt5bridge.libertygroups.com")
                    CertStoreLocation = "Cert:\LocalMachine\My"
                    NotAfter          = (Get-Date).AddYears(5)
                    FriendlyName      = "MT5 Bridge HTTPS"
                    KeyAlgorithm      = "RSA"
                    KeyLength         = 2048
                }
                $cert = New-SelfSignedCertificate @certParams
                $securePassword = ConvertTo-SecureString -String $CertPassword -Force -AsPlainText
                Export-PfxCertificate -Cert $cert -FilePath $CertPath -Password $securePassword | Out-Null
                Write-Host "  Certificate generated: $CertPath" -ForegroundColor Green
                Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
            }
            catch {
                Write-Host "  ERROR generating certificate: $_" -ForegroundColor Red
                Write-Host "  Continuing without cert, Kestrel will use dev cert." -ForegroundColor Yellow
            }
        }

        $settingsPath = Join-Path $InstallPath "appsettings.json"
        if (Test-Path $settingsPath) {
            $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
            if (-not $settings.Kestrel) {
                $kestrelConfig = @{
                    Endpoints = @{
                        Https = @{
                            Url = "https://0.0.0.0:6680"
                            Certificate = @{
                                Path = $CertPath
                                Password = $CertPassword
                            }
                        }
                    }
                }
                $settings | Add-Member -NotePropertyName "Kestrel" -NotePropertyValue $kestrelConfig
                $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
                Write-Host "  Updated appsettings.json with cert config." -ForegroundColor Green
            }
        }

        # Step 6
        Write-Step -StepNum "6" -TotalNum "8" -Msg "Configuring Windows Firewall for port 6680..."
        $existingRule = Get-NetFirewallRule -DisplayName "MT5Bridge" -ErrorAction SilentlyContinue
        if ($existingRule) {
            Remove-NetFirewallRule -DisplayName "MT5Bridge" -ErrorAction SilentlyContinue
        }
        $fwParams = @{
            DisplayName = "MT5Bridge"
            Description = "Allow inbound HTTPS to MT5 Bridge API on port 6680"
            Direction   = "Inbound"
            Protocol    = "TCP"
            LocalPort   = 6680
            Action      = "Allow"
            Profile     = "Any"
        }
        New-NetFirewallRule @fwParams | Out-Null
        Write-Host "  Firewall rule created: Allow TCP 6680 inbound." -ForegroundColor Green

        # Step 7
        Write-Step -StepNum "7" -TotalNum "8" -Msg "Installing and starting Windows Service..."
        $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "  Stopping existing service..." -ForegroundColor Yellow
            sc.exe stop $ServiceName 2>&1 | Out-Null
            Start-Sleep -Seconds 3
            sc.exe delete $ServiceName 2>&1 | Out-Null
            Start-Sleep -Seconds 2
        }

        sc.exe create $ServiceName binPath="$ExePath" start=auto displayName="MT5 Manager API Bridge"
        sc.exe description $ServiceName "REST API bridge for MT5 Manager API - Liberty Markets CRM"
        sc.exe failure $ServiceName reset=86400 actions=restart/5000/restart/10000/restart/30000

        Write-Host "  Starting service..." -ForegroundColor Green
        sc.exe start $ServiceName
        Start-Sleep -Seconds 5

        # Step 8
        Write-Step -StepNum "8" -TotalNum "8" -Msg "Verifying deployment..."
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq "Running") {
            Write-Host "  Service Status: RUNNING" -ForegroundColor Green
        }
        else {
            Write-Host "  Service may not have started. Check Event Viewer for errors." -ForegroundColor Yellow
        }

        Write-Host ""
        Write-Host "  Testing health endpoint..." -ForegroundColor Cyan
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-RestMethod -Uri "https://localhost:6680/api/health" -Method Get -SkipCertificateCheck -TimeoutSec 10
            Write-Host "  Health check response:" -ForegroundColor Green
            $response | ConvertTo-Json -Depth 5 | Write-Host
        }
        catch {
            Write-Host "  Health check failed: $_" -ForegroundColor Yellow
            Write-Host "  Service may still be initializing. Try again in 30s:" -ForegroundColor Yellow
            Write-Host "    .\install-service.ps1 -Action status" -ForegroundColor White
        }

        Write-Host ""
        Write-Host "  ================================================" -ForegroundColor Green
        Write-Host "    Deployment complete!"                            -ForegroundColor Green
        Write-Host "  ================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Bridge URL      : https://213.136.69.2:6680"      -ForegroundColor White
        Write-Host "  Health endpoint  : /api/health"                    -ForegroundColor White
        Write-Host "  Service name     : $ServiceName"                   -ForegroundColor White
        Write-Host ""
        Write-Host "  Next: Run .\install-service.ps1 -Action test"     -ForegroundColor Yellow
    }

    "build" {
        Write-Host "  Building MT5 Bridge from source..." -ForegroundColor Cyan
        $dotnetOk = Install-DotNetSdk
        if (-not $dotnetOk) { Write-Host "  ERROR: .NET 8 SDK required." -ForegroundColor Red; exit 1 }

        Copy-SdkDlls | Out-Null

        Push-Location $SourcePath
        & dotnet publish -c Release -r win-x64 --self-contained true -o $InstallPath
        Pop-Location

        if (Test-Path $ExePath) { Write-Host "  Build successful: $ExePath" -ForegroundColor Green }
        else { Write-Host "  Build FAILED." -ForegroundColor Red }
    }

    "install" {
        if (-not (Test-Admin)) { Write-Host "  ERROR: Run as Administrator!" -ForegroundColor Red; exit 1 }
        if (-not (Test-Path $ExePath)) { Write-Host "  ERROR: $ExePath not found." -ForegroundColor Red; exit 1 }
        sc.exe create $ServiceName binPath="$ExePath" start=auto displayName="MT5 Manager API Bridge"
        sc.exe description $ServiceName "REST API bridge for MT5 Manager API - Liberty Markets CRM"
        sc.exe failure $ServiceName reset=86400 actions=restart/5000/restart/10000/restart/30000
        Write-Host "  Service installed." -ForegroundColor Green
    }

    "uninstall" {
        if (-not (Test-Admin)) { Write-Host "  ERROR: Run as Administrator!" -ForegroundColor Red; exit 1 }
        sc.exe stop $ServiceName 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        sc.exe delete $ServiceName
        Write-Host "  Service removed." -ForegroundColor Green
    }

    "start" { sc.exe start $ServiceName }

    "stop" { sc.exe stop $ServiceName }

    "status" {
        sc.exe query $ServiceName
        Write-Host ""
        Write-Host "  Testing health..." -ForegroundColor Cyan
        try {
            $r = Invoke-RestMethod -Uri "https://localhost:6680/api/health" -SkipCertificateCheck -TimeoutSec 10
            $r | ConvertTo-Json -Depth 5 | Write-Host
        }
        catch { Write-Host "  Could not reach health endpoint: $_" -ForegroundColor Yellow }
    }

    "test" {
        Write-Host "  Testing MT5 Bridge endpoints..." -ForegroundColor Cyan
        $baseUrl = "https://localhost:6680"
        $headers = @{ "X-API-Key" = $ApiKey }

        Write-Host ""
        Write-Host "  [1/4] GET /api/health (no auth)" -ForegroundColor White
        try {
            $r = Invoke-RestMethod -Uri "$baseUrl/api/health" -SkipCertificateCheck -TimeoutSec 10
            $r | ConvertTo-Json -Depth 5 | Write-Host
        }
        catch { Write-Host "    FAIL: $_" -ForegroundColor Red }

        Write-Host ""
        Write-Host "  [2/4] GET /api/group/total" -ForegroundColor White
        try {
            $r = Invoke-RestMethod -Uri "$baseUrl/api/group/total" -Headers $headers -SkipCertificateCheck -TimeoutSec 10
            $r | ConvertTo-Json -Depth 5 | Write-Host
        }
        catch { Write-Host "    FAIL: $_" -ForegroundColor Red }

        Write-Host ""
        Write-Host "  [3/4] GET /api/group/getall" -ForegroundColor White
        try {
            $r = Invoke-RestMethod -Uri "$baseUrl/api/group/getall" -Headers $headers -SkipCertificateCheck -TimeoutSec 10
            $r | ConvertTo-Json -Depth 5 | Write-Host
        }
        catch { Write-Host "    FAIL: $_" -ForegroundColor Red }

        Write-Host ""
        Write-Host "  [4/4] GET /api/user/get?login=70001" -ForegroundColor White
        try {
            $r = Invoke-RestMethod -Uri "$baseUrl/api/user/get?login=70001" -Headers $headers -SkipCertificateCheck -TimeoutSec 10
            $r | ConvertTo-Json -Depth 5 | Write-Host
        }
        catch { Write-Host "    FAIL: $_" -ForegroundColor Red }

        Write-Host ""
        Write-Host "  Testing complete." -ForegroundColor Cyan
    }

    default {
        Write-Host ""
        Write-Host "  MT5 Bridge Service Manager" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Usage: .\install-service.ps1 -Action [action]" -ForegroundColor White
        Write-Host ""
        Write-Host "  deploy    - Full build + deploy (default)" -ForegroundColor White
        Write-Host "  build     - Build from source only" -ForegroundColor White
        Write-Host "  install   - Install as Windows Service" -ForegroundColor White
        Write-Host "  uninstall - Remove Windows Service" -ForegroundColor White
        Write-Host "  start     - Start the service" -ForegroundColor White
        Write-Host "  stop      - Stop the service" -ForegroundColor White
        Write-Host "  status    - Check status and health" -ForegroundColor White
        Write-Host "  test      - Test all API endpoints" -ForegroundColor White
    }
}

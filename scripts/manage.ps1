# HormuzWatch Backend — Windows Background Service Runner
# Usage:
#   .\scripts\manage.ps1 start          # Start all services in background
#   .\scripts\manage.ps1 stop           # Stop all services
#   .\scripts\manage.ps1 restart        # Restart all services
#   .\scripts\manage.ps1 status         # Show service status + health
#   .\scripts\manage.ps1 logs           # Tail logs
#   .\scripts\manage.ps1 build          # Rebuild Go binary
#   .\scripts\manage.ps1 tunnel-setup   # First-time Cloudflare Tunnel setup

param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "build", "tunnel-setup")]
    [string]$Command = "status"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ServerDir   = Join-Path $ProjectRoot "server"
$BuildDir    = Join-Path $ProjectRoot "build"
$DeployDir   = Join-Path $ProjectRoot "deploy"
$MlDir       = Join-Path $ProjectRoot "ml-service"
$PidFile     = Join-Path $BuildDir "server.pid"
$MlPidFile   = Join-Path $BuildDir "ml.pid"
$LogDir      = Join-Path $BuildDir "logs"

# Ensure directories exist
$null = New-Item -ItemType Directory -Force -Path $BuildDir, $DeployDir, $LogDir

# ── Ports ──────────────────────────────────────────────────
$ServerPort = if ($env:PORT) { $env:PORT } else { "10020" }
$MlPort     = if ($env:ML_PORT) { $env:ML_PORT } else { "8090" }

# ── Helper functions ───────────────────────────────────────

function Write-Step { param([string]$Text) Write-Host ">>> $Text" -ForegroundColor Cyan }

function Invoke-HealthCheck {
    param([int]$Port, [string]$Label, [int]$Retries = 3)
    for ($i = 0; $i -lt $Retries; $i++) {
        try {
            $r = Invoke-RestMethod -Uri "http://localhost:$Port/health" -TimeoutSec 5 -ErrorAction Stop
            Write-Host "  $Label : $($r.status) (port $Port)" -ForegroundColor Green
            return $true
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    Write-Host "  $Label : UNREACHABLE (port $Port)" -ForegroundColor Red
    return $false
}

function Invoke-MlHealthCheck {
    param([int]$Retries = 3)
    for ($i = 0; $i -lt $Retries; $i++) {
        try {
            $r = Invoke-RestMethod -Uri "http://localhost:$MlPort/health" -TimeoutSec 5 -ErrorAction Stop
            Write-Host "  ML Service : $($r.status) (port $MlPort)" -ForegroundColor Green
            return $true
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    Write-Host "  ML Service : UNREACHABLE (port $MlPort)" -ForegroundColor Red
    return $false
}

function Stop-ProcessByPidFile {
    param([string]$PidFilePath, [string]$Label)
    if (Test-Path $PidFilePath) {
        $pidVal = Get-Content $PidFilePath -ErrorAction SilentlyContinue
        if ($pidVal) {
            try {
                $proc = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
                if ($proc) {
                    $proc.Kill()
                    Write-Host "  Stopped $Label (PID $pidVal)" -ForegroundColor Yellow
                }
            } catch { }
        }
        Remove-Item $PidFilePath -Force -ErrorAction SilentlyContinue
    }
}

# ── Commands ───────────────────────────────────────────────

switch ($Command) {

    "build" {
        Write-Step "Building Go backend..."
        Push-Location $ServerDir
        try {
            go build -o "$BuildDir\hormuz-server.exe" ./cmd/...
            Copy-Item -Force "$BuildDir\hormuz-server.exe" "$DeployDir\hormuz-server.exe"
            Write-Host "  Build complete: $DeployDir\hormuz-server.exe" -ForegroundColor Green
        } finally { Pop-Location }
    }

    "start" {
        Write-Step "Starting HormuzWatch services..."

        # ── 1. Start Python ML Service ──────────────────────
        Write-Step "Python ML Service (gRPC on :$MlPort)..."
        $mlLog = Join-Path $LogDir "ml-service.log"
        $mlProc = Start-Process python -ArgumentList "ml_cli.py", "serve", "--port", $MlPort `
            -WorkingDirectory $MlDir -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $mlLog -RedirectStandardError $mlLog
        $mlProc.Id | Out-File $MlPidFile
        Write-Host "  Python ML PID: $($mlProc.Id)" -ForegroundColor Green
        Start-Sleep -Seconds 3

        # ── 2. Start Go Backend ─────────────────────────────
        Write-Step "Go Backend (REST on :$ServerPort)..."
        $serverLog = Join-Path $LogDir "server.log"
        $env:PORT = $ServerPort
        $serverProc = Start-Process "$DeployDir\hormuz-server.exe" `
            -WorkingDirectory $DeployDir -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $serverLog -RedirectStandardError $serverLog
        $serverProc.Id | Out-File $PidFile
        Write-Host "  Go Backend PID: $($serverProc.Id)" -ForegroundColor Green
        Start-Sleep -Seconds 5

        # ── 3. Health checks ────────────────────────────────
        Write-Step "Health checks..."
        $goHealthy = Invoke-HealthCheck -Port $ServerPort -Label "Go Backend"
        $mlHealthy = Invoke-MlHealthCheck

        if ($goHealthy -and $mlHealthy) {
            Write-Host "`n  ALL SERVICES HEALTHY" -ForegroundColor Green
        } else {
            Write-Host "`n  WARNING: Some services failed health check" -ForegroundColor Yellow
        }
    }

    "stop" {
        Write-Step "Stopping HormuzWatch services..."
        Stop-ProcessByPidFile -PidFilePath $PidFile -Label "Go Backend"
        Stop-ProcessByPidFile -PidFilePath $MlPidFile -Label "Python ML"
        Write-Host "  All services stopped" -ForegroundColor Green
    }

    "restart" {
        & $PSCommandPath stop
        Start-Sleep -Seconds 2
        & $PSCommandPath start
    }

    "status" {
        Write-Host "`n=== HormuzWatch Service Status ===" -ForegroundColor Cyan
        Write-Host "  Go Backend  : http://localhost:$ServerPort" -ForegroundColor White
        Write-Host "  Python ML   : http://localhost:$MlPort" -ForegroundColor White
        Write-Host "  Logs        : $LogDir" -ForegroundColor White
        Write-Host ""

        $goHealthy = Invoke-HealthCheck -Port $ServerPort -Label "Go Backend"
        $mlHealthy = Invoke-MlHealthCheck

        Write-Host ""
        if ($goHealthy -and $mlHealthy) {
            Write-Host "  OVERALL: HEALTHY" -ForegroundColor Green
        } elseif ($goHealthy -or $mlHealthy) {
            Write-Host "  OVERALL: DEGRADED" -ForegroundColor Yellow
        } else {
            Write-Host "  OVERALL: DOWN" -ForegroundColor Red
        }
    }

    "logs" {
        $serverLog = Join-Path $LogDir "server.log"
        $mlLog = Join-Path $LogDir "ml-service.log"
        Write-Step "Tailing logs (Ctrl+C to stop)..."
        if (Test-Path $serverLog) {
            Get-Content $serverLog -Tail 50
        }
        if (Test-Path $mlLog) {
            Get-Content $mlLog -Tail 20
        }
    }

    "tunnel-setup" {
        Write-Step "Cloudflare Tunnel Setup"
        Write-Host "  Prerequisites:" -ForegroundColor White
        Write-Host "  1. Install cloudflared: winget install Cloudflare.cloudflared" -ForegroundColor Gray
        Write-Host "  2. Login: cloudflared tunnel login" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  After login, create a tunnel:" -ForegroundColor White
        Write-Host "  cloudflared tunnel create hormuzwatch" -ForegroundColor Gray
        Write-Host "  cloudflared tunnel route dns hormuzwatch api.hormuzwatch.app" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Then start the tunnel:" -ForegroundColor White
        Write-Host "  cloudflared tunnel run --url http://localhost:$ServerPort hormuzwatch" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Or run as a service:" -ForegroundColor White
        Write-Host "  cloudflared service install" -ForegroundColor Gray
    }
}

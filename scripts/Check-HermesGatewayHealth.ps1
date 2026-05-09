$ErrorActionPreference = 'Continue'

$HermesHome = Join-Path $env:LOCALAPPDATA 'hermes'
$LogDir = Join-Path $HermesHome 'logs'
$StateDir = Join-Path $env:USERPROFILE '.local\state\hermes\gateway-locks'
$PidPath = Join-Path $HermesHome 'gateway.pid'
$StatePath = Join-Path $HermesHome 'gateway_state.json'
$HealthLog = Join-Path $LogDir 'gateway-health.log'
$TaskName = 'HermesGateway'

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Write-HealthLog {
  param([string]$Message)
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $HealthLog -Encoding UTF8 -Value "[$stamp] $Message"
}

function Get-HermesGatewayProcess {
  try {
    return Get-CimInstance Win32_Process -ErrorAction Stop |
      Where-Object {
        $_.CommandLine -and
        (
          $_.CommandLine -match 'hermes(\.exe)?[" ]+gateway[" ]+run' -or
          $_.CommandLine -match 'hermes-agent.*gateway.*run'
        )
      }
  } catch {
    Write-HealthLog "Failed to inspect gateway processes: $($_.Exception.Message)"
    return @()
  }
}

function Clear-StaleGatewayState {
  param([string]$Reason)
  Write-HealthLog "Clearing stale gateway state. reason=$Reason"
  Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
  Remove-Item $StatePath -Force -ErrorAction SilentlyContinue
  if (Test-Path $StateDir) {
    Remove-Item (Join-Path $StateDir '*.lock') -Force -ErrorAction SilentlyContinue
  }
}

function Restart-HermesGatewayTask {
  param([string]$Reason)
  Write-HealthLog "Restarting scheduled task $TaskName. reason=$Reason"
  try {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Clear-StaleGatewayState -Reason $Reason
    Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    Write-HealthLog "Scheduled task $TaskName start requested."
  } catch {
    Write-HealthLog "Failed to restart scheduled task ${TaskName}: $($_.Exception.Message)"
    throw
  }
}

$gatewayProcesses = @(Get-HermesGatewayProcess)
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$taskState = if ($task) { $task.State } else { 'Missing' }
$statePid = $null
$stateGatewayState = $null
$stateTelegramState = $null

if (Test-Path $StatePath) {
  try {
    $state = Get-Content $StatePath -Raw | ConvertFrom-Json
    if ($state.pid) {
      $statePid = [int]$state.pid
    }
    $stateGatewayState = $state.gateway_state
    $stateTelegramState = $state.platforms.telegram.state
  } catch {
    Write-HealthLog "Failed to read gateway state: $($_.Exception.Message)"
  }
}

$pids = ($gatewayProcesses | Select-Object -ExpandProperty ProcessId) -join ','
Write-HealthLog "Health check taskState=$taskState gatewayProcessCount=$($gatewayProcesses.Count) gatewayPids=[$pids] statePid=$statePid state=$stateGatewayState telegram=$stateTelegramState"

if (-not $task) {
  Write-HealthLog "Scheduled task $TaskName not found; cannot self-heal."
  exit 2
}

if ($gatewayProcesses.Count -eq 0) {
  Restart-HermesGatewayTask -Reason 'no gateway child process'
  exit 1
}

if ($statePid -and -not ($gatewayProcesses.ProcessId -contains $statePid)) {
  Clear-StaleGatewayState -Reason "state pid $statePid does not match live gateway process"
}

if ($task.State -ne 'Running') {
  Restart-HermesGatewayTask -Reason "scheduled task state is $($task.State)"
  exit 1
}

Write-HealthLog 'Gateway health check passed.'
exit 0

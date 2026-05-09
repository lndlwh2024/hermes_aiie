$ErrorActionPreference = 'Continue'

$HermesHome = Join-Path $env:LOCALAPPDATA 'hermes'
$LogDir = Join-Path $HermesHome 'logs'
$StateDir = Join-Path $env:USERPROFILE '.local\state\hermes\gateway-locks'
$PidPath = Join-Path $HermesHome 'gateway.pid'
$StatePath = Join-Path $HermesHome 'gateway_state.json'
$WrapperLog = Join-Path $LogDir 'gateway-wrapper.log'
$RestartBaseDelaySeconds = 10
$RestartMaxDelaySeconds = 60
$FastExitThresholdSeconds = 60

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Write-WrapperLog {
  param([string]$Message)
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $WrapperLog -Encoding UTF8 -Value "[$stamp] $Message"
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
    Write-WrapperLog "Failed to inspect gateway processes: $($_.Exception.Message)"
    return @()
  }
}

function Test-ProcessExists {
  param([int]$ProcessId)
  return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Stop-ExistingHermesGateway {
  $currentPid = $PID
  $candidates = @()

  try {
    $scriptName = Split-Path -Leaf $PSCommandPath
    Get-CimInstance Win32_Process -ErrorAction Stop |
      Where-Object {
        $_.ProcessId -ne $currentPid -and
        $_.CommandLine -and
        $_.CommandLine.Contains($scriptName)
      } |
      ForEach-Object {
        Write-WrapperLog "Stopping existing wrapper pid=$($_.ProcessId)"
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
      }
  } catch {
    Write-WrapperLog "Failed to inspect wrapper processes: $($_.Exception.Message)"
  }

  $candidates += (Get-HermesGatewayProcess | Where-Object { $_.ProcessId -ne $currentPid }).ProcessId

  if (Test-Path $PidPath) {
    try {
      $pidJson = Get-Content $PidPath -Raw | ConvertFrom-Json
      if ($pidJson.pid) {
        $candidates += [int]$pidJson.pid
      }
    } catch {
      Write-WrapperLog "Failed to read pid file: $($_.Exception.Message)"
    }
  }

  $candidates | Sort-Object -Unique | ForEach-Object {
    $targetPid = $_
    try {
      $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
      if ($proc) {
        Write-WrapperLog "Stopping existing gateway pid=$targetPid"
        Stop-Process -Id $targetPid -Force -ErrorAction Stop
      }
    } catch {
      Write-WrapperLog "Failed to stop pid=${targetPid}: $($_.Exception.Message)"
    }
  }
}

function Clear-HermesGatewayState {
  param([string]$Reason = 'unspecified')
  Write-WrapperLog "Clearing gateway state files. reason=$Reason"
  Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
  Remove-Item $StatePath -Force -ErrorAction SilentlyContinue

  if (Test-Path $StateDir) {
    Remove-Item (Join-Path $StateDir '*.lock') -Force -ErrorAction SilentlyContinue
  }
}

function Get-HermesCommand {
  try {
    return (Get-Command hermes -ErrorAction Stop).Source
  } catch {
    Write-WrapperLog "Unable to resolve hermes command: $($_.Exception.Message)"
    throw
  }
}

Write-WrapperLog 'Hermes Gateway wrapper starting.'
Stop-ExistingHermesGateway
Clear-HermesGatewayState -Reason 'wrapper startup'

$env:PYTHONIOENCODING = 'utf-8'
$consecutiveFastExits = 0

while ($true) {
  $startedAt = Get-Date
  $gatewayProcess = $null
  try {
    $hermesCommand = Get-HermesCommand
    Write-WrapperLog "Launching: hermes gateway run via $hermesCommand"
    $gatewayProcess = Start-Process -FilePath $hermesCommand -ArgumentList @('gateway', 'run') -NoNewWindow -PassThru
    Write-WrapperLog "Gateway child started pid=$($gatewayProcess.Id)"
    $gatewayProcess.WaitForExit()
    $exitCode = if ($null -ne $gatewayProcess.ExitCode) { $gatewayProcess.ExitCode } else { 'unknown' }
    $durationSeconds = [int]((Get-Date) - $startedAt).TotalSeconds

    if ($durationSeconds -lt $FastExitThresholdSeconds) {
      $consecutiveFastExits += 1
    } else {
      $consecutiveFastExits = 0
    }

    $delaySeconds = [Math]::Min(
      $RestartMaxDelaySeconds,
      $RestartBaseDelaySeconds * [Math]::Max(1, $consecutiveFastExits)
    )
    Write-WrapperLog "Gateway child exited pid=$($gatewayProcess.Id) code=$exitCode runtime=${durationSeconds}s consecutiveFastExits=$consecutiveFastExits restartIn=${delaySeconds}s"
  } catch {
    $consecutiveFastExits += 1
    $delaySeconds = [Math]::Min(
      $RestartMaxDelaySeconds,
      $RestartBaseDelaySeconds * [Math]::Max(1, $consecutiveFastExits)
    )
    Write-WrapperLog "Gateway launch/crash error: $($_.Exception.Message). consecutiveFastExits=$consecutiveFastExits restartIn=${delaySeconds}s"
  }

  if ($gatewayProcess -and (Test-ProcessExists -ProcessId $gatewayProcess.Id)) {
    Write-WrapperLog "Gateway pid=$($gatewayProcess.Id) still exists after exit path; stopping before restart."
    Stop-Process -Id $gatewayProcess.Id -Force -ErrorAction SilentlyContinue
  }

  Clear-HermesGatewayState -Reason 'before restart'
  Start-Sleep -Seconds $delaySeconds
}

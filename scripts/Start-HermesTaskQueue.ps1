$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $env:HERMES_QUEUE_HOST) {
  $env:HERMES_QUEUE_HOST = '127.0.0.1'
}

if (-not $env:HERMES_QUEUE_PORT) {
  $env:HERMES_QUEUE_PORT = '8787'
}

npm start

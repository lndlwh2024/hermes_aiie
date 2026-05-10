param(
  [string]$SourceRoot,
  [string]$RuntimeRoot,
  [string[]]$AllowedCategories = @('global', 'software-development'),
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

if (-not $SourceRoot) {
  $SourceRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'skills'
}

if (-not $RuntimeRoot) {
  $RuntimeRoot = Join-Path $env:LOCALAPPDATA 'hermes\skills'
}

function Write-Step {
  param([string]$Message)
  Write-Host "[Sync-HermesCustomSkills] $Message"
}

if (-not (Test-Path $SourceRoot)) {
  throw "Source skills root not found: $SourceRoot"
}

New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null

$blockedCategories = Get-ChildItem -Path $SourceRoot -Directory |
  Where-Object { $AllowedCategories -notcontains $_.Name } |
  Select-Object -ExpandProperty Name

if ($blockedCategories) {
  Write-Step "Skipping non-platform skill categories: $($blockedCategories -join ', ')"
}

foreach ($category in $AllowedCategories) {
  $sourceCategory = Join-Path $SourceRoot $category
  if (-not (Test-Path $sourceCategory)) {
    Write-Step "Allowed category not present, skipping: $category"
    continue
  }

  Get-ChildItem -Path $sourceCategory -Directory | ForEach-Object {
    $sourceSkill = $_.FullName
    $targetSkill = Join-Path (Join-Path $RuntimeRoot $category) $_.Name
    Write-Step "Syncing $category/$($_.Name)"

    if ($WhatIf) {
      Write-Step "WhatIf: would copy '$sourceSkill' -> '$targetSkill'"
      return
    }

    if (Test-Path $targetSkill) {
      Remove-Item -Path $targetSkill -Recurse -Force
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $targetSkill) -Force | Out-Null
    Copy-Item -Path $sourceSkill -Destination $targetSkill -Recurse -Force
  }
}

Write-Step "Done. Runtime root: $RuntimeRoot"

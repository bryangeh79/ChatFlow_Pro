param(
  [string]$Scenario = "all",
  [string]$Gate = "none"
)

$ErrorActionPreference = "Stop"

foreach ($arg in $args) {
  if ($arg -like "--scenario=*") {
    $Scenario = $arg.Substring("--scenario=".Length)
  }
  if ($arg -like "--gate=*") {
    $Gate = $arg.Substring("--gate=".Length)
  }
}

Write-Host "[acceptance-smoke] scenario=$Scenario"
Write-Host "[acceptance-smoke] gate=$Gate"

if ($Scenario -notin @("core","ops","workflow","all")) {
  throw "[acceptance-smoke] invalid scenario: $Scenario"
}
if ($Gate -notin @("none","install","upgrade","restore","delivery")) {
  throw "[acceptance-smoke] invalid gate: $Gate"
}

function Run-Step([string]$Name, [string]$ScriptPath) {
  Write-Host "`n[acceptance-smoke] step=$Name"
  powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptPath
  if ($LASTEXITCODE -ne 0) {
    throw "[acceptance-smoke] FAILED at $Name"
  }
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

switch ($Scenario) {
  "core" {
    Run-Step "phasea" (Join-Path $root "scripts\phasea-acceptance-curl.ps1")
  }
  "ops" {
    Run-Step "phaseb" (Join-Path $root "scripts\phaseb-acceptance-curl.ps1")
  }
  "workflow" {
    Run-Step "phasec" (Join-Path $root "scripts\phasec-acceptance-curl.ps1")
  }
  "all" {
    Run-Step "core" (Join-Path $root "scripts\phasea-acceptance-curl.ps1")
    Run-Step "ops" (Join-Path $root "scripts\phaseb-acceptance-curl.ps1")
    Run-Step "workflow" (Join-Path $root "scripts\phasec-acceptance-curl.ps1")
  }
}

switch ($Gate) {
  "none" {}
  "install" {
    if ($Scenario -ne "core") { throw "[acceptance-smoke] install gate requires scenario=core" }
  }
  "upgrade" {
    if ($Scenario -notin @("core", "ops", "all")) { throw "[acceptance-smoke] upgrade gate requires scenario=core|ops|all" }
  }
  "restore" {
    if ($Scenario -notin @("core", "workflow", "all")) { throw "[acceptance-smoke] restore gate requires scenario=core|workflow|all" }
  }
  "delivery" {
    if ($Scenario -ne "all") { throw "[acceptance-smoke] delivery gate requires scenario=all" }
  }
}

Write-Host "`n[acceptance-smoke] PASS"

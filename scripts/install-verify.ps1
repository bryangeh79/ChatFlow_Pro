param(
  [string]$BaseUrl = "http://127.0.0.1:3050"
)

$ErrorActionPreference = "Stop"

Write-Host "[install-verify] base_url=$BaseUrl"
powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\health-check-l1.ps1" -BaseUrl $BaseUrl
if ($LASTEXITCODE -ne 0) { throw "install-verify failed at L1" }

Write-Host "[install-verify] phase=postgres_readiness"
$readinessRaw = node "$PSScriptRoot\saas-db-postgres-readiness.mjs" --format json
if ($LASTEXITCODE -ne 0) { throw "install-verify failed: postgres readiness command failed" }
$readiness = $readinessRaw | ConvertFrom-Json
if (-not $readiness.readiness.postgres_client_runtime_wired) { throw "install-verify failed: postgres runtime not wired" }
if (-not $readiness.readiness.ledger_persistence_wired) { throw "install-verify failed: postgres ledger not ready" }
if (-not $readiness.readiness.execution_wired) { throw "install-verify failed: migration execution not wired" }

if ($env:ADMIN_TOKEN) {
  powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\health-check-l2.ps1" -BaseUrl $BaseUrl -AdminToken $env:ADMIN_TOKEN
  if ($LASTEXITCODE -ne 0) { throw "install-verify failed at L2" }
} else {
  Write-Host "[install-verify] ADMIN_TOKEN not set, L2 skipped"
}

Write-Host "[install-verify] PASS"

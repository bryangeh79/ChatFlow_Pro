param(
  [string]$DeployPath = "C:\chatflow-pro\deploy",
  [string]$BaseUrl = "http://127.0.0.1:3050",
  [string]$AdminToken = "$env:ADMIN_TOKEN",
  [switch]$RequirePreRollbackBaseline
)

$ErrorActionPreference = "Stop"

$stateFile = Join-Path (Join-Path $DeployPath ".state") "deployment-state.json"
if (-not (Test-Path $stateFile)) { throw "Missing deployment state: $stateFile" }

if ($RequirePreRollbackBaseline) {
  powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\acceptance-smoke.ps1" -Scenario core -Gate upgrade
  if ($LASTEXITCODE -ne 0) { throw "Pre-rollback baseline smoke failed" }
}

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
if (($state.PSObject.Properties.Name -notcontains "pre_rollback_baseline_core_passed") -or (-not [bool]$state.pre_rollback_baseline_core_passed)) {
  throw "Rollback verify failed: missing pre-rollback baseline core smoke evidence"
}
if ([string]$state.db_driver -ne "postgres") {
  throw "Rollback verify failed: deployment state db_driver is not postgres"
}
if ([string]$state.current_version -ne [string]$state.stable_version) {
  throw "Rollback verify failed: current version is not stable version"
}

powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\health-check-l1.ps1" -BaseUrl $BaseUrl
if ($LASTEXITCODE -ne 0) { throw "Rollback verify failed at L1" }
powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\health-check-l2.ps1" -BaseUrl $BaseUrl -AdminToken $AdminToken
if ($LASTEXITCODE -ne 0) { throw "Rollback verify failed at L2" }

$tmp = New-TemporaryFile
try {
  $authHeader = "Authorization: Bearer $AdminToken"
  $status = & curl.exe -sS -X GET -H $authHeader -H "Content-Type: application/json" -o $tmp.FullName -w "%{http_code}" "$($BaseUrl.TrimEnd('/'))/saas/v1/admin/platform/deployment-info"
  $raw = Get-Content $tmp.FullName -Raw
  if ([int]$status -ne 200) { throw "deployment-info read failed: $raw" }
  $payload = $raw | ConvertFrom-Json
  if (-not $payload.ok -or -not $payload.deployment_info) { throw "deployment-info payload invalid" }
  if (-not $payload.deployment_info.version) { throw "deployment-info version missing" }
  if ([string]$payload.deployment_info.version -ne [string]$state.current_version) {
    throw "deployment-info version mismatch: api=$($payload.deployment_info.version) state=$($state.current_version)"
  }
} finally {
  Remove-Item $tmp.FullName -Force -ErrorAction SilentlyContinue
}

Write-Host "[rollback-verify] PASS"

param(
  [string]$DeployPath = "C:\chatflow-pro\deploy",
  [string]$ReleaseRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$BaseUrl = "http://127.0.0.1:3050",
  [string]$AdminToken = "$env:ADMIN_TOKEN",
  [switch]$FullVerify
)

$ErrorActionPreference = "Stop"

$stateFile = Join-Path (Join-Path $DeployPath ".state") "deployment-state.json"
$manifestPath = Join-Path $ReleaseRoot "data\delivery-manifest.json"
if (-not (Test-Path $stateFile)) { throw "Missing deployment state: $stateFile" }
if (-not (Test-Path $manifestPath)) { throw "Missing manifest: $manifestPath" }

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
Write-Host "[upgrade-verify] current_version=$($state.current_version)"
Write-Host "[upgrade-verify] target_version=$($manifest.version)"
Write-Host "[upgrade-verify] deploy_path=$DeployPath"

if ([string]$state.current_version -ne [string]$manifest.version) {
  throw "Upgrade verify failed: current version != delivery-manifest version"
}

$planRaw = node "$PSScriptRoot\saas-db-migration-plan.mjs" --format json
if ($LASTEXITCODE -ne 0) { throw "Migration plan command failed" }
$plan = $planRaw | ConvertFrom-Json
$target = [string]$manifest.migration_target
$hit = $false
foreach ($m in $plan.planned_migrations) {
  if ([string]$m.id -eq $target) { $hit = $true; break }
}
if (-not $hit) {
  throw "Migration target not found in plan: $target"
}
$readinessRaw = node "$PSScriptRoot\saas-db-postgres-readiness.mjs" --format json
if ($LASTEXITCODE -ne 0) { throw "Postgres readiness command failed" }
$readiness = $readinessRaw | ConvertFrom-Json
if (-not $readiness.readiness.execution_wired) { throw "Upgrade verify failed: execution_wired=false" }

powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\health-check-l1.ps1" -BaseUrl $BaseUrl
if ($LASTEXITCODE -ne 0) { throw "Upgrade verify failed at L1" }
powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\health-check-l2.ps1" -BaseUrl $BaseUrl -AdminToken $AdminToken
if ($LASTEXITCODE -ne 0) { throw "Upgrade verify failed at L2" }

powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\acceptance-smoke.ps1" -Scenario core -Gate upgrade
if ($LASTEXITCODE -ne 0) { throw "Upgrade verify failed at core smoke" }

if ($FullVerify) {
  powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\acceptance-smoke.ps1" -Scenario ops -Gate upgrade
  if ($LASTEXITCODE -ne 0) { throw "Upgrade verify failed at ops smoke" }
  powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\acceptance-smoke.ps1" -Scenario workflow -Gate upgrade
  if ($LASTEXITCODE -ne 0) { throw "Upgrade verify failed at workflow smoke" }
}

$state.stable_version = [string]$state.current_version
$state | Add-Member -NotePropertyName "pre_rollback_baseline_core_passed" -NotePropertyValue $true -Force
$state | Add-Member -NotePropertyName "pre_rollback_baseline_checked_at" -NotePropertyValue ((Get-Date).ToUniversalTime().ToString("o")) -Force
$state | Add-Member -NotePropertyName "last_upgrade_verified_at" -NotePropertyValue ((Get-Date).ToUniversalTime().ToString("o")) -Force
$state | ConvertTo-Json -Depth 10 | Set-Content -Path $stateFile -Encoding UTF8

Write-Host "[upgrade-verify] PASS"

param(
  [string]$DeployPath = "C:\chatflow-pro\deploy",
  [string]$TargetVersion = ""
)

$ErrorActionPreference = "Stop"

$stateFile = Join-Path (Join-Path $DeployPath ".state") "deployment-state.json"
if (-not (Test-Path $stateFile)) {
  throw "No deployment state found: $stateFile"
}

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
$currentVersion = [string]$state.current_version
$stableVersion = [string]$state.stable_version
$requestedTarget = if ($TargetVersion) { $TargetVersion } else { $stableVersion }
$dbDriver = if ($env:CHATFLOW_SAAS_DB_DRIVER) { $env:CHATFLOW_SAAS_DB_DRIVER.Trim().ToLower() } else { "postgres" }

Write-Host "[rollback] current_version=$currentVersion"
Write-Host "[rollback] target_version=$requestedTarget"
Write-Host "[rollback] deploy_path=$DeployPath"
Write-Host "[rollback] db_driver=$dbDriver"

if (-not $stableVersion) {
  throw "No stable version recorded. Rollback is not allowed."
}
if ($requestedTarget -ne $stableVersion) {
  throw "Rollback allowed only to latest verified stable version: $stableVersion"
}
if ($currentVersion -eq $stableVersion) {
  Write-Host "[rollback] already at stable version, safe no-op exit"
  exit 0
}
if ($dbDriver -ne "postgres") {
  throw "D-B1 rollback path expects postgres default chain."
}
$rollbackCommand = if ($env:CHATFLOW_PG_ROLLBACK_COMMAND) { $env:CHATFLOW_PG_ROLLBACK_COMMAND.Trim() } else { "" }
if (-not $rollbackCommand) {
  throw "Missing CHATFLOW_PG_ROLLBACK_COMMAND. Rollback requires explicit Postgres restore command."
}
Write-Host "[rollback] phase=postgres_restore"
Invoke-Expression $rollbackCommand
if ($LASTEXITCODE -ne 0) { throw "postgres restore command failed" }

$state.last_rollback_at = (Get-Date).ToUniversalTime().ToString("o")
$state.last_rollback_from = $currentVersion
$state.current_version = $stableVersion
$state.db_driver = "postgres"
$state.db_single_write_source = "postgres"
$state | ConvertTo-Json -Depth 8 | Set-Content -Path $stateFile -Encoding UTF8

Write-Host "[rollback] OK"

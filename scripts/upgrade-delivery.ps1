param(
  [string]$DeployPath = "C:\chatflow-pro\deploy",
  [string]$ReleaseRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$stateFile = Join-Path (Join-Path $DeployPath ".state") "deployment-state.json"
$manifestPath = Join-Path $ReleaseRoot "data\delivery-manifest.json"

if (-not (Test-Path $stateFile)) {
  throw "No existing install detected. Use install-delivery.ps1 first."
}
if (-not (Test-Path $manifestPath)) {
  throw "Missing manifest: $manifestPath (run: npm run delivery:manifest)"
}

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$currentVersion = [string]$state.current_version
$targetVersion = [string]$manifest.version
$dbDriver = if ($env:CHATFLOW_SAAS_DB_DRIVER) { $env:CHATFLOW_SAAS_DB_DRIVER.Trim().ToLower() } else { "postgres" }

Write-Host "[upgrade] current_version=$currentVersion"
Write-Host "[upgrade] target_version=$targetVersion"
Write-Host "[upgrade] deploy_path=$DeployPath"
Write-Host "[upgrade] db_driver=$dbDriver"

if ($currentVersion -eq $targetVersion) {
  Write-Host "[upgrade] same version detected, safe no-op exit"
  exit 0
}
if ($dbDriver -ne "postgres") {
  throw "D-B1 requires db_driver=postgres on upgrade default chain."
}
if (-not $env:CHATFLOW_SAAS_POSTGRES_URL) {
  throw "Missing CHATFLOW_SAAS_POSTGRES_URL for Postgres upgrade."
}
if (-not $state.last_pg_backup_ref) {
  Write-Host "[upgrade] WARN: last_pg_backup_ref not found in state (rollback safety reduced)"
}

try {
  $env:CHATFLOW_SAAS_MIGRATION_IN_PROGRESS = "1"
  node "$PSScriptRoot\saas-db-migration-bootstrap.mjs" --mode=apply
  if ($LASTEXITCODE -ne 0) { throw "upgrade migration apply failed" }
} finally {
  $env:CHATFLOW_SAAS_MIGRATION_IN_PROGRESS = "0"
}

$state.last_upgrade_attempt_at = (Get-Date).ToUniversalTime().ToString("o")
$state.last_upgrade_from = $currentVersion
$state.current_version = $targetVersion
$state.db_driver = "postgres"
$state.db_single_write_source = "postgres"
$state | ConvertTo-Json -Depth 8 | Set-Content -Path $stateFile -Encoding UTF8

Write-Host "[upgrade] OK"

param(
  [string]$DeployPath = "C:\chatflow-pro\deploy",
  [string]$ReleaseRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$stateDir = Join-Path $DeployPath ".state"
$stateFile = Join-Path $stateDir "deployment-state.json"
$manifestPath = Join-Path $ReleaseRoot "data\delivery-manifest.json"

if (-not (Test-Path $manifestPath)) {
  throw "Missing manifest: $manifestPath (run: npm run delivery:manifest)"
}
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$currentVersion = if (Test-Path $stateFile) { (Get-Content $stateFile -Raw | ConvertFrom-Json).current_version } else { "<none>" }
$targetVersion = [string]$manifest.version
$dbDriver = if ($env:CHATFLOW_SAAS_DB_DRIVER) { $env:CHATFLOW_SAAS_DB_DRIVER.Trim().ToLower() } else { "postgres" }

Write-Host "[install] current_version=$currentVersion"
Write-Host "[install] target_version=$targetVersion"
Write-Host "[install] deploy_path=$DeployPath"
Write-Host "[install] db_driver=$dbDriver"

if (Test-Path $stateFile) {
  throw "Install is for fresh environment only. Existing install detected. Use upgrade-delivery.ps1"
}
if ($dbDriver -ne "postgres") {
  throw "D-B1 requires default live db_driver=postgres for delivery install."
}
if (-not $env:CHATFLOW_SAAS_POSTGRES_URL) {
  throw "Missing CHATFLOW_SAAS_POSTGRES_URL for Postgres default chain install."
}
$pgClientGate = if ($env:CHATFLOW_SAAS_POSTGRES_CLIENT) { $env:CHATFLOW_SAAS_POSTGRES_CLIENT.Trim() } else { "" }
if ($pgClientGate -ne "1") {
  throw "CHATFLOW_SAAS_POSTGRES_CLIENT must be 1 for Postgres default chain install."
}

New-Item -ItemType Directory -Force -Path $DeployPath, $stateDir | Out-Null
try {
  $env:CHATFLOW_SAAS_MIGRATION_IN_PROGRESS = "1"
  node "$PSScriptRoot\saas-db-migration-bootstrap.mjs" --mode=apply
  if ($LASTEXITCODE -ne 0) { throw "install migration apply failed" }
} finally {
  $env:CHATFLOW_SAAS_MIGRATION_IN_PROGRESS = "0"
}

$snapshot = [ordered]@{
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  current_version = $targetVersion
  stable_version = $targetVersion
  release_root = $ReleaseRoot
  db_driver = "postgres"
  db_single_write_source = "postgres"
}
$snapshot | ConvertTo-Json -Depth 5 | Set-Content -Path $stateFile -Encoding UTF8

Write-Host "[install] OK"

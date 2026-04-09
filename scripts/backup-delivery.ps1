$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackupRoot = Join-Path $projectRoot "backups\delivery"
$DbPath = "$env:CHATFLOW_SAAS_DB_PATH"
$dbDriver = if ($env:CHATFLOW_SAAS_DB_DRIVER) { $env:CHATFLOW_SAAS_DB_DRIVER.Trim().ToLower() } else { "postgres" }
foreach ($arg in $args) {
  if ($arg -like "--backup-root=*") { $BackupRoot = $arg.Substring("--backup-root=".Length) }
  if ($arg -like "--db-path=*") { $DbPath = $arg.Substring("--db-path=".Length) }
}

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupDir = Join-Path $BackupRoot ("delivery-backup-" + $stamp)
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$dbBackupFile = ""
if ($dbDriver -eq "postgres") {
  $pgDumpCommand = if ($env:CHATFLOW_PG_DUMP_COMMAND) { $env:CHATFLOW_PG_DUMP_COMMAND.Trim() } else { "" }
  if (-not $pgDumpCommand) {
    throw "Missing CHATFLOW_PG_DUMP_COMMAND for postgres backup."
  }
  $dbBackupFile = Join-Path $backupDir "chatflow-saas.pg.dump"
  $cmd = $pgDumpCommand.Replace("{out}", $dbBackupFile)
  Invoke-Expression $cmd
  if ($LASTEXITCODE -ne 0) { throw "Postgres dump command failed" }
} else {
  if (-not $DbPath) { $DbPath = Join-Path $projectRoot "data\chatflow-saas.sqlite" }
  if (-not (Test-Path $DbPath)) { throw "DB file not found: $DbPath" }
  $dbBackupFile = Join-Path $backupDir "chatflow-saas.sqlite.bak"
  Copy-Item -Path $DbPath -Destination $dbBackupFile -Force
}

node "$PSScriptRoot\build-verification-snapshot.mjs" $backupDir
if ($LASTEXITCODE -ne 0) { throw "Failed to generate verification snapshots" }

$snapshotPath = Join-Path $backupDir "verification_snapshot.json"
$redactedPath = Join-Path $backupDir "redacted_config_snapshot.json"
if (-not (Test-Path $snapshotPath)) { throw "Missing verification_snapshot.json" }
if (-not (Test-Path $redactedPath)) { throw "Missing redacted_config_snapshot.json" }

$manifestPath = Join-Path $projectRoot "data\delivery-manifest.json"
$manifest = if (Test-Path $manifestPath) { Get-Content $manifestPath -Raw | ConvertFrom-Json } else { $null }
$snapshot = Get-Content $snapshotPath -Raw | ConvertFrom-Json
$dbHash = (Get-FileHash -Path $dbBackupFile -Algorithm SHA256).Hash.ToLower()

$backupManifest = [ordered]@{
  created_at = (Get-Date).ToUniversalTime().ToString("o")
  backup_dir = $backupDir
  db_source_path = if ($dbDriver -eq "postgres") { "postgres" } else { $DbPath }
  db_backup_file = $dbBackupFile
  db_backup_sha256 = $dbHash
  db_driver = $dbDriver
  version = if ($manifest) { [string]$manifest.version } else { [string]$snapshot.version }
  tenant_count = [int]$snapshot.counts.tenants
  counts = $snapshot.counts
  artifacts = [ordered]@{
    backup_manifest = "backup_manifest.json"
    verification_snapshot = "verification_snapshot.json"
    redacted_config_snapshot = "redacted_config_snapshot.json"
    db_backup_file = [System.IO.Path]::GetFileName($dbBackupFile)
  }
}

$backupManifest | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $backupDir "backup_manifest.json") -Encoding UTF8

Write-Host "[backup] backup_dir=$backupDir"
Write-Host "[backup] version=$($backupManifest.version)"
Write-Host "[backup] tenant_count=$($backupManifest.tenant_count)"
Write-Host "[backup] db_backup_sha256=$dbHash"
Write-Host "[backup] PASS"

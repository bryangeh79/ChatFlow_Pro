param(
  [string]$BackupPath = "",
  [string]$DbPath = "$env:CHATFLOW_SAAS_DB_PATH",
  [string]$StopCommand = "",
  [string]$StartCommand = ""
)

$ErrorActionPreference = "Stop"

foreach ($arg in $args) {
  if ($arg -like "--backup=*") { $BackupPath = $arg.Substring("--backup=".Length) }
  if ($arg -like "--stop-command=*") { $StopCommand = $arg.Substring("--stop-command=".Length) }
  if ($arg -like "--start-command=*") { $StartCommand = $arg.Substring("--start-command=".Length) }
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $DbPath) { $DbPath = Join-Path $projectRoot "data\chatflow-saas.sqlite" }
if (-not $BackupPath) { throw "Missing backup path. Use -BackupPath or --backup=<path>" }
if (-not (Test-Path $BackupPath)) { throw "Backup path not found: $BackupPath" }
if (-not $StopCommand -or -not $StartCommand) {
  throw "restore-delivery requires both -StopCommand and -StartCommand to enforce fixed flow."
}

$backupManifestPath = Join-Path $BackupPath "backup_manifest.json"
$snapshotPath = Join-Path $BackupPath "verification_snapshot.json"
$redactedPath = Join-Path $BackupPath "redacted_config_snapshot.json"
if (-not (Test-Path $backupManifestPath)) { throw "Missing backup_manifest.json in backup path." }
if (-not (Test-Path $snapshotPath)) { throw "Missing verification_snapshot.json in backup path." }
if (-not (Test-Path $redactedPath)) { throw "Missing redacted_config_snapshot.json in backup path." }
$backupManifest = Get-Content $backupManifestPath -Raw | ConvertFrom-Json
$dbDriver = if ($env:CHATFLOW_SAAS_DB_DRIVER) { $env:CHATFLOW_SAAS_DB_DRIVER.Trim().ToLower() } else { "postgres" }

$dbBackup = if ($dbDriver -eq "postgres") {
  Get-ChildItem -Path $BackupPath -Filter "*.pg.dump" | Select-Object -First 1
} else {
  Get-ChildItem -Path $BackupPath -Filter "*.sqlite.bak" | Select-Object -First 1
}
if (-not $dbBackup) { throw "Missing DB backup artifact in backup path for db_driver=$dbDriver." }

Write-Host "[restore] phase=stop_service"
try {
  Invoke-Expression $StopCommand
} catch {
  throw "Stop service command failed: $($_.Exception.Message)"
}

if ($dbDriver -eq "postgres") {
  $pgRestoreCommand = if ($env:CHATFLOW_PG_RESTORE_COMMAND) { $env:CHATFLOW_PG_RESTORE_COMMAND.Trim() } else { "" }
  if (-not $pgRestoreCommand) {
    throw "Missing CHATFLOW_PG_RESTORE_COMMAND for postgres restore."
  }
  Write-Host "[restore] phase=restore_db_postgres from=$($dbBackup.FullName)"
  $restoreCmd = $pgRestoreCommand.Replace("{in}", $dbBackup.FullName)
  Invoke-Expression $restoreCmd
  if ($LASTEXITCODE -ne 0) { throw "Postgres restore command failed" }
} else {
  Write-Host "[restore] phase=restore_db from=$($dbBackup.FullName) to=$DbPath"
  New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($DbPath)) | Out-Null
  Copy-Item -Path $dbBackup.FullName -Destination $DbPath -Force
}

Write-Host "[restore] phase=restore_non_sensitive_config"
$redacted = Get-Content $redactedPath -Raw | ConvertFrom-Json
$restoredConfigPath = Join-Path $projectRoot "data\restored-redacted-config.json"
$redacted | ConvertTo-Json -Depth 10 | Set-Content -Path $restoredConfigPath -Encoding UTF8

$restoreState = [ordered]@{
  restored_at = (Get-Date).ToUniversalTime().ToString("o")
  backup_path = (Resolve-Path $BackupPath).Path
  restored_db = if ($dbDriver -eq "postgres") { "postgres" } else { $DbPath }
  db_driver = $dbDriver
  backup_manifest_db_driver = [string]$backupManifest.db_driver
  restored_redacted_config = $restoredConfigPath
}
$restoreState | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $projectRoot "data\restore-state.json") -Encoding UTF8

Write-Host "[restore] phase=start_service"
try {
  Invoke-Expression $StartCommand
} catch {
  throw "Start service command failed: $($_.Exception.Message)"
}

Write-Host "[restore] NOTE: Secrets were NOT restored automatically."
Write-Host "[restore] ACTION: Manually re-inject secrets from external secure storage."
Write-Host "[restore] PASS"

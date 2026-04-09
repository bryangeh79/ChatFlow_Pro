param(
  [string]$BaseUrl = "http://127.0.0.1:3050",
  [string]$AdminToken = "$env:ADMIN_TOKEN",
  [string]$BackupPath = "",
  [string]$StopCommand = "",
  [string]$StartCommand = "",
  [switch]$SkipRollback
)

$ErrorActionPreference = "Stop"

function Run-Step([string]$Name, [scriptblock]$Action) {
  Write-Host "`n[phaseda] step=$Name"
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "[phaseda] FAIL at $Name. Action: retry / rollback / manual intervention." }
}

if (-not $AdminToken) { throw "Missing ADMIN_TOKEN" }
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$auth = "Authorization: Bearer $AdminToken"

Run-Step "build" { npm run build }
Run-Step "manifest" { npm run delivery:manifest }
Run-Step "snapshot" { npm run delivery:verify:snapshot }
Run-Step "deployment-info" {
  $tmp = New-TemporaryFile
  try {
    $status = & curl.exe -sS -X GET -H $auth -H "Content-Type: application/json" -o $tmp.FullName -w "%{http_code}" "$($BaseUrl.TrimEnd('/'))/saas/v1/admin/platform/deployment-info"
    $raw = Get-Content $tmp.FullName -Raw
    if ([int]$status -ne 200) { throw "deployment-info read failed: $raw" }
    $json = $raw | ConvertFrom-Json
    if (-not $json.ok -or -not $json.deployment_info.version) { throw "deployment-info payload invalid" }
  } finally {
    Remove-Item $tmp.FullName -Force -ErrorAction SilentlyContinue
  }
}
Run-Step "health-l1" { npm run delivery:health:l1 }
Run-Step "health-l2" { npm run delivery:health:l2 }
Run-Step "smoke-core" { npm run delivery:smoke -- --scenario=core --gate=install }
Run-Step "smoke-ops" { npm run delivery:smoke -- --scenario=ops --gate=upgrade }
Run-Step "smoke-workflow" { npm run delivery:smoke -- --scenario=workflow --gate=restore }

if (-not $BackupPath) {
  Run-Step "backup" { npm run delivery:backup }
  $latest = Get-ChildItem -Path (Join-Path $root "backups\delivery") -Directory | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  if (-not $latest) { throw "No backup directory found after backup step." }
  $BackupPath = $latest.FullName
} else {
  Run-Step "backup-artifact-check" {
    if (-not (Test-Path (Join-Path $BackupPath "backup_manifest.json"))) { throw "Missing backup_manifest.json" }
    if (-not (Test-Path (Join-Path $BackupPath "verification_snapshot.json"))) { throw "Missing verification_snapshot.json" }
    if (-not (Test-Path (Join-Path $BackupPath "redacted_config_snapshot.json"))) { throw "Missing redacted_config_snapshot.json" }
  }
}

if ($StopCommand -and $StartCommand) {
  Run-Step "restore" { npm run delivery:restore -- --backup="$BackupPath" --stop-command="$StopCommand" --start-command="$StartCommand" }
  Run-Step "restore-verify" { npm run delivery:restore:verify -- --backup="$BackupPath" }
} else {
  Write-Host "[phaseda] restore skipped: provide StopCommand + StartCommand for full drill."
}

Run-Step "upgrade-verify" { npm run delivery:upgrade:verify }
if (-not $SkipRollback) {
  Run-Step "rollback-verify" { npm run delivery:rollback:verify }
}

Write-Host "`n[phaseda] PASS"
exit 0

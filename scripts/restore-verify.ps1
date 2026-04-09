param(
  [string]$BackupPath = "",
  [string]$BaseUrl = "http://127.0.0.1:3050",
  [string]$AdminToken = "",
  [string]$TenantId = "$env:TENANT_ID"
)

$ErrorActionPreference = "Stop"

foreach ($arg in $args) {
  if ($arg -like "--backup=*") { $BackupPath = $arg.Substring("--backup=".Length) }
}

if (-not $AdminToken) {
  $AdminToken = if ($env:CHATFLOW_SAAS_ADMIN_TOKEN) { $env:CHATFLOW_SAAS_ADMIN_TOKEN } else { $env:ADMIN_TOKEN }
}
if (-not $AdminToken) {
  throw "Missing admin token for restore-verify (ADMIN_TOKEN or CHATFLOW_SAAS_ADMIN_TOKEN)"
}

if (-not $BackupPath) { throw "Missing backup path. Use -BackupPath or --backup=<path>" }
if (-not (Test-Path $BackupPath)) { throw "Backup path not found: $BackupPath" }
$snapshotPath = Join-Path $BackupPath "verification_snapshot.json"
if (-not (Test-Path $snapshotPath)) { throw "Missing verification_snapshot.json in backup path." }
$backupManifestPath = Join-Path $BackupPath "backup_manifest.json"
if (-not (Test-Path $backupManifestPath)) { throw "Missing backup_manifest.json in backup path." }
$backupManifest = Get-Content $backupManifestPath -Raw | ConvertFrom-Json
if ([string]$backupManifest.db_driver -ne "postgres") {
  throw "restore-verify requires postgres backup manifest for D-B1 default chain"
}

Write-Host "[restore-verify] phase=health_l1"
powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\health-check-l1.ps1" -BaseUrl $BaseUrl
if ($LASTEXITCODE -ne 0) { throw "restore-verify failed at health L1" }

Write-Host "[restore-verify] phase=health_l2"
powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\health-check-l2.ps1" -BaseUrl $BaseUrl -AdminToken $AdminToken
if ($LASTEXITCODE -ne 0) { throw "restore-verify failed at health L2" }

Write-Host "[restore-verify] phase=count_match"
$expected = Get-Content $snapshotPath -Raw | ConvertFrom-Json
$liveJson = node "$PSScriptRoot\read-live-counts.mjs"
if ($LASTEXITCODE -ne 0) { throw "Failed reading live counts" }
$live = $liveJson | ConvertFrom-Json

$keys = @("tenants", "knowledge_entries", "conversations", "leads")
foreach ($k in $keys) {
  if ([int]$expected.counts.$k -ne [int]$live.counts.$k) {
    throw "Count mismatch: $k expected=$($expected.counts.$k) live=$($live.counts.$k)"
  }
}

function Invoke-Get([string]$Url, [string]$AuthHeader) {
  $tmp = New-TemporaryFile
  try {
    $status = & curl.exe -sS -X GET -H $AuthHeader -H "Content-Type: application/json" -o $tmp.FullName -w "%{http_code}" $Url
    $raw = Get-Content $tmp.FullName -Raw
    return @{ status = [int]$status; raw = $raw; json = ($raw | ConvertFrom-Json) }
  } finally {
    Remove-Item $tmp.FullName -Force -ErrorAction SilentlyContinue
  }
}

$authHeader = "Authorization: Bearer $AdminToken"
$base = $BaseUrl.TrimEnd("/")
$expectedTenantCount = [int]$expected.counts.tenants

if (-not $TenantId) {
  $idx = Invoke-Get "$base/saas/v1/admin/platform/tenants-index" $authHeader
  if ($idx.status -eq 200 -and $idx.json.ok -and $idx.json.tenants -and $idx.json.tenants.Count -ge 1) {
    $TenantId = [string]$idx.json.tenants[0].tenant_id
  } elseif ($expectedTenantCount -eq 0) {
    Write-Host "[restore-verify] phase=sample_read skipped (zero-tenant snapshot)"
    Write-Host "[restore-verify] PASS"
    exit 0
  } else {
    throw "Cannot resolve tenant for sample read check."
  }
}

Write-Host "[restore-verify] phase=sample_read tenant=$TenantId"
$k = Invoke-Get "$base/saas/v1/admin/platform/tenants/$TenantId/knowledge?offset=0&limit=1" $authHeader
if ($k.status -ne 200 -or -not $k.json.ok) { throw "Sample read failed: knowledge" }

$c = Invoke-Get "$base/saas/v1/admin/platform/tenants/$TenantId/conversations?offset=0&limit=1" $authHeader
if ($c.status -ne 200 -or -not $c.json.ok) { throw "Sample read failed: conversations" }

$l = Invoke-Get "$base/saas/v1/admin/platform/tenants/$TenantId/leads?offset=0&limit=1" $authHeader
if ($l.status -ne 200 -or -not $l.json.ok) { throw "Sample read failed: leads" }

Write-Host "[restore-verify] PASS"

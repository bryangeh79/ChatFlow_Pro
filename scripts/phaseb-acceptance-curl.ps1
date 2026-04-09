$ErrorActionPreference = "Stop"

if (-not $env:BASE_URL) { $env:BASE_URL = "http://127.0.0.1:3050" }
if (-not $env:ADMIN_TOKEN) { throw "Missing ADMIN_TOKEN env" }
if (-not $env:TENANT_ID) { throw "Missing TENANT_ID env" }

$Base = $env:BASE_URL.TrimEnd("/")
$TenantBase = "$Base/saas/v1/admin/platform/tenants/$($env:TENANT_ID)"
$Auth = "Authorization: Bearer $($env:ADMIN_TOKEN)"
$Json = "Content-Type: application/json"

function Invoke-Api([string]$Method, [string]$Url, [string]$Body = "") {
  $tmp = New-TemporaryFile
  $tmpBody = $null
  try {
    $args = @("-sS", "-X", $Method, "-H", $Auth, "-H", $Json, "-o", $tmp.FullName, "-w", "%{http_code}", $Url)
    if ($Body -ne "") {
      $tmpBody = New-TemporaryFile
      Set-Content -Path $tmpBody.FullName -Value $Body -NoNewline
      $args += @("--data-binary", "@$($tmpBody.FullName)")
    }
    $status = & curl.exe @args
    $raw = Get-Content $tmp.FullName -Raw
    $json = $null
    if ($raw -and $raw.Trim().StartsWith("{")) { $json = $raw | ConvertFrom-Json }
    return @{ status = [int]$status; raw = $raw; json = $json }
  } finally {
    if ($tmpBody) { Remove-Item $tmpBody.FullName -Force -ErrorAction SilentlyContinue }
    Remove-Item $tmp.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Assert([bool]$Ok, [string]$Message) {
  if (-not $Ok) { throw "ASSERT FAILED: $Message" }
}

Write-Host "`n[1] knowledge upsert/enable-disable/list"
$import = '{"entries":[{"question":"phaseb-q1","answer":"phaseb-a1","category":"ops","language":"en"},{"question":"phaseb-q2","answer":"phaseb-a2","category":"ops","language":"en","is_active":false}]}'
$r1 = Invoke-Api "POST" "$TenantBase/knowledge/import" $import
Assert ($r1.status -eq 200) "knowledge import status"
Assert ($r1.json.ok -eq $true) "knowledge import ok"

$r2 = Invoke-Api "GET" "$TenantBase/knowledge"
Assert ($r2.status -eq 200) "knowledge get status"
Assert ($r2.json.status_cards.total_entries -ge 2) "knowledge total >= 2"
$entry = $r2.json.entries | Where-Object { $_.question -eq "phaseb-q2" } | Select-Object -First 1
Assert ($null -ne $entry) "phaseb-q2 exists"

$r3 = Invoke-Api "POST" "$TenantBase/knowledge/$($entry.id)/enable" "{}"
Assert ($r3.status -eq 200) "knowledge enable status"
$r4 = Invoke-Api "GET" "$TenantBase/knowledge"
$entryEnabled = $r4.json.entries | Where-Object { $_.id -eq $entry.id } | Select-Object -First 1
Assert ($entryEnabled.is_active -eq $true) "knowledge enable writeback"

Write-Host "`n[2] activity timeline"
$r5 = Invoke-Api "GET" "$TenantBase/activity?limit=20&offset=0"
Assert ($r5.status -eq 200) "activity status"
Assert ($r5.json.ok -eq $true) "activity ok=true"
Assert ($null -ne $r5.json.entries) "activity entries exists"

Write-Host "`n[3] platform settings + logs"
$settingsBody = '{"settings":{"knowledge_ready_threshold":"1","latest_test_freshness_days":"7","go_live_warning_error_window_hours":"24"}}'
$r6 = Invoke-Api "PUT" "$Base/saas/v1/admin/platform/settings" $settingsBody
Assert ($r6.status -eq 200) "platform settings save status"

$r7 = Invoke-Api "GET" "$Base/saas/v1/admin/platform/settings"
Assert ($r7.status -eq 200) "platform settings get status"
Assert ($r7.json.settings.knowledge_ready_threshold -eq "1") "settings writeback"

$r8 = Invoke-Api "GET" "$Base/saas/v1/admin/platform/logs?severity=info&limit=20&offset=0"
Assert ($r8.status -eq 200) "platform logs status"
Assert ($r8.json.ok -eq $true) "platform logs ok=true"

Write-Host "`n[4] suspend/activate lifecycle guards"
$r9 = Invoke-Api "POST" "$TenantBase/suspend" "{}"
Assert ($r9.status -eq 200) "suspend status"
$r10 = Invoke-Api "POST" "$TenantBase/channels/website/test-widget" "{}"
Assert ($r10.status -eq 409) "suspended blocks test"
Assert ($r10.json.error -eq "tenant_suspended") "suspended error code"

$r11 = Invoke-Api "POST" "$TenantBase/activate" "{}"
Assert ($r11.status -eq 200) "activate status"

Write-Host "`n[PASS] Phase B acceptance checks passed."

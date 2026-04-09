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

Write-Host "`n[1] tenants-index"
$r = Invoke-Api "GET" "$Base/saas/v1/admin/platform/tenants-index"
Assert ($r.status -eq 200) "tenants-index status"
Assert ($r.json.ok -eq $true) "tenants-index ok=true"
$tenant = $r.json.tenants | Where-Object { $_.id -eq $env:TENANT_ID } | Select-Object -First 1
Assert ($null -ne $tenant) "tenant exists in tenants-index"
Assert ($null -ne $tenant.setup_percentage) "setup_percentage present"
Assert ($null -ne $tenant.go_live_status) "go_live_status present"
Assert (($tenant.PSObject.Properties.Name -contains "last_error")) "last_error present (nullable)"

Write-Host "`n[2] overview"
$r = Invoke-Api "GET" "$TenantBase/overview"
Assert ($r.status -eq 200) "overview status"
Assert ($r.json.ok -eq $true) "overview ok=true"
Assert ($null -ne $r.json.overview.setup_percentage) "overview setup_percentage present"
Assert ($null -ne $r.json.overview.go_live_status) "overview go_live_status present"
Assert ($null -ne $r.json.overview.validation) "overview validation info present"

Write-Host "`n[3] channels get/save/test/disconnect + writeback"
$r0 = Invoke-Api "GET" "$TenantBase/channels"
Assert ($r0.status -eq 200) "channels get status"
Assert ($r0.json.ok -eq $true) "channels ok=true"

$saveBody = '{"credentials":{"TELEGRAM_BOT_TOKEN":"phasea_acceptance_token"}}'
$r1 = Invoke-Api "PUT" "$TenantBase/credentials" $saveBody
Assert ($r1.status -eq 200) "channels save status"
Assert ($r1.json.ok -eq $true) "channels save ok=true"

$r2 = Invoke-Api "POST" "$TenantBase/channels/telegram/test" "{}"
Assert (($r2.status -eq 200) -or ($r2.status -eq 400)) "channels test returns 200/400"
Assert ($null -ne $r2.json.ok) "channels test shape has ok"

$r3 = Invoke-Api "GET" "$TenantBase/channels"
$vTelegram = $r3.json.validations | Where-Object { $_.channel -eq "telegram" } | Select-Object -First 1
Assert ($null -ne $vTelegram.last_test) "channels test writeback exists"
Assert ($null -ne $vTelegram.last_test.tested_at) "channels test writeback tested_at exists"

$r4 = Invoke-Api "POST" "$TenantBase/channels/telegram/disconnect" "{}"
Assert ($r4.status -eq 200) "channels disconnect status"
Assert ($r4.json.ok -eq $true) "channels disconnect ok=true"

Write-Host "`n[4] website config/test-widget + writeback"
$cfgBody = '{"widget_enable":true,"welcome_message":"hello from acceptance","domain":"example.com","domain_verified":true}'
$r5 = Invoke-Api "PUT" "$TenantBase/channels/website/config" $cfgBody
Assert ($r5.status -eq 200) "website save status"
Assert ($r5.json.ok -eq $true) "website save ok=true"

$r6 = Invoke-Api "GET" "$TenantBase/channels/website/config"
Assert ($r6.status -eq 200) "website get status"
Assert ($r6.json.ok -eq $true) "website get ok=true"
Assert ($null -ne $r6.json.current_status.widget_enable) "website current_status.widget_enable"
Assert ($null -ne $r6.json.validation_info) "website validation_info exists"

$r7 = Invoke-Api "POST" "$TenantBase/channels/website/test-widget" "{}"
Assert (($r7.status -eq 200) -or ($r7.status -eq 400) -or ($r7.status -eq 409) -or ($r7.status -eq 423)) "website test returns 200/400/409/423"
Assert ($null -ne $r7.json.result) "website test result returned"

$r8 = Invoke-Api "GET" "$TenantBase/channels/website/config"
Assert ($null -ne $r8.json.validation_info.last_tested_at) "website test writeback visible"

Write-Host "`n[5] ai get/save/test-connection + writeback"
$r9 = Invoke-Api "GET" "$TenantBase/ai"
Assert ($r9.status -eq 200) "ai get status"
Assert ($r9.json.ok -eq $true) "ai get ok=true"
Assert ($null -ne $r9.json.validation_info) "ai validation_info exists"

$aiSave = '{"settings":{"llm":{"enabled":true,"provider":"openai","model":"gpt-4o-mini"}},"credentials":{"OPENAI_API_KEY":"phasea_acceptance_openai_key"}}'
$r10 = Invoke-Api "PUT" "$TenantBase/ai" $aiSave
Assert ($r10.status -eq 200) "ai save status"
Assert ($r10.json.ok -eq $true) "ai save ok=true"

$r11 = Invoke-Api "POST" "$TenantBase/ai/test-connection" "{}"
Assert (($r11.status -eq 200) -or ($r11.status -eq 400)) "ai test returns 200/400"
Assert ($null -ne $r11.json.result) "ai test result shape"

$r12 = Invoke-Api "GET" "$TenantBase/ai"
Assert ($null -ne $r12.json.validation_info.last_tested_at) "ai test writeback visible"

Write-Host "`n[6] go-live-check run/latest + shape"
$r13 = Invoke-Api "POST" "$TenantBase/go-live-check/run" "{}"
Assert ($r13.status -eq 200) "go-live run status"
Assert ($r13.json.ok -eq $true) "go-live run ok=true"
Assert ($null -ne $r13.json.status) "go-live run status field"
Assert ($null -ne $r13.json.items) "go-live run items field"

$r14 = Invoke-Api "GET" "$TenantBase/go-live-check/latest"
Assert ($r14.status -eq 200) "go-live latest status"
Assert ($r14.json.ok -eq $true) "go-live latest ok=true"
Assert ($null -ne $r14.json.latest.status) "go-live latest.status exists"
Assert ($null -ne $r14.json.latest.items) "go-live latest.items exists"

Write-Host "`nPASS: Phase A acceptance curl checks completed."

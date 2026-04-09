param(
  [string]$BaseUrl = "http://127.0.0.1:3050",
  [string]$AdminToken = ""
)

$ErrorActionPreference = "Stop"

if (-not $AdminToken) {
  $AdminToken = if ($env:CHATFLOW_SAAS_ADMIN_TOKEN) { $env:CHATFLOW_SAAS_ADMIN_TOKEN } else { $env:ADMIN_TOKEN }
}
if (-not $AdminToken) { throw "Missing admin token for L2 checks (ADMIN_TOKEN or CHATFLOW_SAAS_ADMIN_TOKEN)" }
$Base = $BaseUrl.TrimEnd("/")
$AuthHeader = "Authorization: Bearer $AdminToken"
$Json = "Content-Type: application/json"

function Invoke-Get([string]$Url) {
  $tmp = New-TemporaryFile
  try {
    $status = & curl.exe -sS -X GET -H $AuthHeader -H $Json -o $tmp.FullName -w "%{http_code}" $Url
    $raw = Get-Content $tmp.FullName -Raw
    return @{ status = [int]$status; raw = $raw; json = ($raw | ConvertFrom-Json) }
  } finally {
    Remove-Item $tmp.FullName -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "[health-l2] base=$Base"
$authCheck = Invoke-Get "$Base/saas/v1/admin/auth/summary"
if ($authCheck.status -ne 200 -or -not $authCheck.json.ok) { throw "L2 auth/summary failed: $($authCheck.raw)" }

$idx = Invoke-Get "$Base/saas/v1/admin/platform/tenants-index"
if ($idx.status -ne 200 -or -not $idx.json.ok) {
  if ($idx.status -eq 401 -and $env:TENANT_ID) {
    $tenantOverview = Invoke-Get "$Base/saas/v1/admin/platform/tenants/$($env:TENANT_ID)/overview"
    if ($tenantOverview.status -ne 200 -or -not $tenantOverview.json.ok) {
      throw "L2 tenant overview fallback failed: $($tenantOverview.raw)"
    }
  } else {
    throw "L2 tenants-index failed: $($idx.raw)"
  }
}

$dep = Invoke-Get "$Base/saas/v1/admin/platform/deployment-info"
if ($dep.status -ne 200 -or -not $dep.json.ok -or -not $dep.json.deployment_info.version) {
  throw "L2 deployment-info/version failed: $($dep.raw)"
}

$migPlanTmp = node "$PSScriptRoot\saas-db-migration-plan.mjs"
if ($LASTEXITCODE -ne 0) { throw "L2 migration plan check failed" }
if (-not $migPlanTmp) { throw "L2 migration plan empty output" }

Write-Host "[health-l2] PASS"

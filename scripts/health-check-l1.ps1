param(
  [string]$BaseUrl = "http://127.0.0.1:3050"
)

$ErrorActionPreference = "Stop"

$u = $BaseUrl.TrimEnd("/") + "/saas/v1/health"
Write-Host "[health-l1] check_url=$u"

$uri = [System.Uri]$BaseUrl
$port = if ($uri.IsDefaultPort) { if ($uri.Scheme -eq "https") { 443 } else { 80 } } else { $uri.Port }
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $iar = $tcp.BeginConnect($uri.Host, $port, $null, $null)
  $ok = $iar.AsyncWaitHandle.WaitOne(2000, $false)
  if (-not $ok) { throw "tcp timeout" }
  $tcp.EndConnect($iar)
  $tcp.Close()
} catch {
  throw "L1 failed: port unreachable host=$($uri.Host) port=$port"
}

$tmp = New-TemporaryFile
try {
  $status = & curl.exe -sS -o $tmp.FullName -w "%{http_code}" $u
  $raw = Get-Content $tmp.FullName -Raw
  if ([int]$status -ne 200) { throw "L1 failed: HTTP $status, body=$raw" }
  $json = $raw | ConvertFrom-Json
  if (-not $json.ok) { throw "L1 failed: ok=false" }
  if ([string]$json.db_driver -ne "postgres") { throw "L1 failed: db_driver is not postgres" }
  if ($json.migration_in_progress -eq $true) { throw "L1 failed: migration_in_progress=true" }
  Write-Host "[health-l1] PASS"
} finally {
  Remove-Item $tmp.FullName -Force -ErrorAction SilentlyContinue
}

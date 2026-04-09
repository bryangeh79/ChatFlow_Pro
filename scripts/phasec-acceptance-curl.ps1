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

Write-Host "`n[0] preflight"
Write-Host "BASE_URL=$Base"
Write-Host "TENANT_ID=[$($env:TENANT_ID)] len=$($env:TENANT_ID.Length)"
$authCheck = Invoke-Api "GET" "$Base/saas/v1/admin/auth/summary"
Assert ($authCheck.status -eq 200) "auth summary status (check ADMIN_TOKEN)"
Assert ($authCheck.json.ok -eq $true) "auth summary ok=true"

function Must-HaveConversation() {
  $r = Invoke-Api "GET" "$TenantBase/conversations?limit=50&offset=0"
  if ($r.status -ne 200) {
    throw "conversations list status=$($r.status), raw=$($r.raw)"
  }
  Assert ($r.json.ok -eq $true) "conversations list ok=true"
  Assert ($null -ne $r.json.total) "conversations list has total"
  Assert ($null -ne $r.json.conversations) "conversations list has conversations"
  $conv = $r.json.conversations | Select-Object -First 1
  if ($null -eq $conv) {
    throw "BLOCKED: no conversations found for tenant. Seed at least one conversation first (e.g. real inbound webhook), then rerun phasec acceptance."
  }
  return $conv
}

Write-Host "`n[1] conversations list/detail/messages"
$conv = Must-HaveConversation
$conversationId = [string]$conv.id

$d1 = Invoke-Api "GET" "$TenantBase/conversations/$conversationId"
Assert ($d1.status -eq 200) "conversation detail status"
Assert ($d1.json.ok -eq $true) "conversation detail ok=true"
Assert ($d1.json.conversation.id -eq $conversationId) "conversation id match"
Assert ($null -ne $d1.json.conversation.status) "conversation status exists"
Assert (($d1.json.conversation.status -eq "open") -or ($d1.json.conversation.status -eq "pending") -or ($d1.json.conversation.status -eq "resolved")) "conversation status unified"

$m1 = Invoke-Api "GET" "$TenantBase/conversations/$conversationId/messages?limit=20"
Assert ($m1.status -eq 200) "messages list status"
Assert ($m1.json.ok -eq $true) "messages list ok=true"
Assert ($null -ne $m1.json.messages) "messages array exists"

Write-Host "`n[2] assign / handoff / resolve / reopen / convert-to-lead"
$beforeOwner = $d1.json.conversation.current_owner_principal_id
$assignOwner = "phasec_owner_a"
$handoffOwner = "phasec_owner_b"

$a1 = Invoke-Api "POST" "$TenantBase/conversations/$conversationId/assign" "{""owner_principal_id"":""$assignOwner"",""reason"":""acceptance_assign""}"
Assert ($a1.status -eq 200) "assign status"
Assert ($a1.json.ok -eq $true) "assign ok=true"
$d2 = Invoke-Api "GET" "$TenantBase/conversations/$conversationId"
Assert ($d2.json.conversation.current_owner_principal_id -eq $assignOwner) "assign owner changed"

$h1 = Invoke-Api "POST" "$TenantBase/conversations/$conversationId/handoff" "{""to_owner_principal_id"":""$handoffOwner"",""reason"":""acceptance_handoff""}"
Assert ($h1.status -eq 200) "handoff status"
Assert ($h1.json.ok -eq $true) "handoff ok=true"
$d3 = Invoke-Api "GET" "$TenantBase/conversations/$conversationId"
Assert ($d3.json.conversation.current_owner_principal_id -eq $handoffOwner) "handoff owner changed"

$r1 = Invoke-Api "POST" "$TenantBase/conversations/$conversationId/resolve" "{""note"":""acceptance_resolve""}"
Assert ($r1.status -eq 200) "resolve status"
Assert ($r1.json.ok -eq $true) "resolve ok=true"
$d4 = Invoke-Api "GET" "$TenantBase/conversations/$conversationId"
Assert ($d4.json.conversation.status -eq "resolved") "resolved status writeback"
Assert ($null -ne $d4.json.conversation.resolved_at) "resolved_at exists after resolve"

$ro1 = Invoke-Api "POST" "$TenantBase/conversations/$conversationId/reopen" "{""note"":""acceptance_reopen""}"
Assert ($ro1.status -eq 200) "reopen status"
Assert ($ro1.json.ok -eq $true) "reopen ok=true"
$d5 = Invoke-Api "GET" "$TenantBase/conversations/$conversationId"
Assert ($d5.json.conversation.status -eq "open") "reopen status writeback"

$c1 = Invoke-Api "POST" "$TenantBase/conversations/$conversationId/convert-to-lead" "{}"
Assert ($c1.status -eq 200) "convert status"
Assert ($c1.json.ok -eq $true) "convert ok=true"
Assert ($null -ne $c1.json.lead.id) "convert created/returned lead id"
$leadId = [string]$c1.json.lead.id

Write-Host "`n[3] handoff/assignment activity writeback"
$act = Invoke-Api "GET" "$TenantBase/activity?limit=200&offset=0"
Assert ($act.status -eq 200) "activity list status"
Assert ($act.json.ok -eq $true) "activity list ok=true"
$evAssign = $act.json.entries | Where-Object { $_.event_type -eq "conversation_assigned" -and $_.entity_id -eq $conversationId } | Select-Object -First 1
$evHandoff = $act.json.entries | Where-Object { $_.event_type -eq "conversation_handoff" -and $_.entity_id -eq $conversationId } | Select-Object -First 1
$evResolved = $act.json.entries | Where-Object { $_.event_type -eq "conversation_resolved" -and $_.entity_id -eq $conversationId } | Select-Object -First 1
$evConverted = $act.json.entries | Where-Object { $_.event_type -eq "lead_converted" -and $_.entity_id -eq $leadId } | Select-Object -First 1
Assert ($null -ne $evAssign) "activity has conversation_assigned"
Assert ($null -ne $evHandoff) "activity has conversation_handoff"
Assert ($null -ne $evResolved) "activity has conversation_resolved"
Assert ($null -ne $evConverted) "activity has lead_converted"

Write-Host "`n[4] leads list/detail"
$l1 = Invoke-Api "GET" "$TenantBase/leads?limit=50&offset=0"
Assert ($l1.status -eq 200) "leads list status"
Assert ($l1.json.ok -eq $true) "leads list ok=true"
Assert ($null -ne $l1.json.total) "leads list has total"
$lead = $l1.json.leads | Where-Object { $_.id -eq $leadId } | Select-Object -First 1
Assert ($null -ne $lead) "converted lead appears in leads list"

$l2 = Invoke-Api "GET" "$TenantBase/leads/$leadId"
Assert ($l2.status -eq 200) "lead detail status"
Assert ($l2.json.ok -eq $true) "lead detail ok=true"
Assert ($l2.json.lead.id -eq $leadId) "lead detail id match"
Assert ($null -ne $l2.json.events) "lead detail has events"

Write-Host "`n[5] lead assign / lead status"
$leadOwner = "phasec_lead_owner_a"
$la1 = Invoke-Api "POST" "$TenantBase/leads/$leadId/assign" "{""owner_principal_id"":""$leadOwner""}"
Assert ($la1.status -eq 200) "lead assign status"
Assert ($la1.json.ok -eq $true) "lead assign ok=true"
$l3 = Invoke-Api "GET" "$TenantBase/leads/$leadId"
Assert ($l3.json.lead.owner_principal_id -eq $leadOwner) "lead owner changed"

$fromStatus = [string]$l3.json.lead.status
$nextStatus = switch ($fromStatus) {
  "new" { "contacted" }
  "contacted" { "qualified" }
  "qualified" { "closed" }
  default { "" }
}
if ($nextStatus -eq "") {
  $lsBlocked = Invoke-Api "POST" "$TenantBase/leads/$leadId/status" "{""to_status"":""contacted""}"
  Assert ($lsBlocked.status -eq 409) "terminal lead status rejects invalid transition"
  $l4 = Invoke-Api "GET" "$TenantBase/leads/$leadId"
} else {
  $ls1 = Invoke-Api "POST" "$TenantBase/leads/$leadId/status" "{""to_status"":""$nextStatus""}"
  Assert ($ls1.status -eq 200) "lead status transition status"
  Assert ($ls1.json.ok -eq $true) "lead status transition ok=true"
  $l4 = Invoke-Api "GET" "$TenantBase/leads/$leadId"
  Assert ($l4.json.lead.status -eq $nextStatus) "lead status changed to $nextStatus"
}
$evOwnerChanged = $l4.json.events | Where-Object { $_.event_type -eq "lead_owner_changed" } | Select-Object -First 1
$evStatusChanged = $l4.json.events | Where-Object { $_.event_type -eq "lead_status_changed" } | Select-Object -First 1
Assert ($null -ne $evOwnerChanged) "lead events include owner_changed"
if ($nextStatus -ne "") {
  Assert ($null -ne $evStatusChanged) "lead events include status_changed"
}

Write-Host "`n[6] reports summary (today / last7d / all_time)"
foreach ($range in @("today","last7d","all_time")) {
  $rep = Invoke-Api "GET" "$TenantBase/reports/summary?range=$range"
  Assert ($rep.status -eq 200) "reports summary status ($range)"
  Assert ($rep.json.ok -eq $true) "reports summary ok=true ($range)"
  Assert ($rep.json.range -eq $range) "reports range echo ($range)"
  Assert ($null -ne $rep.json.cards.total_conversations) "reports cards.total_conversations ($range)"
  Assert ($null -ne $rep.json.cards.open_conversations) "reports cards.open_conversations ($range)"
  Assert ($null -ne $rep.json.cards.resolved_conversations) "reports cards.resolved_conversations ($range)"
  Assert ($null -ne $rep.json.cards.total_leads) "reports cards.total_leads ($range)"
  Assert ($null -ne $rep.json.cards.new_leads) "reports cards.new_leads ($range)"
  Assert ($null -ne $rep.json.cards.qualified_leads) "reports cards.qualified_leads ($range)"
  Assert ($null -ne $rep.json.cards.handoff_count) "reports cards.handoff_count ($range)"
  Assert ($null -ne $rep.json.channel_breakdown) "reports channel_breakdown ($range)"
  Assert ($null -ne $rep.json.owner_breakdown) "reports owner_breakdown ($range)"
}

Write-Host "`n[PASS] Phase C acceptance checks passed."

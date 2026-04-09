# Phase C 页面操作清单（真实链路）

## Inbox

1. Open Inbox list  
   - 访问：`/app/inbox` 或 `platform tenant detail ?tab=inbox`
   - 验证：列表返回 `status/channel/customer/owner/last_message`
2. Assign owner  
   - 操作：对目标 conversation 调用 assign（owner A）
   - 验证：conversation detail `current_owner_principal_id = owner A`
3. Handoff  
   - 操作：对同一 conversation 调用 handoff（owner B）
   - 验证：conversation detail owner 变更为 owner B
4. Resolve  
   - 操作：调用 resolve
   - 验证：status=`resolved`，`resolved_at` 非空
5. Reopen  
   - 操作：调用 reopen
   - 验证：status=`open`
6. Convert to lead  
   - 操作：调用 convert-to-lead
   - 验证：返回 lead id；若 owner 为空则返回 `Lead created without owner`

## Leads

1. Open Leads list  
   - 访问：`/app/leads` 或 `platform tenant detail ?tab=leads`
   - 验证：列表返回 `name/source_channel/status/owner/updated_at`
2. Assign owner  
   - 操作：调用 `POST /leads/:leadId/assign`
   - 验证：lead detail owner 改变
3. Status change  
   - 操作：调用 `POST /leads/:leadId/status`（例如 `new -> contacted`）
   - 验证：lead detail status 改变且符合状态机
4. Events  
   - 验证：lead detail `events` 包含 `lead_owner_changed`、`lead_status_changed`

## Reports

1. Range switch  
   - 操作：依次请求 `today`、`last7d`、`all_time`
2. Summary  
   - 验证：`cards` 包含 `total/open/resolved conversations`, `total/new/qualified leads`, `handoff_count`
3. Breakdown  
   - 验证：`channel_breakdown`、`owner_breakdown` 返回数组（允许为空数组）

# Phase A 收尾验收包

## 1) 逐接口 curl 验收脚本

- 脚本路径：`scripts/phasea-acceptance-curl.ps1`
- 运行前设置环境变量：
  - `ADMIN_TOKEN`
  - `TENANT_ID`
  - `BASE_URL`（可选，默认 `http://127.0.0.1:3050`）

示例：

```powershell
$env:ADMIN_TOKEN="YOUR_TOKEN"
$env:TENANT_ID="YOUR_TENANT_UUID"
$env:BASE_URL="http://127.0.0.1:3050"
powershell -ExecutionPolicy Bypass -File .\scripts\phasea-acceptance-curl.ps1
```

脚本覆盖接口：
- tenants-index
- overview
- channels get/save/test/disconnect
- website config/test-widget
- ai get/save/test-connection
- go-live-check run/latest

脚本验证项：
- HTTP status
- response shape
- `setup_percentage` / `go_live_status` / `validation_info` 是否返回
- test 后状态是否回写（再次 GET 验证 `last_tested_at` / `last_test`）

---

## 2) 页面操作清单（真实链路）

### A. Tenant List -> Overview
1. 打开 `/platform/tenants`
2. 确认列表字段：`setup_percentage`、`go_live_status`、`last_error`
3. 点击某租户进入 `/platform/tenants/:tenantId?tab=summary`
4. 确认 Overview 有：
   - setup progress
   - go-live status
   - runtime health
   - validation info

### B. Channels（输入 -> 保存 -> 测试 -> 看状态）
1. 打开 `/app/channels`
2. 在 Configuration panel 选择 `telegram`
3. 输入 token，点 `Save`
4. 点 `Save & Test`（或卡片 `Test`）
5. 观察 channel card 的 last tested/状态变化
6. 点击 `Disconnect`，确认状态回退为 disconnected

### C. Website 专项链路
1. 在 `/app/channels` 选择 `website`
2. 输入：
   - widget enable
   - welcome message
   - connected domain
3. 点 `Save`
4. 点 `Save & Test`
5. 返回 Website 配置查看 `validation_info.last_tested_at`

### D. AI（输入 -> 保存 -> 测试 -> 看状态）
1. 打开 `/app/ai`
2. 输入 OpenAI key + model，勾选 AI enabled
3. 点 `Save`
4. 点 `Save & Test`
5. 观察 `validation_info`（last tested/last error）

### E. Go-live-check（run -> failed items -> fix jump）
1. 打开 `/platform/tenants/:tenantId?tab=go-live-check`
2. 点击 `Run Check`
3. 查看 failed items 列表
4. 按 failed item 去对应页修复：
   - channel -> Channels
   - openai/ai_enabled -> AI
   - knowledge -> Knowledge
   - welcome_message -> Website 配置
5. 回到 go-live-check 再次 `Run Check`，确认状态变化

---

## 3) 剩余差距清单

### 必须修（影响 Phase A 验收严谨性）
- `tenant_activity_events` 目前已建表，但尚未完整写入所有关键动作（token change / ai toggle / faq import / channel disconnect 全覆盖）
- `latest_test_passed` 当前以最近 channel/website 测试近似，建议补“统一最近测试聚合规则”并固定到服务函数
- `overview.validation.last_saved_at` 当前未完整回填（建议从 `tenant_settings.updated_at` + `tenant_credentials.updated_at` 聚合）

### 应该修（提高稳定性/可解释性）
- channel test 目前为配置可用性检查，建议补可选真实外部连通探测（带超时和降级）
- website domain `is_verified` 现在由输入写入，建议补后端验证流程
- go-live-check failed item 需要返回 `fix_path` 字段，前端可一键跳转

### Phase B / C 再做
- Platform logs 独立页和查询 API
- Inbox/Leads owner+assignment 实体表与流程
- 更细粒度权限模型（高级 RBAC）
- 动态规则引擎（非本轮）

---

## 4) 数据回写核对清单

| 动作 | 写入表/字段 | 读取展示页面 |
|---|---|---|
| 渠道 Save（credentials） | `tenant_credentials(tenant_id,key,value,updated_at)` | `/app/channels`, `/platform/tenants/:id?tab=channels` |
| 渠道 Test | `tenant_test_results(scope_type='channel',scope_key=channel)` | `/app/channels`（validations），`/platform/.../channels` |
| 渠道 Disconnect | 删除 `tenant_credentials` 对应 key | `/app/channels`, `/platform/.../channels` |
| Website Save | `tenant_settings.settings_json.website.*` + `tenant_website_domains` | `/app/channels` Website panel |
| Website Test Widget | `tenant_test_results(scope_type='website',scope_key='widget')` | Website `validation_info` |
| AI Save | `tenant_settings.settings_json.llm.*` + `tenant_credentials.OPENAI_API_KEY` | `/app/ai`, overview runtime |
| AI Test Connection | `tenant_test_results(scope_type='ai',scope_key='openai_connection')` | `/app/ai` validation_info |
| Runtime health refresh | `tenant_runtime_health(ai_enabled,live_status,last_error_*,updated_at,...)` | `/platform/.../overview`, `/platform/tenants` last_error |
| Go-live run | `tenant_go_live_checks(status,results_json,checked_at,checked_by)` | `/platform/.../go-live-check` latest |
| setup_percentage 计算 | 服务层统一计算（不落表） | `/platform/tenants`, `/platform/.../overview` |


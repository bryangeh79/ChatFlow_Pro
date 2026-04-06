# ChatFlow Pro — GPT 规划者无缝接手蓝图（Cursor 为手）

> **用途**：给 **GPT（或其它规划型模型）** 作为单一真源，用于架构决策、排期、拆分任务；**Cursor / 本地 Agent** 负责改代码、跑命令、提交。  
> **维护**：重大架构或发版后应更新本节与「工程进度」「参数表」。  
> **仓库根**：以克隆后的项目根为准（示例：`C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro`）。  
> **当前 package 版本（权威）**：以根目录 `package.json` 的 `version` 为准（撰写时常见为 **1.7.59**；`memory/01` 可能滞后，以代码为准）。

---

## 1. 协作模型（必读）

| 角色 | 职责 |
|------|------|
| **GPT（规划）** | 定目标、拆任务、定接口与数据模型、写验收标准、标风险；**不写具体 patch**，可给出伪代码与文件路径。 |
| **Cursor（手）** | 读蓝图与 `memory/`、改 `src/` / `scripts/` / `docs/`（按指令）、跑 `npm run build`、`release:verify`、`staging:docker-smoke` 等、git commit/push（若用户授权）。 |
| **龙虾（OpenClaw，按需）** | 仅当需要：SSH、本机 Docker/宿主权限、内网、大规模跨模块重构且 Cursor 通道不可达时；由用户转发 **可粘贴指令块**，用户不做二次翻译。 |

**用户（Bryan）偏好（执行层）**：

- 小事 Cursor 直接做；大事才派龙虾。  
- **禁止**在仓库、文档、聊天中写入**真实** API Key / Token。  
- 交付期优先：**减少人工步骤、降低漏项**，而非盲目扩功能。  
- 产品名：**ChatFlow Pro**；历史上同时存在 **「一客户一部署」** 与 **「多租户 SaaS」** 两条线（见 §4），规划时需显式选择主叙事或并行策略。

---

## 2. 产品目标与边界

### 2.1 已锁定的产品能力（Pro）

- **七通道统一入站**：`POST /webhooks/<channel>`（及对应 `GET` 校验/说明）。  
  Channels：`telegram` | `website` | `whatsapp` | `messenger` | `line` | `zalo`。
- **统一流水线**：Lead 捕获（多轮、合并、JSONL 落盘）+ **FAQ 匹配** + **Intent 分发** + **Handoff**（关键词、分配、可选 notify）。  
- **真发送**：各通道在配置齐全且非 sandbox 时走真实 API；否则 synthetic。  
- **可观测性**：`X-Request-Id`、可选 HTTP access log、`phases_ms` 等（见 `docs/150` 体系）。

### 2.2 明确不在当前「交付冲刺」内扩 scope 的项

- **完整坐席 UI 套件**（非当前承诺）。  
- **docs/165 选项 C / 多租户控制面** 级大规模重构——与当前 **SaaS MVP** 并行演进时需单独立项，避免混谈。

### 2.3 商业与部署口径（并存）

1. **一客户一部署（传统交付）**  
   - 文档链：`docs/168`–`172`、`161`、`162`（PDF）等。  
   - 编排：`docker-compose.customer.yml`、发版脚本 `release:*`、`delivery:*`。  
   - 配置主要来源：**环境变量 / `.env`（不入库）**。

2. **多租户 SaaS（MVP 已落地代码）**  
   - 见 **`docs/175_pro_saas_multitenant_mvp.md`**（范围与非目标写得很清楚）。  
   - 租户 Webhook：`/webhooks/t/<slug>/<channel>`。  
   - 数据：**sql.js（WASM SQLite）** 文件库，默认 `data/chatflow-saas.sqlite`。  
   - 管理：`GET /saas/admin`（静态页）、`/saas/v1/admin/*` + `CHATFLOW_SAAS_ADMIN_TOKEN`。  
   - **租户请求内**：FAQ **仅**来自 DB；Session **带租户前缀**；出站凭证 **按租户 DB 解析**（无则回落 env 的兼容逻辑见实现）。

**规划者注意**：任何新功能需声明：仅 legacy、仅 tenant、或双轨都要，避免默认写死单一路径。

---

## 3. 技术栈与构建

| 项 | 说明 |
|----|------|
| 语言 | TypeScript → CommonJS 输出 |
| 构建 | `npm run build` → `tsc -p tsconfig.json`，输出 `dist/` |
| 入口 | `npm start` → `node dist/src/index.js` |
| HTTP | Node `http` 原生，`src/server.ts` |
| 依赖 | `undici`（HTTP）、`sql.js`（SaaS DB）等见 `package.json` |
| 前端 | `frontend/` 多为模块/占位；**运营 Dashboard MVP** 在 `public/saas-admin.html` |
| 后端骨架 | `backend/` 以 README/模块结构为主，**主运行路径是根目录 `src/`** |

---

## 4. 仓库地图（规划时按路径下刀）

```
src/
  server.ts                 # HTTP 路由总入口：health、/saas/*、租户 webhook、legacy webhook
  index.ts                  # 启动 startServer
  config/                   # 各通道 env 配置、验签、handoff 等
  webhooks/                 # 各通道 handle*Webhook → unified pipeline
  channels/
    unified-inbound-pipeline/  # FAQ、intent、与 pipeline 编排
    session-context/           # 内存 Session + 租户 session 前缀
    outbound-sender/           # 七通道出站（每请求解析 env 或租户凭证）
    lead-capture-hook/、handoff-trigger/、conversation-runtime/ …
  saas/                     # DB、repository、tenant context、admin 路由、租户 webhook 分发
  observability/            # http-access、phases
scripts/                    # 发版、delivery、smoke、PDF、运维 CLI 等
shared/types/               # 与 pipeline 相关的共享类型
docs/                       # 阶段说明、交付、运维、SaaS MVP 等
public/saas-admin.html      # SaaS 管理后台 MVP
memory/                     # 人类/龙虾/Cursor 维护的进度与风险（非替代本蓝图）
```

**关键数据文件（运行时）**：

- `data/local-captured-leads.jsonl` 等 — gitignore。  
- `data/handoff-assignments.jsonl` — gitignore。  
- `data/chatflow-saas.sqlite` — SaaS DB，gitignore（路径可 `CHATFLOW_SAAS_DB_PATH`）。

---

## 5. 运行时架构（概念层）

1. **请求进入** `server.ts` → 分配 `X-Request-Id`。  
2. **分支**：  
   - `/health`  
   - `/saas/*` → Admin API / Dashboard  
   - `/webhooks/t/:slug/:channel` → 加载 tenant → `runWithTenantContext` → 对应 `handle*Webhook`（带 `faqEntries` 来自 DB）  
   - `/webhooks/:channel` → **Legacy**：无租户上下文，FAQ 用 **内置 seed**（`faq-seed.ts`），凭证来自 **env**  
3. **Pipeline**：`runUnifiedInboundPipeline`（`src/channels/unified-inbound-pipeline/index.ts`）  
   - 可选 `faqEntries`：有则 **不**走内置 seed，仅使用该列表（可为空数组）。  
4. **出站**：`createChannelSender` → 各 `resolve*ForOutbound()`（`src/saas/tenant-channel-config.ts`）：有租户上下文则读 **tenant_credentials** 表，否则读 **process.env**。  
5. **Session**：`namespacedSessionIdForMessage` — 租户下 `tenantId:channel:user:...`，避免串租户。

---

## 6. 参数与环境变量（规划表 — 不完整处用 `.env.example` 补全）

### 6.1 进程级（Legacy / 默认出站）

- **端口**：`PORT`（默认 3030）、`CHATFLOW_HTTP_HOST`  
- **各通道**：`TELEGRAM_BOT_TOKEN`、`WHATSAPP_*`、`MESSENGER_*`、`LINE_*`、`ZALO_*`、`WEBSITE_*` 等 — **以 `.env.example` 为清单**  
- **验签**：`META_APP_SECRET` / `WHATSAPP_APP_SECRET`、`LINE_CHANNEL_SECRET`、`WEBSITE_WEBHOOK_SIGNING_SECRET` 等  
- **Notify**：`CHATFLOW_LEAD_NOTIFY_*`、`CHATFLOW_HANDOFF_NOTIFY_*`  
- **Handoff 运行时**：`CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH`、`CHATFLOW_OPS_AUTOTUNE*` 等  
- **日志**：`CHATFLOW_HTTP_ACCESS_LOG`  

### 6.2 SaaS（多租户）

| 变量 | 作用 |
|------|------|
| `CHATFLOW_SAAS_ADMIN_TOKEN` | Admin API Bearer；**不提交仓库** |
| `CHATFLOW_SAAS_DB_PATH` | 可选；覆盖默认 sqlite 路径 |

### 6.3 租户凭证（存 DB，键名与 env 对齐）

规划扩展时，优先使用 **与 `.env.example` 相同的 key 名** 写入 `tenant_credentials`，以便 `tenant-channel-config` 统一解析。例如：`TELEGRAM_BOT_TOKEN`、`WHATSAPP_ACCESS_TOKEN`、`OPENAI_API_KEY`（**OpenAI 尚未接入对话主链，仅可存库待用**）。

---

## 7. npm 脚本 — 规划验收时常用

| 脚本 | 用途 |
|------|------|
| `npm run build` | 编译 |
| `npm run check:go-live` | build + `check-staging-env`（不打印密钥值） |
| `npm run release:verify` | 只读门禁 |
| `npm run delivery:ship:final` | 发版+PDF+zip+发包文本+CI 摘要（交付主路径之一） |
| `npm run delivery:message` / `delivery:message:file` | 对外发包文案 |
| `npm run staging:docker-smoke` | CI 同级本地 T1 |
| `npm run smoke:webhooks` | Webhook 冒烟（配合文档 157/158） |
| `npm run report:github-ci` | 最新 `ci.yml` run |

---

## 8. 文档索引（按主题）

| 主题 | 文档 |
|------|------|
| 交付 / 厂商核对 | `docs/171` |
| 客户运维 | `docs/170` |
| 一客户一部署 | `docs/169` |
| 两天清单 | `docs/168` |
| HTTPS 反代 | `docs/172` |
| Notify 契约 | `docs/161` |
| 客户七通道 token 指南 | `docs/162`（+ `npm run docs:pdf:162`） |
| Docker / smoke 阶梯 | `docs/158`、`docs/157` |
| 代理 / Git / 环境 | `docs/155`、`AGENTS.md` |
| **SaaS MVP** | `docs/175_pro_saas_multitenant_mvp.md` |
| **本蓝图** | `docs/GPT_PLANNER_HANDOFF_BLUEPRINT.md` |

---

## 9. CI 与质量门禁

- Workflow：`.github/workflows/ci.yml`（build、`docker-smoke` 等以仓库为准）。  
- 本地对齐：`npm run staging:docker-smoke`。  
- 无 git 时看 CI：`npm run report:github-ci`（可选 `GITHUB_TOKEN` 私库）。

---

## 10. 工程进度快照（给规划者的「时间线摘要」）

> 细节以 `memory/03_next_phase_plan.md`、`memory/02_work_log.md` 与 git 历史为准；此处为 **决策级** 摘要。

- **Phase 15.x**：七通道 real-send、验签、Webhook GET 等（大量 `docs/14x–149`）。  
- **Phase 16.x**：HTTP 可观测性、`phases_ms`。  
- **Phase 17.x**：Staging、Docker、`check-staging-env`、Meta/Zalo token 等。  
- **Phase 18–21**：Handoff 分配、JSONL 审计、报表、ops 告警、autotune、runtime JSON + SIGHUP（`docs/165–167`）。  
- **交付自动化**：`release:*`、`delivery:*`、`docs/168–172`、`delivery:ship:final` 等。  
- **Phase 22（memory 命名）**：发包文案自动化、memory 收口。  
- **SaaS MVP（代码）**：`src/saas/*`、`docs/175`、版本进 **1.7.59** 前后。

**memory/01 可能未写 SaaS**：以本文件 + `package.json` + `docs/175` 为准。

---

## 11. 已知缺口与建议 backlog（供 GPT 排期）

以下 **未声称已完成** 或 **仅部分完成**，规划时应显式立项：

1. **`tenant_settings` → 运行时策略**：已存 JSON，**未**全面驱动 handoff / lead / 话术 / notify。  
2. **OpenAI / LLM**：无统一生产调用链；租户可存 `OPENAI_API_KEY`，需接 pipeline 与计费/限流设计。  
3. **SaaS 安全**：凭证库内 **明文**；需 KMS/加密、审计日志、轮换策略。  
4. **Legacy vs SaaS 统一叙事**：是否 deprecate `/webhooks/:channel` 或加全局开关 `CHATFLOW_DEFAULT_MODE`。  
5. **多实例**：Session 内存、JSONL 单写者假设；SaaS 需 sticky 或外置 session/store。  
6. **Admin 产品化**：从单页 HTML → 认证、多用户、审计、RBAC。  
7. **Postgres + 迁移**：替代 sql.js 用于托管环境。

---

## 12. 给 GPT 的产出物模板（建议复制使用）

规划者每次迭代建议给出：

1. **目标**（一句话）  
2. **影响范围**：Legacy / Tenant / 双轨 / 仅文档  
3. **数据模型变更**（若有）  
4. **文件级任务列表**（路径 + 改什么）  
5. **验收命令**（如 `npm run build && npm run staging:docker-smoke`）  
6. **风险与回滚**  
7. **是否需龙虾**（若需，输出 **一整块** 可转发指令）

---

## 13. 给 Cursor 的执行清单（接到 GPT 任务时）

1. 对照本蓝图 §4–§6 确认走哪条轨（legacy / tenant）。  
2. 小步提交；不扩无关 refactor。  
3. 跑 `npm run build`；与 webhook 相关则考虑 `smoke` / `docker-smoke`。  
4. 不提交 `.env`、`MEMORY.md`（若用户未要求）、真实密钥。  
5. 大改后更新 `docs/175` 或本蓝图相关节（若用户要求同步文档）。

---

## 14. 版本与远程

- **远程**：以 `git remote -v` 为准（常见 `origin` → GitHub `ChatFlow_Pro`）。  
- **最新实现以 `main` 为准**；发版 tag 策略由团队约定。

---

*文档结束。若你只把本文件 + `docs/175` + `.env.example` 交给 GPT，应足以做下一阶段架构规划；执行细节让 Cursor 读 `src/` 与对应 `docs/`。*

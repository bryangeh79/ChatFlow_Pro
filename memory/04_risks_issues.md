# Risks and Issues

## 战报顶栏（2026-04-07）

- **版本 / Phase**：**1.7.82**；**Phase 24** — **Auth-RBAC Foundation（1A–1J）checkpoint 已封**；**包 2A–2G ✅**（2G = **ledger contract + 内存 fake**，**非** 生产持久化）；**下一** 真 **`pg`** / apply / **DB ledger** / CI；**Phase 23 / SaaS MVP 主线已关闭**。  
- **本轮 git**：以 `git log origin/main` 为准。  
- **新发现风险（本轮）**：**Postgres 迁移线**见下节「Phase 24 — Postgres 迁移线（2A+）」；其余见 **Phase 24 预期风险**。  
- **已知边界**：**冻结（MVP）** — `docs/175` + `memory/04` §「Known SaaS MVP boundaries」；**待后续（v1）** — 凭证 KMS、多实例 store、**sql.js→Postgres（2B/2C）**。  
- **勿再当 backlog**：非主链路 channel send / handoff suppress（Phase 23 已审计 **covered**）。

## Phase 24 — 预期风险域（立项时展开）

- **认证与授权**：单一 `CHATFLOW_SAAS_ADMIN_TOKEN` 不适多用户托管；误配可导致越权或锁死运维。  
- **收口（Phase 24 包 1A）**：迁移路径与验收见 **`docs/176_phase24_saas_admin_auth_rbac_adr.md`**；**实现落地前** 仍为 **open operational risk** — 须限制 token 分发面、rotation 与 break-glass 流程；落地后改为跟踪 RBAC 漏配与审计缺口。  
- **包 1B**：已落地 **`admin-auth.ts` 桥接层**（**已完成**）。  
- **包 1C**：authorization scaffold — **已完成**。  
- **包 1D**：RBAC 语义 — **已完成**。  
- **包 1E**：tenant **admin** env bridge — **已完成**。  
- **包 1F**：**tenant_admin + tenant_operator_readonly** 双 env bridge — **已完成**；泄露风险同下。  
- **包 1G**：**principal 行已入库** — **已完成**。  
- **包 1H**：hash-at-rest — **已完成**；**仍无** KMS、加盐、**token rotation policy engine**。  
- **包 1I**：principal 变更审计摘要 — **已完成**；**仍无**完整 **登录会话审计**、SIEM、**轮换策略引擎**、password/JWT 产品面。  
- **包 1J**：bridge / break-glass **cutline 已文档化+registry** — **子里程碑已封**；**不再堆新型 bridge**；真实 tenant auth **另立项**。  
- **多实例**：内存 session、JSONL 追加、notify 幂等 — 需 sticky 或外置 store。  
- **凭证**：DB 明文 → KMS/信封加密、轮换与审计面。

## Phase 24 — Postgres 迁移线（2A+，ADR：`docs/177_phase24_postgres_migration_adr.md`）

- **Migration 机制（2D–2G）**：**registry + SQL + checksum + execution + ledger contract** 已有；**`FakeSaasMigrationLedger` 仅内存** — **`saas_schema_migrations` 仍未接真实 DB**、**apply 仍 `not_wired`**、**无 `pg`** — **勿将 fake harness 当生产 ledger**。  
- **Postgres adapter（2C）**：**仅为 stub** — 设 `CHATFLOW_SAAS_DB_DRIVER=postgres` 时 **任何 DB 调用即抛** `postgres_adapter_not_implemented`；**未**接 `pg`、**无** CI Postgres runtime — **勿当可跑生产后端**。  
- **adapter 过渡期（2B+）**：**repository 双路径** — principals/audit 走 **`SaaSDbAdapter`**，其余表仍 **`getSaaSDatabase` + stmt**；新增功能若接错路径易出现 **持久化语义不一致**（忘记 `persistIfNeeded` / 混用连接）— **扩表时必须跟 adapter 模式或显式文档例外**。  
- **数据迁移 / 一致性**：单文件 SQLite（sql.js）→ 托管 Postgres 需 **显式导出/导入或双写窗口**；多租户表外键与索引需 **一次性校验**，避免部分表成功导致 **orphan** 或 **unique 冲突**。  
- **回滚**：若生产已切 Postgres 而应用回滚到仅 sql.js 版本，**数据分叉** — 需 **迁移前快照**、**可重复迁移脚本**、**环境变量明确 backend**（避免静默写错库）。  
- **连接池 / 并发**：当前 **单进程内存 DB + 全量 `export` 写盘**；Postgres 后需 **pool 上限、语句超时、重试策略**；长事务与 Admin 批量写可能与 webhook 读争用 — 需 **隔离或限流**（实现阶段定）。  
- **多实例一致性**：文件库 **隐式单 writer**；多副本 + Postgres 为常态，**无**全局 `persistSaaSDatabase()` 语义 — 依赖 **DB 事务** 与 **迁移后不再依赖进程内单例 sqlite**。  
- **方言与隐式 SQLite 特性**：现有 schema 使用 `datetime('now')`、`PRAGMA table_info`、`部分唯一索引 WHERE ...`（SQLite）；Postgres 需 **等价类型/默认/索引** 与 **独立 migration runner**（非仅 `CREATE TABLE IF NOT EXISTS` 字符串复用）。  
- **local vs prod 分叉**：长期 **双后端**（sql.js + postgres）若测试不足，易出现 **「本地绿、线上红」** — CI 建议 eventually **Postgres job** 或 contract 测试（2B/2C 定）。

---

## Existing Risks
- Do not mistake the current minimal real webhook entrypoints for a fully completed product.
- Do not expand into menu / command / state systems just because the webhook baselines are now alive.
- Do not let channel-specific changes pollute shared core behavior without a hard reason.
- Continue protecting the **seven-route baseline**: All 7 channels must remain independently verifiable and non-breaking.
- The current version is **Pro_v1.07.67** (package.json **1.7.67**; **SaaS MVP sealed (Phase 23 closed)**；**Phase 24** = v1 hardening). Truth → **`memory/01_project_status.md`**.
- The biggest recurring error to avoid is confusing stable minimal entrypoints with full platform completion.
- Regression risk remains live whenever shared contracts or routing paths are touched.
- **Pause Status**: **Not blocked** — default gate **T0 build + T1 `docker-smoke`** (incl. `smoke:webhooks` + `verify:lead-capture-states`); read-only agent env → **docs/155** *T1 equivalence* + **`npm run report:github-ci`**. No public staging URL does **not** block dev; **docs/157** Phase 0 waits on **HTTPS** staging.

## New Risks from Phase 11.40 Lead Capture Implementation
- **Field extraction accuracy**: Simple regex-based extraction may have false positives/negatives
- **Intent detection limitations**: Keyword-based detection may miss nuanced contact requests
- **Session state persistence**: Lead capture state is stored in session but not persisted to database
- **Validation gaps**: No validation of email format, phone number format, or name sanity
- **Performance impact**: Additional processing in pipeline could affect response time (minimal)

## New Risks from Phase 11.41
- **Cross-turn state management**: Session must be passed correctly between turns for merging to work
- **Outbound prompt consistency**: lead_capture_prompt logic must not interfere with other response flows
- **FAQ priority enforcement**: Captured confirmation must only show when FAQ truly misses

## New Risks from Phase 11.42
- **File system permissions**: data/ directory may not be writable in some deployments
- **Disk space**: Unbounded JSONL growth without rotation/cleanup
- **Concurrent writes**: Multiple webhook instances could cause file corruption (append-only mitigates)
- **Data security**: Plain-text JSONL files contain contact info (git-ignore helps)

## New Risks from Phase 11.43
- **Memory growth**: In-memory Map grows unbounded without session expiration
- **Restart loss**: All session state lost on process restart
- **Single-process limitation**: No multi-instance coordination (sticky sessions required)
- **Concurrency races**: Last-writer-wins with concurrent requests to same session
- **No persistence**: Pure runtime state (complements but doesn't replace file persistence)

## New Risks from Phase 11.44
- **Prompt formatting**: Double newline (`\n\n`) may not render well on all platforms
- **Message length**: Combined text (original + prompt) could exceed channel limits
- **Localization**: Prompts still English-only (needs four-language support)
- **Edge cases**: Empty replyText with prompt (currently not merged)

## New Risks from Phase 11.45
- **Translation quality**: Machine-translated strings may need human review
- **Field name mapping**: Field translations (phone→电话) may not cover all variations
- **Language detection**: Relies on session.current_language which may be inaccurate
- **Fallback chains**: English fallback may not be appropriate for all regions

## New Risks from Phase 11.46
- **FAQ over-matching**: With gate removed, FAQ may match too aggressively
- **Intent placeholder**: Real intent dispatch needed for proper FAQ gating
- **Seed content quality**: Current FAQ seeds are placeholder English-only

## New Risks from Handoff Integration (Pro_v1.07.40)
- **Keyword false positives**: Default keywords may trigger handoff unintentionally
- **Session state persistence**: Handoff state stored in memory only, lost on restart
- **No external notification**: Handoff pending状态无外呼通知（仅进程内）
- **Missing UI integration**: Handoff状态无坐席UI对接
- **Testing coverage**: Handoff触发逻辑需要更多测试场景

## New Risks from Handoff Reply Suppression (Pro_v1.07.42)
- **Silent handoff**: 用户可能不知道已转人工（无bot回复确认）
- **Configuration dependency**: 抑制行为依赖环境变量，部署时易遗漏
- **Channel consistency**: 七通道都使用 `result.response.should_send`，但需确保无硬编码覆盖
- **Default behavior**: 默认不抑制（保持现有行为），但用户可能期望抑制

## New Risks from Conversation Runtime (Pro_v1.07.45)
- **Phase transition logic**: 对话阶段判定可能过于简单，需要更多业务场景验证
- **Policy complexity**: 策略规划可能引入新的回归风险
- **Event emission**: 进程内事件发射可能影响性能（虽然当前是空实现）
- **Qualification tag accuracy**: 资格标签规则（complete_profile, high_intent）可能不够准确
- **Single-field prompting**: 单槽引导可能不够灵活，需要更多业务规则
- **Debug metadata bloat**: 新增的debug字段可能增加响应大小

## New Risks from Phase 18 / 包 1 (Pro_v1.07.47)
- **Backward compatibility**: 新增的 request_id/message_trace_id 字段可能影响旧版接收端解析
- **Auto-assignment conflicts**: 自动分配可能与手动分配冲突
- **Trace context propagation**: request_id 传递链路可能中断（webhook → pipeline → notify）
- **Environment variable management**: 新增 CHATFLOW_HANDOFF_AUTO_ASSIGN_OWNER 需要文档说明

## New Risks from Phase 18 / 包 2 (Pro_v1.07.48)
- **Assignment strategy complexity**: 三种分配模式增加配置复杂度
- **Round-robin stability**: 基于 session_id 哈希的分配可能不够均匀
- **Tag mapping parsing**: TAG_MAP 环境变量解析可能失败（格式错误）
- **Fallback logic**: by_tag 模式的回退逻辑可能不够清晰
- **Debug metadata bloat**: 新增 assign_mode/assign_reason 字段增加响应大小

## New Risks from Phase 18 / 包 3 (Pro_v1.07.49)
- **Memory growth**: 进程内分配历史追踪可能造成内存泄漏（有上限控制）
- **Agent status staleness**: 环境变量中的坐席状态可能过时（需要重启更新）
- **Least-recent accuracy**: 基于进程内历史的 least_recent 策略在重启后失效
- **Sticky TTL complexity**: 粘性分配 TTL 逻辑增加分配复杂性
- **Online agent filtering**: 在线坐席过滤可能意外排除有效坐席
- **Notification payload growth**: handoff notify 新增字段增加 payload 大小

## New Risks from Phase 18 / 包 4 (Pro_v1.07.50)
- **File system dependency**: JSONL 落盘依赖文件系统权限和空间
- **Rotation complexity**: 文件轮转逻辑可能失败（影响后续写入）
- **Data consistency**: 进程重启可能导致分配历史不完整
- **Log ID collisions**: assignment_log_id 短哈希可能冲突（低概率）
- **Performance impact**: 同步文件写入可能影响响应时间
- **Backup management**: 备份文件积累可能占用磁盘空间

## New Risks from Phase 19 / 包 1 (Pro_v1.07.51)
- **File reading errors**: JSONL 文件读取可能失败（权限、损坏）
- **Memory usage**: 流式读取但统计可能消耗内存（大量数据时）
- **Time filter accuracy**: 时间过滤可能不准确（时区、时钟偏移）
- **JSON parsing errors**: 损坏的 JSONL 行可能导致脚本失败
- **Performance**: 大文件处理可能较慢（流式读取缓解）
- **Output format changes**: JSON 输出格式可能不兼容下游工具

## New Risks from Phase 19 / 包 2 (Pro_v1.07.52)
- **Timestamp data quality**: first_pending_at 字段可能缺失或不准确（影响 SLA 计算）
- **Duplicate session handling**: 同 session 重复记录过滤可能误判
- **Percentile calculation accuracy**: p50/p90 分位计算可能不准确（小样本时）
- **SLA target sensitivity**: 默认 15 分钟 SLA 目标可能不适合所有业务场景
- **Timezone handling**: 时间戳时区处理可能不一致
- **Missing data impact**: dropped_missing_timestamps 可能掩盖数据质量问题

## New Risks from Phase 19 / 包 3 (Pro_v1.07.53)
- **Timezone complexity**: 简单时区处理可能不准确（生产环境需要完整 IANA 时区支持）
- **Trend calculation reliability**: 小样本趋势分析可能产生误导性结果
- **Alert false positives**: 警报规则可能产生误报（如低流量时）
- **Date range handling**: 日期范围生成可能受系统时钟影响
- **Performance with large datasets**: 多日数据分析可能较慢（流式读取缓解）
- **Output format stability**: 日报 JSON 结构可能变化影响下游集成

## New Risks from Phase 20 / 包 1 (Pro_v1.07.54)
- **Webhook misconfiguration**: 外呼 webhook URL 误配可能导致警报丢失或发送到错误端点
- **Secret leakage**: CHATFLOW_OPS_ALERT_SECRET 可能泄露（环境变量安全）
- **Throttling bypass**: 简单文件锁节流可能被并发执行绕过
- **Network dependency**: 外呼依赖网络连通性，失败时回退到 stdout 可能不够及时
- **Alert spam**: 即使有节流，频繁变化的 flags 仍可能产生过多警报
- **State file corruption**: .last-alert.json 文件损坏可能导致节流失效

## New Risks from Phase 20 / 包 2 (Pro_v1.07.55)
- **Parameter tuning errors**: 自动调参可能产生错误建议（误调参）
- **Cooldown bypass**: 冷却期可能被手动修改状态文件绕过
- **Aggressive mode risks**: aggressive 模式可能建议不安全的变更
- **State file conflicts**: 多实例运行可能导致状态文件冲突
- **Performance metric reliability**: 基于小样本的性能指标可能不可靠
- **Export command misuse**: 生成的 export 命令可能被误用或误执行

## New Risks from Phase 21 / 选项 B (Pro_v1.07.56)
- **File path security**: 运行时配置文件路径可能指向敏感位置（依赖部署环境）
- **JSON parsing failures**: JSON 解析失败可能导致配置回退，但错误日志可能暴露文件内容
- **SIGHUP availability**: Windows 不支持 SIGHUP，配置重载需重启进程
- **Memory overlay staleness**: 内存覆盖层在进程重启后丢失，需重新加载文件
- **Priority confusion**: 用户可能误解「env 为基底，JSON 仅覆盖文件中出现的键」的优先级规则
- **Whitelist enforcement**: 非白名单键被忽略可能掩盖配置错误
- **Concurrent reload races**: SIGHUP 重载期间可能读取到部分更新的配置

## New Risks from Phase 21.2 (Pro_v1.07.57)
- **Accidental overwrite**: 误开关 CHATFLOW_OPS_AUTOTUNE_WRITE_RUNTIME=1 可能覆盖生产 JSON
- **Merge conflicts**: 深合并策略可能意外覆盖其他手动修改的配置键
- **File permission issues**: autotune 脚本可能没有写入目标文件的权限
- **Timing mismatch**: autotune 写文件后，进程未及时 SIGHUP 导致配置不一致
- **Partial write failures**: 文件写入失败可能导致配置处于不一致状态
- **Whitelist mapping gaps**: autotune 建议的变更可能无法正确映射到运行时配置白名单键

## New Risks from Release Automation Expansion (2026-04-06 evening)
- **Artifact drift**: 多个 zip 产物并存可能导致发错版本（mitigation: `delivery:latest` + SHA256）。
- **Operator over-trust**: 一键脚本成功不代表客户环境已接入（token/HTTPS 仍需 onboarding 执行）。
- **Local environment dependence**: `docs:pdf:162` 依赖本机浏览器打印能力，跨环境可重复性有限。
- **Cleanup misuse**: `delivery:clean` 的 `--keep` 设置过小可能误删需要留档的旧包。

## New Risks from Delivery Message Automation (2026-04-06 late)
- **Stale CI snapshot**: `delivery:message` 读取“最新 ci.yml run”，若刚 push 可能短暂显示 queued/上一条结果（mitigation: 发包前复跑一次该命令确认 completed/success）。
- **Path disclosure risk**: 默认输出本机绝对路径，若对外渠道不适合可改为制品下载链接。
- **Operator copy error**: 人工二次编辑文本可能引入版本/哈希错配（mitigation: 尽量原样复制 `delivery:message` 输出）。

## Pro_v1.06 Known Limitations
- **Session store**: In-memory only, single-process, no TTL expiration
- **JSONL persistence**: Backup accumulation, no automatic cleanup
- **Field extraction**: Regex-based, limited validation (edge cases)
- **FAQ content**: Placeholder seeds, English-only, minimal coverage
- **Intent dispatch**: Placeholder only, no real classification
- **Concurrency**: Single-writer JSONL, session store last-writer-wins

## Mitigation Status (Pro_v1.06)
- ✅ Dual webhook baseline verified intact after changes
- ✅ Compilation passes (npm run build successful)
- ✅ Minimal scope maintained (no state machine, no assignment logic, no handoff integration)
- ✅ Shared pipeline integration (Telegram & Website use same logic)
- ✅ Cross-turn merging tested and working (now across requests!)
- ✅ Evidence alignment verified (session ↔ debug_metadata)
- ✅ Outbound logic tested (partial prompts, captured confirmation)
- ✅ Captured persistence implemented (file-based, failure-safe)
- ✅ Git-ignore prevents real leads in repository
- ✅ In-memory session store enables cross-request continuity (1000 cap)
- ✅ User-visible prompt merge implemented and tested
- ✅ Four-language i18n implemented (zh/en/vi/ms-MY)
- ✅ Empty-reply fallback implemented
- ✅ FAQ matching restored (gate fixed)
- ✅ JSONL rotation implemented (5MB/10k lines)
- ⚠️ Field extraction needs improvement for edge cases
- ⚠️ Session TTL expiration not implemented
- ⚠️ Backup cleanup not implemented
- ⚠️ No validation of extracted/persisted data
- ⚠️ Prompt formatting may need channel-specific adjustments
- ⚠️ i18n translations may need refinement
- ⚠️ FAQ seeds need real content and multilingual support

## New Risks from Phase 22B Closure (Pro_v1.07.62)
- **Historical session residue**: 开关关闭后会阻断新流程推进，但历史内存 session 状态未主动清空，跨轮可能看到旧状态痕迹。

## New Risks from Phase 22C Closure (Pro_v1.07.65)
- **Historical session residue (延续)**：22C 各开关变更后仍**不主动清空**进程内 session；租户侧可能短期看到与旧状态叠加的行为，需运营知晓或后续做显式 session 重置策略。
- ~~**Non-primary suppress/send paths**~~ **Phase 23 收官审计（已核对）**：生产 **channel 用户回复** 仅 **`src/webhooks/*.ts` → `runUnifiedInboundPipeline` → `UnifiedResponse.should_send` → `createChannelSender`（`src/channels/outbound-sender/index.ts`）**；**`real-send` 适配器**无 webhook 外直接调用。**Handoff env suppress** 仅 **`src/channels/conversation-runtime/policy.ts`** + **`src/config/suppress-reply.ts`**，经 pipeline 注入 `suppress_reply_tenant_enabled`。**`src/channels/outbound-sender/mock.ts`** 为测试辅助。**HTTP notify**（lead/handoff）走 **`notify.enabled`**，**非** `bot.enabled` 子集（设计如此）。
- **FAQ fallback scope**：`faq.fallback_enabled` 仅接管 **FAQ resolver 语言/跨语言回落**与 **default 阶段用户原文回显**；**`post_capture` / `capture` 阶段 i18n 引导文案**不在本开关内，产品预期需与文档一致，避免误配。
- **Env vs tenant credential ambiguity**：**租户路径**下 POST/GET 校验已与进程 env **解耦**（22D）；**legacy** 仍依赖 env；**Telegram/Zalo** POST 无 body 验签、与 Meta/Line/Website 行为不一致 — **运维口径见 `docs/175`；租户边界 CI 已 22E 接入**。
- **Phase 22E 尾项（idle GET）— superseded by Phase 23**：**idle GET 保留 200** 为**产品裁决**（选项 A），与 **hub challenge 必配 verify token** 并存；**非矛盾** — 见 **`docs/175`** §「Idle GET — product freeze」与 **`memory/03`**。~~易被误读~~ → 已通过文档冻结缓解。

## Known SaaS MVP boundaries (Phase 23 — accepted, not backlog)

- **Tenant path slug exposure**：`GET /webhooks/t/<slug>/...` — 无效 slug → **404** `tenant_not_found`；有效 slug + idle GET → **200** JSON。存在**租户存在性**推断面；**MVP 接受**，后续若需可改路由/鉴权而非单独「收紧 idle」。
- **Idle GET information surface**：响应含 **`channel`**、**`verification`** 说明串；**无密钥**；与 **legacy** `/webhooks/<channel>` idle 行为同类。**探活**应优先 **`GET /health`**（`src/server.ts`），避免将 webhook URL 当作正式健康契约。

## Phase 23 closure / Phase 24 handoff (2026-04-07)

- **Phase 23 closed**：**SaaS MVP Final Closure** sealed — 见 **`memory/01`**、**`memory/02`**、**`docs/175`**（MVP status 段）。
- **叙事切换**：后续 SaaS 工作为 **Phase 24 — SaaS v1 Hardening**（认证/RBAC、Postgres、多实例 store、凭证安全），**不再**把 MVP 当作未完成功能主线。

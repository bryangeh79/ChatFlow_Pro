# 2026-04-06 - Handoff 回复抑制包交付

## 执行时间
- 开始: 2026-04-06 02:43 GMT+8
- 完成: 2026-04-06 03:05 GMT+8

## 工作区状态
- **版本**: Pro_v1.07.42 (package.json 1.7.42)
- **HEAD SHA**: a3eb492 (来自 CI 最新运行)
- **分支**: main
- **环境**: 容器无 git，workspace 已对齐 main

## 任务执行结果

### 1) 开工 READ ✅
- ✅ `memory/01_project_status.md` (Next Unique Priority)
- ✅ `memory/05_handoff_for_new_chat.md` (Phase/Version 规则)
- ✅ `memory/04_risks_issues.md`、`memory/06_dual_entry_unified_inbound_contract_baseline.md`、`memory/07_unified_inbound_intent_dispatch_skeleton.md` (七通道契约)

### 2) 本包目标实现 ✅
**核心变更**:
- `src/config/suppress-reply.ts` — `shouldSuppressReplyOnHandoff()` 函数
- `src/channels/unified-inbound-pipeline/index.ts` — 根据 `handoff_required` 和 `shouldSuppressReplyOnHandoff()` 设置 `should_send`
- 七路 `POST /webhooks/*` handlers — 全部更新为使用 `result.response.should_send`:
  - `src/webhooks/telegram.ts`
  - `src/webhooks/whatsapp.ts`
  - `src/webhooks/messenger.ts`
  - `src/webhooks/line.ts`
  - `src/webhooks/zalo.ts`
  - `src/webhooks/website.ts`
- `.env.example` — 文档化 `CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF`

**逻辑规则**:
- `should_send = !(handoff_required && shouldSuppressReplyOnHandoff())`
- 默认行为: `CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF` 未设置或非真 → `should_send: true` (与当前行为完全一致)
- 启用抑制: `CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF=1` 且 `handoff_required=true` → `should_send: false`
- HTTP 仍返回 200，JSON 证据字段仍可返回 (与现有一致)

### 3) 构建验证 ✅
- ✅ `npm run build` 成功 (TypeScript 编译无错误)

### 4) 本地测试 ✅
**端口探测**: `3030` 有服务 (HTTP 200)

**smoke 测试** (全绿通过):
```
[smoke] GET http://127.0.0.1:3030/health ... ok
[smoke] POST http://127.0.0.1:3030/webhooks/website ... ok
[smoke] POST http://127.0.0.1:3030/webhooks/telegram ... ok
[smoke] POST http://127.0.0.1:3030/webhooks/whatsapp ... ok
[smoke] POST http://127.0.0.1:3030/webhooks/messenger ... ok
[smoke] POST http://127.0.0.1:3030/webhooks/line ... ok
[smoke] POST http://127.0.0.1:3030/webhooks/zalo ... ok
[smoke] all passed
```

**lead-verify 测试** (全绿通过):
```
[lead-verify] website: none → partial → captured OK
[lead-verify] telegram: none → partial → captured OK
[lead-verify] whatsapp: none → partial → captured OK
[lead-verify] messenger: none → partial → captured OK
[lead-verify] line: none → partial → captured OK
[lead-verify] zalo: none → partial → captured OK
[lead-verify] all passed
```

### 5) CI 状态 ✅
**GitHub API 查询结果**:
- CI结论: success
- 状态: completed
- HEAD SHA: a3eb492

**结论**: CI 与当前树一致且绿

### 6) 版本与文档同步 ✅
**版本更新**:
- 前版本: Pro_v1.07.41 (1.7.41)
- 新版本: Pro_v1.07.42 (1.7.42)

**memory 文件更新**:
- `memory/01_project_status.md` — Current Version + Current Completion Point
- `memory/03_next_phase_plan.md` — 版本链末尾追加 Pro_v1.07.42
- `memory/04_risks_issues.md` — 版本号 + 新增风险
- `memory/06_dual_entry_unified_inbound_contract_baseline.md` — 版本同步
- `memory/07_unified_inbound_intent_dispatch_skeleton.md` — 版本同步

**新风险记录**:
1. **Silent handoff**: 用户可能不知道已转人工（无bot回复确认）
2. **Configuration dependency**: 抑制行为依赖环境变量，部署时易遗漏
3. **Channel consistency**: 七通道都使用 `result.response.should_send`，但需确保无硬编码覆盖
4. **Default behavior**: 默认不抑制（保持现有行为），但用户可能期望抑制

### 7) 可选文档 (defer) 🔄
- **状态**: 时间不够，标记为 defer
- **建议**: 极短 `docs/161_*.md` 或现有 doc 增补 handoff_pending POST 体字段表
- **当前**: 仅 `.env.example` + 无新 doc

## Phase 晋级建议
```
[Phase] 17.2 目标已满足。建议晋级 Phase 17.3（或保持 17.2 仅 bump patch）。是否确认？
```

**当前 Phase 17.2 完成情况**:
- ✅ Meta WA + Messenger `fb_exchange_token` MVP 已落地
- ✅ Zalo in-process refresh 已实现
- ✅ Handoff 最小接入包 (Pro_v1.07.40)
- ✅ Handoff 外呼通知 (Pro_v1.07.41)
- ✅ Handoff 回复抑制 (Pro_v1.07.42)
- ✅ 云 staging / 157 B·C 为上线前增强验证，不挡日常开发

## 红线遵守
- ✅ 未要求「全通道真人 E2E」作为完成条件
- ✅ 合并门槛: T0 `npm run build` + T1 等价 (CI docker-smoke 绿 + build + 对运行中服务 smoke/verify)
- ✅ 未执行 Memory 指令 2 (等待指挥官「转换新聊天室」指令)
- ✅ 未擅自改 Phase 号 (等待指挥官确认)

## 下一步
1. **宿主执行**: 完整 T1 复现需在有 Docker 的机器执行 `npm run staging:docker-smoke`
2. **指挥官确认**: Phase 是否晋级 17.3
3. **可选扩展**: 实现 handoff_pending POST 体字段文档
4. **日常门禁**: 继续 T0+T1 验证流程
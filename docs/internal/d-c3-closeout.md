# Phase D-C3 — Closeout 真源（只读对账 + 单键人工闭环）

**状态**：**D-C3 当前子线收口**（D-C3A + D-C3B 已交付；**不**进入 D-C3C）  
**版本锚点**：`package.json` **1.7.105**（D-C3 收口文档 + `verify:d-c3-closeout` bundle）  
**日期**：2026-04-09  

---

## 1. D-C3 解决了什么

- **可定位**：在 Postgres dedupe 真源上，对 **G1（notify）/ G2（outbound）/ G3（inbound）** 给出 **DB-only 启发式**可疑行清单（stale `processing`），见 D-C3A。
- **可单键人工闭环**：在工单与证据前提下，对 **单租户 + 单 lane + 单主键** 做 **dry-run 预演**与 **apply**（`close_as_completed` 或受控的 `release_for_retry`），见 D-C3B。
- **可审计**：每次 **apply** 写入 `dedupe_manual_repair_audit_events`（含前后快照 fp、ticket、operator、result）；可选 D-C1 结构化日志 `dedupe_manual_repair`。
- **默认不双发**：`close_as_completed` **仅 UPDATE/完成 dedupe 行**，**不**调用 notify HTTP、**不**走 outbound sender；不因本工具产生「第二次 notify / 第二次 outbound」。
- **processing 悬挂可识别、不自动乱修**：D-C3A **只列清单**；D-C3B **无**批量 `completed`、**无**默认自动闭合；`release_for_retry` 需显式 ack + 证据，**禁止**用「重发一次」代替对账。

---

## 2. D-C3 没解决什么（明确非目标）

- **自动补偿引擎**（D-C3C 范畴）— **继续冻结**。
- **批量修复**、**范围 UPDATE/DELETE**、**在线 UI**、**公开管理 API**。
- **Redis / 队列 / cron** 驱动的修复或重试。
- **替代理赔式判定**：不能仅凭 DB 行断定「HTTP 一定成功/失败」— 必须 **日志 + 渠道侧** 人工关联。

---

## 3. D-C3A / D-C3B 边界

| 切片 | 职责 | 写库 | 典型入口 |
|------|------|------|----------|
| **D-C3A** | 只读裂隙视图；G1/G2/G3 可疑键清单 | **禁止** | `npm run saas:dedupe:consistency:report` |
| **D-C3B** | 单键人工修复；默认 dry-run；apply 门控 | apply 时 **仅** 目标 dedupe 行 + 审计表 | `npm run saas:dedupe:manual-repair -- ...` |

**顺序真源**：**先 D-C3A → 再 D-C3B dry-run → 证据充分后才 apply**。详见 [`d-c3-operator-runbook.md`](./d-c3-operator-runbook.md)。

---

## 4. 为什么 D-C3C 继续冻结

- **双发风险**：自动补偿若误判「本地错、下游未成功」，可能 **重复 notify/outbound**，与 D-B3/D-C3 红线 **「宁可告警，不可双发」** 冲突。
- **证据链不足**：当前真源 **不**具备全链路、全渠道、无歧义的「下游成功」自动判据；需 **D-C3C 单独立项 + 新 ADR** 才能讨论窄自动化。
- **范围控制**：D-C3 收口目标是 **治理闭环（定位 + 人工 + 审计）**，**不是**开工补偿工程。

---

## 5. 什么叫「当前一致性治理最低标准已成立」

同时满足：

1. **可定位** — 运维能用 D-C3A 在 PG 上拉出可疑键（含 `idempotency_key_fp`、lane、证据字段提示）。  
2. **可单键人工闭环** — 能用 D-C3B 对 **一条** 键 dry-run / apply，且受 ticket + env + 二次确认约束。  
3. **可审计** — apply 落 `dedupe_manual_repair_audit_events`，可追溯 who/why/ticket。  
4. **默认不双发** — 闭合路径不触发下游 HTTP 重发。  
5. **processing 悬挂可识别但不自动乱修** — 清单可出；**无**自动批量改 `completed`、**无**无证据 `release`。

---

## 6. 必须回答清楚的五个问题（验收口径）

### 6.1 当前最危险的一致性裂隙是什么？

仍是 **G1 / G2**：**下游（notify HTTP / 渠道 outbound）已成功，但本地 dedupe 未完成 CAS 闭合**（或等价的「日志显示成功、表仍 `processing`」）。  
G3（inbound processing 悬挂）风险形态不同（管线未完成 vs 已完成未写回），**同样禁止**无证据自动 `completed`。

### 6.2 当前系统已经能做什么？

- 只读识别（D-C3A）  
- 单键 dry-run（D-C3B）  
- 单键 apply 闭合或受控删行重试（D-C3B + 审计）  
- 审计追踪  
- **工具路径上**禁止二次下游发送（`close_as_completed` 无 HTTP）

### 6.3 当前系统还不能做什么？

- 自动补偿、批量修复、在线自动闭合  
- 基于猜测的 `completed`  
- 通用后台化操作台、对外修复 API

### 6.4 哪些动作仍然绝对禁止？

- 改 **idempotency 主键语义**（换键、挪 tenant）  
- **乱改 version**（绕过 CAS 语义）  
- **批量**改 `processing` / `completed`  
- **用重发消告警**（以 HTTP 重试代替对账）  
- **跳过 dry-run** 直接做 **范围** apply（本工具亦不支持范围）

### 6.5 什么才算 D-C3 当前最低治理标准成立？

与 **§5** 一致：**可定位、可单键人工闭环、可审计、默认不双发、悬挂可识别但不自动乱修**。

---

## 7. 关联真源与验收

- **运维步骤**：[`d-c3-operator-runbook.md`](./d-c3-operator-runbook.md)  
- **演练/验收清单**：[`d-c3-acceptance-checklist.md`](./d-c3-acceptance-checklist.md)  
- **D-C3A 规格**：[`d-c3a-readonly-recon-spec.md`](./d-c3a-readonly-recon-spec.md)  
- **D-C3B 规格**：[`d-c3b-manual-repair-spec.md`](./d-c3b-manual-repair-spec.md)  
- **CI/重复验证**：`npm run verify:d-c3-closeout`（build + D-C3A verify + D-C3B verify + 收口资产检查）

---

## 8. 关闭声明

**Phase D-C3（A+B）在当前仓库边界内视为收口完成**：交付物为文档 + runbook + 验收清单 + verify bundle；**不**启动 D-C3C。**后续**若要做自动补偿，须 **新开立项与 ADR**，**不得**沿用本 closeout 作为「已批准开工 D-C3C」的依据。

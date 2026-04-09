# D-C4C — CI / RC / Staging 门禁策略（C2 · 实现真源）

**Phase**：D-C4C **实现（仅 C1+C2）**  
**版本基线**：自 `package.json` **1.7.108** 起与 C1 同锚。  
**配套**：[`d-c4c-readonly-governance-bundle-spec.md`](./d-c4c-readonly-governance-bundle-spec.md) · [`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md)  

---

## 1. 三级门禁语义（钉死）

| 级别 | 含义 | 典型动作 |
|------|------|----------|
| **Block release** | 失败则 **禁止**合并 / 禁止晋级 RC / 禁止视为「构建可交付」 | CI job **失败**；退出码非零 |
| **Manual review** | 失败或异常 **不**自动挡 CI，但必须 **登记工单 / 人审** 后才能发布 | 见下表「Staging 手跑」 |
| **Evidence only** | 仅产生 **归档证据**（日志、JSON），**不**改变流水线红绿 | 可选 `report:*`、演练输出 |

---

## 2. CI（GitHub Actions · `main` / `master` PR 与 push）

| 步骤 | 内容 | 门禁级别 |
|------|------|----------|
| Install + **Build** | `npm ci` + `npm run build` | **Block**（已有） |
| **D-C4C 只读 bundle** | `npm run verify:d-c4c-readonly-governance-bundle:ci` | **Block**（**新增**；与 build 同 job，接在 Build 后） |
| `check:staging-env` | 环境键 **SET/MISSING** 摘要 | **Block**（已有；无密钥值） |
| `report:agent-git` | Git 元数据 | **Block**（已有） |
| `staging:docker-smoke` | 独立 job | **Block**（已有） |
| `tenant-boundary-verify` | 条件 job | **Block**（条件满足时） |

**不在 CI 默认跑**：`saas:recovery:readonly-check`（需真实或容器化 PG 与配置，归属 **Staging / manual review**）。

---

## 3. RC（发布候选 / 内部晋级）

| 动作 | 命令 | 门禁级别 |
|------|------|----------|
| 发布前最小链 | `npm run verify:d-c4c-readonly-governance-bundle`（或已 build 则用 `:ci`） | **Block**（与 CI 等价口径） |
| 交付侧既有 verify | `delivery:health:l1` / `l2`、既有 acceptance 脚本 | 按交付 SOP；**不**在本文件改脚本行为 |

**Manual review**：RC **晋级生产**前，若本轮含 **restore/rollback**，仍须按 D-C4B 跑 **`saas:recovery:readonly-check`** 并 **书面**归档 — **非**本 bundle 替代。

---

## 4. Staging

| 动作 | 命令 | 门禁级别 |
|------|------|----------|
| 与 CI 同构回归 | `npm run verify:d-c4c-readonly-governance-bundle:ci`（部署流水线已 build 时） | **Block**（推荐与 CI 一致） |
| **真实 PG 恢复治理信号** | `npm run saas:recovery:readonly-check`（配置 `CHATFLOW_SAAS_DB_DRIVER=postgres` 等） | **Manual review** — 结果写入工单；`freeze_no_go` **不**自动修复 |
| 演练 | [`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md) §2 | **Evidence only**（纸面/模板） |

---

## 5. 生产

| 动作 | 策略 |
|------|------|
| 本 bundle | **不**作为生产定时任务默认；**不**挡生产流量 |
| 恢复后处置 | **仅** D-C4B 决策表 + 手跑 D-C4A + D-C3 路径 |

---

## 6. 与 D-C3B / D-C4A / D-C4B 边界

- **D-C3B**：任何门禁 **不得**因 bundle 失败而 **自动**或 **暗示**执行 `saas:dedupe:manual-repair --apply`。  
- **D-C4A**：`runRecoveryReadonlyCheck` **语义不变**；bundle 仅复用 **现有** `verify:d-c4a-recovery-readonly-check`。  
- **D-C4B**：人工分流与演练 **仍以** `d-c4b-recovery-decision-table.md` 为准。  

---

## 文档状态

| 项 | 值 |
|----|-----|
| **范围** | **C2** |
| **写路径** | **无** |

# Phase 21 / 选项 B — 最终交付报告

**项目**: ChatFlow Pro  
**交付物**: Handoff 运行时配置重载（JSON 覆盖层 + Unix SIGHUP）  
**版本**: **Pro_v1.07.56**（`package.json` **1.7.56**，相对 1.7.55 **patch +1**）  
**ADR**: `docs/165_phase21_handoff_autotune_config_reload_admin_api_adr.md`（选项 **B** 已落地；**C** 仍为未来）

---

## 1. 实现规格

| 项 | 说明 |
|----|------|
| **新增环境变量** | `CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH`（可选；未设置则与历史行为一致，仅 `process.env`） |
| **优先级规则** | **env 为基底**；JSON **仅覆盖文件中出现的键**；未出现的键回退 env |
| **白名单键** | `assign_mode`, `auto_assign_owner`, `owner_pool`, `tag_map`, `agent_status`, `assign_balance`, `assign_sticky_ttl_min` |
| **刷新时机** | 进程启动时加载一次；**Unix** 注册 **SIGHUP** 同步重载；**Windows** 无 SIGHUP，需**重启进程**生效 |
| **实现落点** | `src/config/handoff-assign.ts` — **env 基底 + 内存覆盖层**；`src/server.ts` 启动时调用 `initHandoffRuntimeConfig()` |
| **热路径约束** | Webhook / assign 路径**不读盘**；仅启动与信号处理读文件 |

### 错误与边界（实现约定）

- 文件不存在：视为无覆盖，不中断启动。  
- JSON 非法：打 error 日志，**保留上一次成功覆盖层**。  
- 非白名单键：warn 后忽略。

---

## 2. 验收结果

| 门禁 / 检查 | 结果 |
|-------------|------|
| **`npm run build`（T0）** | ✅ 通过（交付前在工作区已执行） |
| **代码结构** | ✅ 符合 §1 规格（覆盖层 + 白名单 + SIGHUP） |
| **优先级规则** | ✅ env 基底 + JSON 部分覆盖 |
| **SIGHUP** | ✅ Unix 注册与重载逻辑就位 |
| **Windows** | ✅ 启动日志说明需重启；不依赖 SIGHUP |

### CI 说明（与 Git SHA 对齐）

- **`8199760ac905035565a2952c6fbbde07789c5644`**：为 **Phase 21 代码合入前** `main` 上已存在的提交；针对该基线的 **GitHub Actions 最近一次运行成功**（指挥官确认）。  
- **Phase 21 实现**合入 `main` 后，应以**新 HEAD** 触发的 CI 为权威；合入前以本地 **T0** 为准。有 Docker 时建议再跑 **`npm run staging:docker-smoke`（T1）**；无 Docker 见 **`docs/155`** *T1 equivalence*。

---

## 3. 文档与记忆更新

| 文档 | 更新内容 |
|------|----------|
| **`.env.example`** | ✅ `CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH` 说明 + JSON 示例 |
| **`docs/165`** | ✅ Status：**B 已落地**（路径 + SIGHUP + 优先级）；C 未做 |
| **`memory/01`** | ✅ **Current Version** → Pro_v1.07.56；**Current Completion Point** 追加 Phase 21 / 选项 B（文档口径 **Current Phase** 仍为 **Phase 17.2**，与 Meta WA/Messenger 阶梯一致） |
| **`memory/03`** | ✅ 版本链追加 **Pro_v1.07.56** |
| **`memory/04`** | ✅ Phase 21 相关风险（SIGHUP/Windows、并发重载等） |

---

## 4. 明确未做（防范围膨胀）

- ❌ **`docs/165` 选项 C**：最小 admin **HTTP** 未实现  
- ❌ **`docs/161`**：notify 契约**未改**  
- ❌ **Unified inbound 路由**：**未改**  
- ❌ **`scripts/run-handoff-autotune.mjs`**：尚未改为写入本 JSON（可后续立项）

---

## 5. 版本与阶段摘要

- **package.json**: **1.7.55 → 1.7.56**（patch +1）  
- **Current Version**: **Pro_v1.07.56**  
- **交付里程碑**: **Phase 21 / 选项 B 完成**（运行时 handoff 调参 JSON 重载）  
- **文档 Phase 字段**（`memory/01` 顶部）: 仍为 **Phase 17.2**，直至指挥官在 `memory/03` 立项并确认晋级

---

## 6. 下一步（运营 / 产品）

1. 生产对接 **`docs/161`**（含 `request_id` 等字段）。  
2. 新客户阅读 **`docs/162`**（PDF）。  
3. 可选 **`npm run dev:notify-echo`** 本地验证 lead/handoff POST。  
4. 按需启用 notify / suppress / assign-strategy / runtime JSON 等能力。  
5. 有 staging URL 后按 **`docs/157`** 跑全量验证。

---

## 7. 参考路径

- 实现：`src/config/handoff-assign.ts`，`src/server.ts`  
- 手动验证辅助：`test-handoff-runtime-config.js`（若存在于仓库）  
- 过程记录（若保留）：`memory/2026-04-06-phase21-delivery.md` — 与本文档并存时，**以本文档 `docs/166` 为对外最终交付口径**

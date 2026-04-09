# D-C4C — 只读治理 verify bundle 规格（C1 · 实现真源）

**Phase**：D-C4C **实现（仅 C1+C2）**  
**版本基线**：自 `package.json` **1.7.108** 起锚定（前序 **1.7.107** = D-C4B 收口）。  
**性质**：**只读**；**不是**修复器；**不**改 D-C3A / D-C3B / D-C4A / D-C4B 语义。  

---

## 1. 可执行入口

| 入口 | 命令 | 说明 |
|------|------|------|
| **完整 bundle（本地 / RC 一键）** | `npm run verify:d-c4c-readonly-governance-bundle` | 含 **`npm run build`** |
| **CI 用（已 build 后）** | `npm run verify:d-c4c-readonly-governance-bundle:ci` | **`--skip-build`**，避免重复编译 |

实现脚本：`scripts/verify-d-c4c-readonly-governance-bundle.mjs`。

---

## 2. Bundle 成员（钉死 · 全程只读）

| 顺序 | 成员 | 类型 | 作用 |
|------|------|------|------|
| 1 | `npm run build` | 编译 | 保证 `dist/` 与后续 `import` 一致；**无**业务 DB 写 |
| 2 | `verify-saas-db-migration-assets.mjs` | 只读文件 + registry | 迁移 **资产** 与 checksum 在仓库内一致（**无** `execute`） |
| 3 | `verify-d-c4a-recovery-readonly-check.mjs` | 只读源码约束 + sqljs 烟测 | D-C4A **不得**调用 `adapter.execute`；sqljs 路径 `postgres_only` / `observe` |
| 4 | **文档存在性** | `existsSync` | `d-c4c-readonly-governance-bundle-spec.md`、**本仓库** `d-c4c-ci-rc-staging-gates.md` 存在（防误删真源） |

**明确不包含**（另立项）：生产 Postgres 上跑 `saas:recovery:readonly-check`、deployment-info 与运行镜像 tag 的在线对账、任何 D-C3B / repair CLI。

---

## 3. 运行环境

| 环境 | 推荐命令 | DB / 密钥 |
|------|----------|-----------|
| **开发者本机** | `npm run verify:d-c4c-readonly-governance-bundle` | **不需要** PG；sqljs 临时目录由 D-C4A verify 创建 |
| **CI（GitHub Actions）** | `build` 后 `npm run verify:d-c4c-readonly-governance-bundle:ci` | **不需要** |
| **RC / 发布候选构建机** | 完整 bundle 或 `:ci`（若已 build） | **不需要** |
| **Staging（有 PG 时）** | 完整 bundle **外加**（**证据 / manual review**）手跑 `npm run saas:recovery:readonly-check` — **不在**本 bundle 内 | 见 [`d-c4c-ci-rc-staging-gates.md`](./d-c4c-ci-rc-staging-gates.md) |
| **生产** | **禁止**将本 bundle 当作「可接流」唯一依据；生产处置仍遵 D-C4B 决策表 + 手跑 D-C4A | 见 D-C4 设计 §7 / 评审包 M5 |

---

## 4. 失败语义（与 C2 对齐）

- Bundle **任一**步骤非零退出 → **对该入口而言**为 **fail**（CI 中 = **block merge**）。  
- **不**根据 `overall_tier` 给出修复建议或调用 D-C3B。  

---

## 5. 与设计真源关系

- 设计锁定：[`d-c4c-design-scope-lock.md`](./d-c4c-design-scope-lock.md)  
- D-C4A 规格（未改）：[`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md)  

---

## 文档状态

| 项 | 值 |
|----|-----|
| **范围** | **C1** |
| **写路径** | **无** |

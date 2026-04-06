# Pro 两天交付核对清单（通道 + 机器人 + lead / handoff / notify）

**商业形态**：一客户一套部署 — **`docs/169_pro_commercial_one_customer_one_deploy.md`**。

**范围冻结（本次交付）**：七通道 webhook、统一入站管道、真发送（按 env）、lead / FAQ / intent、handoff 与可选 notify。**不含**完整坐席工作台产品（另立项）。

---

## A. 无生产 token 也能做（工程收口）

| # | 动作 | 命令 / 文档 |
|---|------|-------------|
| 1 | 构建 + 环境摘要（不打印密钥） | `npm run check:go-live` |
| 2 | CI 与本地一致预期 | `docs/158` CI 说明；无 Docker → `docs/155` T1 等价 |
| 3 | 契约与字段 | `docs/161`（notify、`request_id`）；**§6–§7** 上线核对 |
| 4 | 客户填凭据 | `docs/162`（PDF：`npm run docs:pdf:162`）；表 **`docs/163`** / **`docs/164`** |
| 5 | 本地验 POST（不接真通道） | `npm run dev:notify-echo` + `docs/161` §4 |

---

## B. 有 HTTPS 公网 URL + token 后（联调）

| # | 动作 | 说明 |
|---|------|------|
| 1 | 控制台 webhook URL | 与部署 **同源 HTTPS**，路径 `POST /webhooks/<channel>` |
| 2 | `.env` 仅部署机持有 | **勿** commit、**勿**贴聊天；模板见 **`.env.example`** |
| 3 | Smoke | `SMOKE_BASE_URL=https://… npm run smoke:webhooks`；跳过未接通道见 **`docs/160`** §4.6 |
| 4 | Docker 一键 | `npm run staging:docker-smoke`（**`docs/158`**） |
| 5 | Handoff 运行时 JSON（可选） | **`docs/166`**；autotune 写文件 **`docs/167`** |

---

## C. 交付给客户的最小资料包

1. 本页 + **`docs/162`**（PDF）。  
2. Webhook 基址与健康检查路径（按实际部署）。  
3. 若启用 notify：**`docs/161`** 接收端约定（**2xx**、幂等、**`request_id`**）。

---

## D. 回滚

部署目录保留当前 **`git` SHA**；异常时 `git checkout <sha>` 重建镜像/进程（**`docs/158`** 升级路径）。

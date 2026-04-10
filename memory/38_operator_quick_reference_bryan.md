# Bryan 运维速查（Git / 入口 / VPS / 域名）

> **安全**：勿将真实口令、Bot Token、数据库密码写入 Git。下列「密钥」只写**变量名**；具体值在 **VPS `/.env`**、**Termius 凭据**、**@BotFather** 或你的私密笔记中保管。

---

## Git

| 项 | 值 |
|----|-----|
| 远程 | `https://github.com/bryangeh79/ChatFlow_Pro.git` |
| 默认分支 | `main` |
| 本机工作区（示例） | `C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro` |
| VPS 代码目录（当前） | `/opt/chatflow/ChatFlow_Pro` |
| 拉代码 | `git clone https://github.com/bryangeh79/ChatFlow_Pro.git` → `cd ChatFlow_Pro && git checkout main && git pull` |
| 构建与启动 | `npm ci` → `npm run build` → `PORT=3050 node dist/src/index.js`（或 systemd，见下） |

---

## 服务端口与健康检查

| 项 | 说明 |
|----|------|
| 默认 `PORT`（未设置时） | 代码里默认 **3030**（见 `src/server.ts`） |
| VPS + Nginx 当前约定 | 常设为 **3050**（须与 Nginx `proxy_pass` 一致） |
| 健康检查 | `GET http://127.0.0.1:<PORT>/saas/v1/health` |
| 简单探活 | `GET http://127.0.0.1:<PORT>/health` |

---

## 浏览器入口（把 `HOST:PORT` 换成实际）

**同一台 ChatFlow 进程**同时提供 HTML Shell 与 `/saas/v1/admin/...` API。本地示例：`http://127.0.0.1:3050`。

| 名称 | 用途 | URL 路径 |
|------|------|----------|
| **租户后台（Tenant App）** | 租户运营：Overview、Channels、Settings、Telegram 向导等 | `http://HOST:PORT/app/`（任意子路径如 `/app/overview` 由前端 SPA 处理） |
| **平台后台（Platform Admin）** | 平台侧：租户列表、租户详情、Login 等 | `http://HOST:PORT/platform/` |
| **旧版 SaaS Admin（Legacy）** | 早期单页管理入口（若仍使用） | `http://HOST:PORT/saas/admin` 或 `http://HOST:PORT/saas/admin/` |
| **不建议** | 根路径直接打开 `saas-admin.html` 文件名 | `/saas-admin.html` 不在当前 `server.ts` 白名单时可能 **404** |

**公网（当前架构）**：API/Webhook 域名 **`https://api.starbright-solutions.com`** 反代到本机 Node；浏览器也可打开 `https://api.starbright-solutions.com/app/`、`/platform/`（若你希望从公网进后台，需自行评估暴露面并加防护）。

---

## 密钥与 Bearer（只记名字，值在 .env）

| 角色 | 环境变量 / 来源 | 用法 |
|------|-----------------|------|
| 平台管理员 API | `CHATFLOW_SAAS_ADMIN_TOKEN` | `Authorization: Bearer <值>` 调 `/saas/v1/admin/platform/...`、创建租户等 |
| 租户级 Admin（桥接） | `CHATFLOW_SAAS_TENANT_ADMIN_TOKENS`（JSON：`slug`→`token`） | 租户作用域 Admin，需与 URL 中租户 slug 匹配 |
| 只读桥接 | `CHATFLOW_SAAS_TENANT_READONLY_TOKENS` | 只读；**不能**写 `/credentials` |
| Telegram Bot | `TELEGRAM_BOT_TOKEN`（存租户凭据 / DB） | 向导第 2 步 Save；**勿**在聊天或 PR 里贴明文 |
| 数据库 | `CHATFLOW_SAAS_POSTGRES_URL` 等 | 见 `.env.example` |

**租户后台顶栏**：填 **Tenant ID（UUID）** + **Bearer**（常为平台 token 或租户桥接 token，取决于你如何配置）。

---

## 租户标识（非密钥，便于对照）

| 项 | 示例 / 说明 |
|----|-------------|
| 租户 slug | `starbright01`（Webhook 路径、DNS 子域无关，路径里用 slug） |
| 租户 UUID | 以平台详情页 / 数据库为准（曾用 `4935a34c-…` 作教学租户，以你环境为准） |
| Telegram Webhook URL | `https://api.starbright-solutions.com/webhooks/t/starbright01/telegram` |

---

## VPS（Vultr）

| 项 | 值 |
|----|-----|
| 提供商 | Vultr |
| 公网 IPv4（曾用于 `api` A 记录） | `45.32.104.102`（若重装或换机以面板为准） |
| 区域 | Singapore（以实例为准） |
| SSH | **Termius**（或任意 SSH 客户端）连接该 IP；用户常为 `root`（以镜像为准） |
| 项目目录 | `/opt/chatflow/ChatFlow_Pro` |
| 反向代理 | **Nginx**，443 SSL（Let’s Encrypt），`proxy_pass` → `http://127.0.0.1:3050`（与 `PORT` 一致） |
| 防火墙 | `ufw`：`OpenSSH` + `Nginx Full`（或 80/443） |

**systemd 示例单元名**：`chatflow.service`（若已按文档创建）；查日志：`journalctl -u chatflow -f`。

---

## 域名与子域

| 域名 | 用途 |
|------|------|
| `starbright-solutions.com` | 主域；DNS 在 **Cloudflare** |
| `www.starbright-solutions.com` | **Vercel** 站点（前端/营销页），**不是** ChatFlow 默认 Webhook 主机 |
| `api.starbright-solutions.com` | **A 记录 → VPS**；ChatFlow HTTPS + Telegram Webhook；建议 **DNS only（灰云）** 便于源站证书 |

---

## Termius

- 用途：SSH 登录 Vultr、在服务器执行 `git` / `npm` / `nginx` / `curl` / `journalctl`。
- 建议在 Termius 内保存：**主机 IP**、**用户**、**密钥或密码**（仅存 Termius，勿写入仓库）。

---

## 相关记忆文档

- 接手与现场阻塞：`memory/05_handoff_for_new_chat.md`（顶部 2026-04-10 节）
- 风险（Token 泄露、502 等）：`memory/04_risks_issues.md`

---

*文档可随环境变更由你本地更新；提交前请再次确认未包含任何明文密钥。*

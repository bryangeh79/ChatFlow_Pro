# 01 Project Status

**Last updated:** 2026-04-11
**Version:** v1.7.108
**Phase:** PRODUCTION — Testing / Debug / UX 模式（主开发线已关闭）

---

## 基础设施

| 项目 | 值 |
|---|---|
| VPS | 45.32.104.102 (Vultr) |
| 域名 / API | api.starbright-solutions.com:3050 |
| 进程启动 | `export $(cat .env | grep -v '^#' | grep -v '^$' | xargs) && nohup node dist/src/index.js > /tmp/chatflow.log 2>&1 &` |
| DB driver | SQLite / sql.js（`CHATFLOW_SAAS_DB_DRIVER=sqljs`，`CHATFLOW_SAAS_SQLJS_COMPAT=1`） |
| Repo | https://github.com/bryangeh79/ChatFlow_Pro — branch: main |
| 部署命令 | `cd /opt/chatflow/ChatFlow_Pro && git pull origin main && npm run build && export $(cat .env \| grep -v '^#' \| grep -v '^$' \| xargs) && nohup node dist/src/index.js > /tmp/chatflow.log 2>&1 &` |
| 查看日志 | `tail -f /tmp/chatflow.log` |

## 活跃租户

| 项目 | 值 |
|---|---|
| Slug | starbright01 |
| 租户 Token | sb-admin-2026-changeme |
| Dashboard | https://api.starbright-solutions.com/app/ |
| 本地 Admin Token | CFP_Admin_2026!k9R$4vQm2Lp8Xz7（.env.local） |

## 当前状态

| 维度 | 状态 |
|---|---|
| 主开发线 | ✅ CLOSED — 禁止重新开 phase |
| 生产可交付 | ✅ 100% |
| 活跃模式 | 🔍 Testing · Debug · UX 优化 |
| VPS 服务 | ✅ 运行中（最新 commit: 26d9b62） |
| 最新前端 | ✅ Inbox P0 UX 已 push（commit 26d9b62） |

## 已完成功能（封存，禁止重开）

1. ✅ 多租户 SaaS 核心（auth、租户隔离、DB migrations、go-live check）
2. ✅ 统一 inbound pipeline（intent → FAQ → lead capture → handoff → LLM）
3. ✅ Telegram 渠道（webhook + send + inline keyboard + callback_query 处理）
4. ✅ LINE 渠道（webhook + send + quickReply）
5. ✅ FAQ CRUD（dashboard + bulk import + 产品分类）
6. ✅ AI Settings（OpenAI key masked、model selector、test connection）
7. ✅ Bot Settings 三批（persona、welcome_message、welcome_buttons、followup_prompt、leave_message、lead_trigger、多语言 welcome_by_language）
8. ✅ Operator Telegram 通知（handoff 时发消息给员工，含 tg://user?id= 深链接）
9. ✅ Leads 页面（phone/email、留言 badge、留言高亮块）
10. ✅ Inbox 消息时间线（GET /conversations/:id/messages，气泡渲染）
11. ✅ Inbox P0 UX 重构（渠道图标、智能名称、真实预览、4-block 侧栏、固定 header）
12. ✅ isFirstContact 修复（bot_exchange_count === 0）
13. ✅ FAQ 翻译工作台（generate draft、publish）

## 最新 Commits（2026-04-11）

| Commit | 内容 |
|---|---|
| 26d9b62 | feat(inbox): P0 UX 重构（channel icons / smart names / sidebar blocks / conv header） |
| 9da7b11 | fix: restore missing repository exports（新 chat 破坏后修复） |
| d4bff92 | chore: stage all local work before rebase |

## 防护措施（已部署）

- ✅ **pre-push hook**：`git push` 前自动跑 `npm run build`，build 失败则拦截 push
- 路径：`.git/hooks/pre-push`（本机永久生效）

## 已知风险

- sql.js 数据在内存，重启后从磁盘加载，**DB 改动必须重启才生效**
- Bot Token 存 `tenant_credentials` 表（per-tenant），不是全局 .env
- VPS 重启后必须带 .env export 启动，否则走 postgres 路径 crash
- 新 chat Claude 容易动后端文件，已有 pre-push hook 防护 + 交接指令禁区清单

---

## 🚫 禁止触碰的文件（未经明确指示）

```
src/saas/repository.ts          ← 所有 DB 函数，绝对不能删 export
src/saas/db.ts                  ← SQLite schema
src/saas/admin-routes.ts        ← API 路由
src/saas/admin-authorization.ts ← 权限策略
src/saas/db-migrations/registry.ts
src/saas/tenant-runtime-settings.ts
```

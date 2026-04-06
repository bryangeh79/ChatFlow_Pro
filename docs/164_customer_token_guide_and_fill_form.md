# ChatFlow Pro - 七通道 Token 说明 + 客户填写表（单文件）

本文档给客户直接使用：先看「怎么拿」，再在下方「填写表」填值回传。

---

## A. 快速获取入口（客户查看）

### 1) Website（网站通道）
- 非第三方平台领 token，属于企业自有系统对接。
- 需要提供：`Outbound Callback URL`、（可选）`Webhook Signing Secret`、（可选）`Webhook Verify Token`。

### 2) Telegram
- 官方入口：<https://t.me/BotFather>
- 获取：创建 Bot 后拿 `TELEGRAM_BOT_TOKEN`（可选 `Bot Username`）。

### 3) Meta - WhatsApp
- 官方入口：<https://developers.facebook.com/>
- 获取：`WHATSAPP_ACCESS_TOKEN`、`WHATSAPP_PHONE_NUMBER_ID`、`WHATSAPP_APP_SECRET`（或 `META_APP_SECRET`）、`WHATSAPP_WEBHOOK_VERIFY_TOKEN`。

### 4) Meta - Messenger
- 官方入口：<https://developers.facebook.com/>
- 获取：`MESSENGER_PAGE_ACCESS_TOKEN`、`MESSENGER_PAGE_ID`、`MESSENGER_APP_SECRET`（或 `META_APP_SECRET`）、`MESSENGER_WEBHOOK_VERIFY_TOKEN`。

### 5) LINE
- 官方入口：<https://developers.line.biz/console/>
- 获取：`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、（可选）`LINE_WEBHOOK_VERIFY_TOKEN`。

### 6) Zalo OA
- 官方入口：<https://developers.zalo.me/>
- 获取：`ZALO_ACCESS_TOKEN`、`ZALO_OA_ID`、（可选刷新）`ZALO_APP_ID`、`ZALO_APP_SECRET`、`ZALO_REFRESH_TOKEN`、（可选）`ZALO_WEBHOOK_VERIFY_TOKEN`。

> 安全提示：所有密钥/Token 请勿发群聊，使用安全渠道传递。

---

## B. 客户填写表（直接填）

### 1) Website（网站通道）
- Outbound Callback URL (HTTPS):
- Webhook Signing Secret（可选）:
- Webhook Verify Token（可选）:
- 备注:

### 2) Telegram
- Bot Username（例如 @your_bot）:
- TELEGRAM_BOT_TOKEN:
- 是否需要代理（Y/N）:
- 代理地址（如需要）:
- 备注:

### 3) Meta - WhatsApp
- WHATSAPP_ACCESS_TOKEN:
- WHATSAPP_PHONE_NUMBER_ID:
- WHATSAPP_APP_SECRET（或 META_APP_SECRET）:
- WHATSAPP_WEBHOOK_VERIFY_TOKEN:
- 关联 Business 名称:
- 备注:

### 4) Meta - Messenger
- MESSENGER_PAGE_ACCESS_TOKEN:
- MESSENGER_PAGE_ID:
- MESSENGER_APP_SECRET（或 META_APP_SECRET）:
- MESSENGER_WEBHOOK_VERIFY_TOKEN:
- Facebook Page 名称:
- 备注:

### 5) LINE
- LINE_CHANNEL_ACCESS_TOKEN:
- LINE_CHANNEL_SECRET:
- LINE_WEBHOOK_VERIFY_TOKEN（可选）:
- Provider / Channel 名称:
- 备注:

### 6) Zalo OA
- ZALO_ACCESS_TOKEN:
- ZALO_OA_ID:
- ZALO_APP_ID（可选，刷新用）:
- ZALO_APP_SECRET（可选，刷新用）:
- ZALO_REFRESH_TOKEN（可选，刷新用）:
- ZALO_WEBHOOK_VERIFY_TOKEN（可选）:
- 备注:

### 7) 全局运维信息（建议填写）
- 服务器公网域名（例如 chatflowpro01.xxx.com）:
- Caddy / 反向代理管理人:
- 客户技术联系人（姓名 / 电话 / 邮箱）:
- 紧急通知方式:
- 计划上线日期:

---

## 客户确认
- 我确认以上信息可用于 ChatFlow Pro 部署与联调。
- 公司/团队名称:
- 填写人:
- 日期:

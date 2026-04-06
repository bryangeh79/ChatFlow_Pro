# ChatFlow Pro - 客户填写表（七通道凭据）

填写说明：
- 不确定的字段先留空，实施时再补。
- 敏感信息请走安全渠道传递（不要发群聊）。
- 一个平台可能对应多个通道（例如 Meta 同时用于 WhatsApp / Messenger）。

---

## 1) Website（网站通道）
- Outbound Callback URL (HTTPS):
- Webhook Signing Secret（可选）:
- Webhook Verify Token（可选）:
- 备注:

## 2) Telegram
- Bot Username（例如 @your_bot）:
- TELEGRAM_BOT_TOKEN:
- 是否需要代理（Y/N）:
- 代理地址（如需要）:
- 备注:

## 3) Meta - WhatsApp
- WHATSAPP_ACCESS_TOKEN:
- WHATSAPP_PHONE_NUMBER_ID:
- WHATSAPP_APP_SECRET（或 META_APP_SECRET）:
- WHATSAPP_WEBHOOK_VERIFY_TOKEN:
- 关联 Business 名称:
- 备注:

## 4) Meta - Messenger
- MESSENGER_PAGE_ACCESS_TOKEN:
- MESSENGER_PAGE_ID:
- MESSENGER_APP_SECRET（或 META_APP_SECRET）:
- MESSENGER_WEBHOOK_VERIFY_TOKEN:
- Facebook Page 名称:
- 备注:

## 5) LINE
- LINE_CHANNEL_ACCESS_TOKEN:
- LINE_CHANNEL_SECRET:
- LINE_WEBHOOK_VERIFY_TOKEN（可选）:
- Provider / Channel 名称:
- 备注:

## 6) Zalo OA
- ZALO_ACCESS_TOKEN:
- ZALO_OA_ID:
- ZALO_APP_ID（可选，刷新用）:
- ZALO_APP_SECRET（可选，刷新用）:
- ZALO_REFRESH_TOKEN（可选，刷新用）:
- ZALO_WEBHOOK_VERIFY_TOKEN（可选）:
- 备注:

## 7) 全局运维信息（建议填写）
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

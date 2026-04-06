# ChatFlow Pro — 对外发包文本模板（实施/客户可直接复制）

> 用法：优先执行 `npm run delivery:message` 自动生成实参文本；或手工替换 `{}` 占位符后发送。默认口径：一客户一部署，token/真实联调后置到 onboarding。

## 模板正文

各位好，以下为本次 ChatFlow Pro 交付包信息（请按 SHA 校验后再解压部署）：

- 包版本：`{VERSION}`
- 交付 zip：`{ZIP_PATH_OR_LINK}`
- SHA256：`{ZIP_SHA256}`
- CI 记录：`{CI_URL}`

本包包含文档：

- `docs/168_pro_two_day_go_live_checklist.md`
- `docs/169_pro_commercial_one_customer_one_deploy.md`
- `docs/170_pro_customer_ops_runbook.md`
- `docs/171_pro_vendor_release_checklist.md`
- `docs/172_pro_https_reverse_proxy_caddy_nginx.md`
- `docs/161_phase17_notify_webhooks.md`（如启用 notify）
- `docs/162_customer_seven_channel_access_token_guide.pdf`

注意事项（固定口径）：

1. 当前阶段先完成产品工程与交付部署，客户 token/webhook 实配在 onboarding 阶段执行。
2. 请勿在邮件/IM 中直接发送完整密钥；统一使用安全通道。
3. 默认交付模型为一客户一部署，不共享生产密钥与数据卷。


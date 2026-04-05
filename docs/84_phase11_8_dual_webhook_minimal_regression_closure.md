# Phase 11.8 Dual Webhook Minimal Regression Closure

## 1. 当前真实主仓路径

- `C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro`

## 2. 当前最小 HTTP server 已成立

- 当前仓已具备最小 HTTP server
- 该 server 可承载最小 webhook 验证与真实请求回包

## 3. Telegram webhook 路由与端口

- 路由：`POST /webhooks/telegram`
- 端口：`3010`

## 4. Website webhook 路由与端口

- 路由：`POST /webhooks/website`
- 端口：`3010`

## 5. 两边都返回 200

- Telegram webhook 真实请求返回 `200`
- Website webhook 真实请求返回 `200`

## 6. 两边关键字段都仍可见

两边回包中都仍然可见以下关键字段：

- `message`
- `session`
- `response`
- `outboundPayload`
- `sendResult`
- `provider_message_id`
- `debug_steps`

## 7. 两边都仍进入各自最小链路

- Telegram 请求进入 Telegram 最小处理链
- Website 请求进入 Website 最小处理链

## 8. 没有发现一边影响另一边

- Telegram 与 Website 两条最小真实 webhook 入口可并行回包
- 当前未观察到一边影响另一边的现象

## 9. 当前版本

- `Pro_v1.05`

## 10. 当前策略

- 先累计
- 不升级版本

## 11. 结论

本轮已经确认：
- Telegram 与 Website 双入口最小真实 webhook 回归成立
- 两边都返回 `200`
- 两边关键字段稳定可见
- 两边各自最小链路仍然成立
- 当前没有发现互相破坏

当前结果应按收口状态保存，不应立即进入新的功能扩张。
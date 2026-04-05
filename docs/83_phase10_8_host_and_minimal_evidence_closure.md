# Phase 10.8 Host and Minimal Evidence Closure

## 1. 真实主仓路径

- `C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro`

## 2. 本轮新增 / 修改的关键文件

### 新增
- `package.json`
- `tsconfig.json`
- `src/index.ts`

### 修改
- `src/webhooks/verification.ts`
- `src/webhooks/telegram.ts`
- `src/webhooks/website.ts`
- `src/channels/unified-inbound-pipeline/index.ts`
- `src/channels/adapters/line/index.ts`
- `src/channels/adapters/zalo/index.ts`
- `shared/types/unified-response.ts`
- `package.json`

## 3. 最小运行入口是什么

- `src/index.ts`
- 实际启动方式：`node dist/src/index.js`

## 4. build / start 为什么现在成立

- `package.json` 已补齐最小脚本命令
- `tsconfig.json` 已补齐最小编译配置
- `src/index.ts` 已接到最小验证入口
- `npm run build` 已通过
- `npm start` 已能真实启动并运行 `dist/src/index.js`

## 5. 最小实证验证是如何触发的

- 直接运行宿主入口 `node dist/src/index.js`
- 该入口会执行 `runMinimalInboundVerification()`
- 验证同时覆盖：
  - Telegram 常规样本
  - Telegram `/start` 样本
  - Website 对照样本

## 6. 已拿到真实证据的 6 个验证点

以下 6 个点均已从真实输出中确认：

- `inbound_result`
- `outbound_payload`
- `send_result`
- `transport-like step`
- `provider_message_id`
- `Website baseline 未受影响`

## 7. Website baseline 未受影响的结论

- Website 对照样本仍正常返回
- Telegram 最小链路未破坏 Website 的最小对照结果
- 当前没有发现 Website baseline 被改坏的迹象

## 8. 当前版本

- `Pro_v1.05`

## 9. 当前策略

- 先累计
- 不升级版本

## 10. 下一步建议

- 先稳住当前收口结果
- 不立即扩功能
- 等后续需要时，再在这个已成立的宿主上继续推进

## 11. 结论

本轮已经完成：
- 宿主恢复
- 最小编译收口
- 最小实证验证成立
- Website baseline 未受影响

当前结果应按收口状态保存，不应立刻进入新的功能扩张。
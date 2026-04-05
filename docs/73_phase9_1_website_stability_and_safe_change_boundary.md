# Phase 9.1 Website Stability and Safe Change Boundary

## 1. Website 当前真实闭环状态

### 当前真实 inbound / outbound / baseline 状态

Website 现在仍然拥有真实且可复现的闭环：
- inbound 通过 `parseWebsiteInbound`
- 进入 `handleWebsiteWebhook`
- 经过 `createOrUpdateSessionContext`
- 进入 `runUnifiedInboundPipeline`
- 生成 unified response
- 通过 `mapWebsiteOutboundPayload`
- 再进入 `createChannelSender('website')`
- 返回 `sendResult`

### 当前稳定性判断

当前 Website 真实闭环仍是稳定的，并且仍然是项目唯一可信的真实样板。它没有被 Telegram 的最小闭环工作破坏，也没有表现出需要立刻重做的迹象。

### 当前是否可视为可维护的真实参考样板

可以。Website 仍然是可维护、可回归、可作为后续变化基线的真实参考样板。

## 2. Website 当前受保护边界

以下路径、文件、能力应视为保护对象：

- `src/webhooks/website.ts`
- `src/channels/adapters/website/index.ts`
- `src/channels/adapters/website/outbound.ts`
- Website inbound parsing path
- Website outbound mapping path
- Website sender boundary
- Website `UnifiedSendResult` 语义
- Website fallback behavior

### 为什么这些部分不应轻易改动

因为它们构成了 Website 的真实闭环锚点。一旦这些地方被随意改动，项目就会失去当前唯一可信的回归参照，第二通道与后续增强就会更难判断是否安全。

## 3. Website 当前可安全改动范围

### 适合下一轮增强的地方

- Website 真实闭环的稳定性检查和边界确认
- 与 Website baseline 不冲突的可观测性补充
- 仅在必要时做的小范围维护性修补

### 只允许小改的地方

- 与 Website 真实闭环直接相关但不改变语义的轻量修补
- 仅为维持回归可读性所需的微调

### 当前不建议碰的地方

- Website inbound 解析语义
- Website outbound 结果语义
- Website sender / send result 语义
- Website fallback 语义
- 任何会要求共享层跟着改的结构性调整

## 4. 风险判断

### 哪些改动最容易破坏 baseline

最容易破坏 baseline 的改动包括：
- 为了方便其他通道而改 Website 解析
- 为了统一结构而改 Website outbound 语义
- 为了“看起来更整洁”而改 sender / send result 语义
- 直接动 fallback 行为

### 哪些共享层变化会带来回归风险

以下共享层变化风险最高：
- unified inbound contract 形状变化
- unified response / outbound contract 形状变化
- sender / result 语义变化
- fallback 规则变化
- trace / observability 语义变化

### 下一轮最需要防的跑偏点是什么

最需要防的跑偏点是：
**把 Website 的稳定化当成借口，顺手扩成 Telegram 或共享层重构。**

## 5. 下一轮唯一安全入口建议

### 如果进入 Website 增强，唯一第一动作建议是什么

**先做 Website 当前真实闭环的稳定性检查与边界确认。**

### 为什么选它，不选别的入口

因为这是最小、最安全、最能直接验证基线是否仍然稳的入口。它不需要先改功能，也不会把项目带进新的扩展面。相反，如果从功能增强或共享层整理切入，风险会立刻上升。

## 6. memory 判断

### 当前是否达到需要更新 5 个 memory 文件的程度

不需要。

### 原因

本轮只是对 Website 真实闭环进行稳定化检查与边界确认，没有产生新的长期项目事实，也没有改变项目的主路线。它属于阶段内的安全边界确认，不是需要立即写入长期记忆的结构性翻转。

## 7. 结论

Website 当前真实闭环仍然稳定，仍然是第一真实稳定样板。

当前应继续保护的边界是：
- Website inbound / outbound / sender / fallback 语义
- Website 真实闭环路径
- 会影响 Website 回归判断的共享层契约

下一轮如果要增强 Website，唯一安全入口仍然是：**先做真实闭环的稳定性检查与边界确认，再决定最小改动范围。**

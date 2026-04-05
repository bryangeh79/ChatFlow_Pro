# Phase 8.1 Telegram Minimal Real Development Plan

## 1. 本轮目标定义

本轮不是 Telegram 全量开发，也不是把第二通道一次性做完整。**本轮只做 Telegram 最小真实开发方案锁定**，范围限定为：

- Telegram 最小 inbound 接入
- Telegram 最小 response 回传闭环
- 只在必要时碰极少量 shared contract / adapter 边界
- Website 保护优先级高于 Telegram 推进速度

本轮的输出目标是把下一轮代码动作变成可控、可回归、可中止的最小步骤，而不是把 Telegram 扩成完整产品面。

## 2. 最小真实开发闭环范围

### 2.1 Inbound 从哪里进入

Telegram 的消息入口应当只从 Telegram 自己的 edge/adapter 进入，然后映射到现有统一 inbound 结构。推荐路径是：

- Telegram transport / webhook edge
- Telegram adapter / parser
- 映射到 `UnifiedInboundMessage`
- 进入现有 unified inbound pipeline

### 2.2 如何映射到现有 unified inbound 流程

Telegram 只负责把平台原生消息整理成现有共享形状，不重写核心流水线。也就是说：

- Telegram 侧做最小字段提取
- 只保留统一链路真正需要的字段
- 不把 Telegram 平台特殊语义直接塞进核心
- 让现有 pipeline 继续按既有方式处理

### 2.3 Response 从哪里回传

response 只从现有统一 outbound 路径返回，然后由 Telegram sender 负责完成平台输出：

- unified pipeline 产生 response
- 映射到 unified outbound contract
- Telegram sender 发送给 Telegram 平台
- 返回 `UnifiedSendResult`
- 保持现有 fallback 语义

### 2.4 最小 send result / fallback 是否复用现有骨架

是，优先复用现有骨架。只允许在 Telegram edge 上做最小适配，不应为 Telegram 单独复制一套 send result / fallback 体系。

### 2.5 本轮明确不做的能力

本轮不做：
- 完整 Telegram bot 功能
- 菜单系统
- 状态机扩展
- 多轮复杂交互设计
- 用户管理面
- 管理员面联动
- 多渠道共同重构
- 任何会扩大范围的顺手优化

## 3. 文件级改动范围建议

### 3.1 预计会新增的文件

建议新增的文件应尽量只覆盖 Telegram edge 和必要测试：

- `src/adapters/telegram/*`：Telegram intake / outbound adapter 的最小实现或桥接层
- `src/channels/telegram/*`：若现有结构需要明确 channel 目录，可放 Telegram 专属最小实现
- `tests/telegram/*`：Telegram 最小 inbound / outbound / fallback 的测试
- 如当前项目已有更明确分层，也可使用对应的最小 channel 目录，但原则不变：**只新增 edge 文件，不扩 core 面**

### 3.2 预计会修改的文件

优先只修改真正必须接入 Telegram 的共享入口文件：

- Telegram 路由 / webhook 入口文件
- 共享 inbound 映射注册点
- 共享 outbound 映射注册点
- Telegram sender 注册点
- 最小必要的测试入口

### 3.3 哪些共享文件允许碰

允许碰，但要极小化：
- `UnifiedInboundMessage` 相关映射入口
- `UnifiedSessionContext` 相关映射入口
- unified pipeline 的接入点
- `UnifiedResponse` / outbound mapping 接入点
- `UnifiedSendResult` 接入点
- fallback 连接点

原则：**只碰接入点，不重写核心语义。**

### 3.4 哪些 Website 相关文件原则上不应碰

原则上不应直接改动 Website 已验证稳定的路径，尤其是：
- Website webhook / entry handling
- Website inbound parsing path
- Website mapping into `UnifiedInboundMessage`
- Website outbound mapping / sender path
- Website `UnifiedSendResult` semantics
- Website fallback behavior

若真的需要改共享层，也必须以 Website 回归保护为前置条件，而不是顺手修改 Website 文件。

### 3.5 每个文件为什么改，影响什么

- **Telegram edge 文件**：为了接入平台原生消息；影响仅限 Telegram 通道边界
- **共享映射接入点**：为了把 Telegram 送进现有统一链路；影响可能波及所有通道，因此必须最小
- **Telegram sender**：为了把统一回复送回 Telegram；影响仅限 Telegram outbound
- **测试文件**：为了验证最小闭环和 fallback；影响是帮助锁定回归，而不是改变产品行为

## 4. 隔离策略

### 4.1 Telegram 逻辑如何与 Website 稳定样板隔离

- Telegram 逻辑只放在 edge / adapter / sender 层
- shared core 保持 contract-first，不引入 Telegram 特性
- Telegram 只使用现有统一形状，不修改 Website 的既有行为去迁就 Telegram

### 4.2 adapter / mapper / sender / transport 如何最小侵入

- adapter 负责平台协议转换
- mapper 负责字段到共享结构的最小映射
- sender 负责 outbound 平台发送
- transport 只做必要的底层交互

四者都应保持“薄层”定位，不把业务逻辑塞进去。

### 4.3 如何避免把 Telegram 特性污染共享层

- 不新增 Telegram-only 核心字段，除非证实不可避免
- 不把 Telegram 的特殊交互语义写成共享逻辑
- 不因为 Telegram 方便而改 Website 已稳定的 contract
- 不把第二通道当作重构共享层的理由

## 5. 回归保护方案

### 5.1 开发前需要检查什么

- Website 是否仍是可复现的稳定样板
- 共享 contract 是否真的需要改
- Telegram 最小入口是否已经明确
- 是否存在把评估误当成批准的风险
- 是否已经准备好最小回归验证点

### 5.2 开发后至少验证什么

- Telegram 最小 inbound 能进入统一链路
- Telegram 最小 response 能成功回传
- send result 是否仍能正确返回
- fallback 是否仍按既有语义工作
- Website 的核心闭环是否未被破坏

### 5.3 Website 最小回归检查项

至少检查：
- Website webhook entry
- Website parsing
- `UnifiedInboundMessage` 映射
- unified pipeline 入口与输出
- outbound mapping
- sender boundary
- `UnifiedSendResult`
- fallback

### 5.4 哪些结果可以视为“未破坏第一稳定样板”

以下结果可视为本轮没有破坏 Website 样板：
- Website P0 路径全部保持稳定
- Telegram 最小闭环可独立跑通
- 没有引入 Telegram 特性污染 shared core
- 没有把 Website 行为改成 Telegram 友好型而失去原样

## 6. 进入代码阶段的 gate

### 6.1 具备哪些条件后才可进入真正代码修改

必须同时满足：
- `64_phase8_telegram_real_start_assessment.md` 已明确为有条件启动
- 本方案文档已完成并锁定范围
- Telegram 最小入口已明确
- Website 回归检查点已明确
- shared contract 改动边界已明确
- 没有新的硬 blocker

### 6.2 若条件不够，卡在哪些点

若条件不够，通常卡在：
- 最小入口不清楚
- shared contract 边界不清楚
- Website 回归风险无法控制
- 方案仍可能滑向完整 Telegram 开发

### 6.3 进入代码阶段后第一轮只允许做到哪一步

第一轮代码只允许做到：
- 建立 Telegram 最小 inbound edge
- 接到现有统一 inbound 流程
- 建立最小 outbound sender 回传
- 跑通最小 response 闭环
- 立即执行 Website 回归检查

不允许在第一轮代码中顺手扩展完整 bot 功能或 shared core 重构。

## 7. 最终结论

### 是否建议进入 Phase 8.2 代码最小实现

**建议，但仅限有条件进入。**

理由是：Telegram 的最小启动评估已经足够明确，下一步不应该继续停留在文档层；但进入代码前必须严格限制到最小闭环，并把 Website 回归保护作为硬前置。

### 如果进入，唯一第一代码动作是什么

唯一第一代码动作是：**建立 Telegram 最小 inbound edge，并把它接到现有 unified inbound 流程**。

### 如果不建议进入，还差什么

如果暂不进入，通常还差这些硬项：
- 最小入口实现边界仍未完全锁定
- shared contract 修改点仍不够明确
- Website 回归检查清单仍需补全
- 代码工作包仍需再细分

### 本轮最终判断

本轮文档已经足够支撑下一轮进入 Phase 8.2 的受限代码阶段，但前提是仍然坚持：**最小变更、先隔离后接入、Website 回归保护优先**。

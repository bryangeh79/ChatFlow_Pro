# Phase 9.21 Website Minimal Observability

## 1. 本轮补了哪些最小可观测性

本轮补强的最小可观测性方向，是让 Website 当前真实闭环更容易被确认，而不是改变其行为。

具体来说，补强重点在于：
- 更容易确认请求是否已经进入 Website inbound 路径
- 更容易确认是否完成 Website inbound parsing
- 更容易确认是否进入 unified 流程
- 更容易确认是否完成 Website outbound mapping
- 更容易确认是否形成 send result / fallback 结果

## 2. 这些补强分别对应 Website 真实闭环的哪个环节

### inbound 路径确认

对应的是 Website 的原始请求进入点，也就是 `handleWebsiteWebhook` 之前和之中的可见性。

### inbound parsing 确认

对应的是 `parseWebsiteInbound` 这一层，确保输入被正确识别为 Website 事件。

### unified 流程确认

对应的是 `createOrUpdateSessionContext` 和 `runUnifiedInboundPipeline`，让闭环更容易确认已经进入统一处理。

### outbound mapping 确认

对应的是 `mapWebsiteOutboundPayload`，确保 response 的映射结果仍然可观察。

### send result / fallback 确认

对应的是 `createChannelSender('website')` 以及错误 fallback 路径，让结果状态更容易被检查。

## 3. 为什么这些补强不构成语义变化

因为它们没有改变 Website 真实闭环的输入、输出、结果语义或 fallback 语义；它们只是让现有结果更容易被看见、被检查、被验证。

换句话说，这些补强是“可见性增强”，不是“行为变化”。

## 4. 当前哪些结果因此更容易确认

现在更容易确认的结果包括：
- 请求是否进入 Website inbound
- 输入是否被正确解析
- 是否进入 unified flow
- 是否生成了 Website outbound payload
- 是否返回了 send result
- 是否仍然保持 Website baseline 语义

## 5. Website baseline 是否仍确认未被破坏

是，仍确认未被破坏。

当前 Website 真实闭环依然保持：
- inbound → parseWebsiteInbound
- session context
- unified pipeline
- outbound mapping
- sender
- send result / fallback

这条路径没有被本轮目标破坏，也没有被改成别的语义。

## 6. 下一步是否还建议继续补强，还是应先停点判断

建议先做停点判断，而不是继续扩展补强。

原因是：当前最小可观测性已经足够支撑对 Website baseline 的确认，如果继续往下补，很容易把“可见性补强”滑成“顺手加点别的”，从而越界。

## 7. 是否达到需要更新 5 个 memory 文件的程度

不需要。

原因是：本轮只是对 Website baseline 做最小可观测性补强，属于阶段内的小范围可见性改进，没有形成新的长期边界事实，也没有改变项目主路线。

## 8. 结论

本轮的最小可观测性补强已经足够回答当前阶段最重要的问题：Website 是否仍是稳定的真实参考样板。

当前结论仍然是：
- Website baseline 稳定
- 可见性增强成立
- 语义没有变化
- 下一步应先停点判断，而不是继续扩展

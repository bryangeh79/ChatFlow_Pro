# Phase C 剩余差距清单（收口评估）

## 必须修

- **缺少会话种子入口**：当前验收依赖“已有 conversation”；若环境无会话，无法完成全链路验收。  
  建议：提供最小 seed 脚本或测试专用 conversation 创建接口（仅非生产环境）。
- **activity actor 粒度偏粗**：当前多数写入 `actor_id=role/system`，未稳定到 principal id。  
  建议：落 principal id，role 进 metadata。

## 应该修

- **assignment 独立查询接口缺失**：目前通过 activity+owner变化侧验，不是直接读 assignment 记录。  
  建议：增加 `GET /conversations/:id/assignments`。
- **inbox message area 真实消息链路仍薄**：UI 已接接口，但依赖已有 messages 数据。  
  建议：补最小消息写入路径（测试或 runtime 接入）。
- **reports owner_breakdown 稳定性标记未显式返回**：设计提过 `is_stable`，当前接口尚未带。  
  建议：补 `owner_breakdown_meta.is_stable`。

## 后续再做

- 高级搜索 / 多维筛选
- 报表图表化与历史归因漏斗
- 多 owner / 智能分配策略
- CRM 深度集成

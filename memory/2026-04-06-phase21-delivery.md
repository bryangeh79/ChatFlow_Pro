# Phase 21 / 选项 B 交付记录

> **对外最终交付口径**：`docs/166_phase21_option_b_delivery_report.md`（含 CI/SHA 说明与阶段字段对齐）。

## 交付摘要
- **版本**: Pro_v1.07.56 (package.json 1.7.56)
- **阶段**: Phase 21 / 选项 B 完成
- **功能**: Handoff 运行时配置重载（JSON 文件 + SIGHUP）

## 实现规格
1. **新增环境变量**: `CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH`（可选）
2. **优先级规则**: env 为基底；JSON 仅覆盖文件中出现的键
3. **白名单键**:
   - `assign_mode` → 对应 `CHATFLOW_HANDOFF_ASSIGN_MODE`
   - `auto_assign_owner` → `CHATFLOW_HANDOFF_AUTO_ASSIGN_OWNER`
   - `owner_pool` → 数组或逗号字符串
   - `tag_map` → 对象或字符串
   - `agent_status` → 对象或字符串
   - `assign_balance` → `CHATFLOW_HANDOFF_ASSIGN_BALANCE`
   - `assign_sticky_ttl_min` → `CHATFLOW_HANDOFF_ASSIGN_STICKY_TTL_MIN`
4. **刷新时机**:
   - 进程启动时加载一次
   - Unix: 监听 SIGHUP，收到后同步重载
   - Windows: 启动日志说明「Windows 下请重启进程」
5. **实现落点**: `src/config/handoff-assign.ts` 改为「env 基底 + 内存覆盖层」
6. **错误处理**:
   - 文件不存在 → 视为「无覆盖」，不报错
   - JSON 非法 → 打 error 日志，保留上一次成功覆盖层
   - 非白名单键 → 打 warn 日志，忽略

## 验收结果
- ✅ `npm run build` (T0) 通过
- ✅ 代码结构符合规格
- ✅ 优先级规则正确实现
- ✅ SIGHUP 处理正确（Unix）
- ✅ Windows 兼容性说明

## 文档更新
- ✅ `.env.example`: 添加 `CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH` 注释 + JSON 示例
- ✅ `docs/165`: 标记「B 已落地（路径 + SIGHUP + 优先级）」
- ✅ `memory/01`: 更新 Current Version 和 Current Completion Point
- ✅ `memory/03`: 版本链末尾追加 Pro_v1.07.56
- ✅ `memory/04`: 添加 Phase 21 风险项

## 明确未做（防范围膨胀）
- ❌ 不做 docs/165 选项 C（admin HTTP）
- ❌ 不改 docs/161 notify 契约
- ❌ 不改 unified inbound 路由
- ❌ 不改 run-handoff-autotune.mjs 写该文件（留 TODO）

## 测试脚本
创建了 `test-handoff-runtime-config.js` 用于手动验证功能。

## 下一步
- 生产按 `docs/161` 对接
- 新客户阅读 `docs/162` (PDF)
- 可选 `dev:notify-echo` 本地验 POST
- 按需使用 notify / suppress / assign-strategy 等功能
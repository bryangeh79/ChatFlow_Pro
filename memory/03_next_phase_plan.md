# 03 Next Phase Plan

**Last updated:** 2026-04-11
**Status:** Production running. 主开发线 CLOSED。只做用户明确要求的修复/优化。

---

## 当前优先事项

### ✅ 已完成（2026-04-11）
- Inbox P0 UX 重构（commit 26d9b62，已 push，待 VPS 部署）
- pre-push hook 防护（本机已安装）
- 交接指令更新

### 📌 待 VPS 部署
VPS 需要 `git pull origin main` 拉取 commit 26d9b62（Inbox P0 UX）。
`public/tenant-app.html` 是静态文件，**不需要 build**，pull 后刷新浏览器即可。

```bash
cd /opt/chatflow/ChatFlow_Pro
git pull origin main
# 刷新浏览器 Ctrl+Shift+R
```

### 📋 Inbox P0 已实现清单
- P0-1 ✅ 渠道 SVG 图标（Telegram蓝/WhatsApp绿/LINE绿/Messenger蓝/Web紫/Zalo蓝）
- P0-2 ✅ 智能联系人名称（inboxDisplayName：telegram:xxx:yyy → #userid）
- P0-3 ✅ 真实消息预览（空时显示 italic 暂无消息）
- P0-4 ✅ 右侧栏 4 blocks（👤联系人 / 💬会话信息 / 🙋负责人 / ⚡操作）
- P0-5 ✅ 固定会话 header（avatar 圆、渠道图标、状态、负责人、时间）

### 🔜 用户可能的下一步需求（待确认）
- Inbox 继续优化（P1 项）
- Bot Experience 页面多语言结构
- FAQ 翻译工作台前端
- Topbar Avatar Menu 正式化

---

## 工作规则

1. 不经要求不动后端文件
2. 每次 push 前 `npm run build`（pre-push hook 自动执行）
3. VPS 重启必须带 .env export
4. 完成工作后更新 memory/ 文件
5. 上下文太长时，让 Claude 更新 memory + 生成交接指令，再开新 chat

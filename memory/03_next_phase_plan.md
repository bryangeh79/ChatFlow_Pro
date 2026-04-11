# 03 Next Phase Plan

**Last updated:** 2026-04-11
**Status:** Production running. 主开发线 CLOSED。只做用户明确要求的修复/优化。

---

## 当前优先事项

### ✅ 已完成（2026-04-11）
- Inbox P0 UX 重构（commit 26d9b62）
- Inbox P1 UX 重构（commit c0c7ec9，已 push，待 VPS 部署）
- pre-push hook 防护（本机已安装）

### 📌 待 VPS 部署
VPS 需要 `git pull origin main` 拉取 commit c0c7ec9（Inbox P1 UX）。
`public/tenant-app.html` 是静态文件，**不需要 build**，pull 后刷新浏览器即可。

```bash
cd /opt/chatflow/ChatFlow_Pro
git pull origin main
# 刷新浏览器 Ctrl+Shift+R
```

### 📋 Inbox P1 已实现清单
- P0-1 ✅ 渠道 chip → 纯图标（无文字，hover tooltip）
- P0-2 ✅ 左栏标题 → TG #短ID / WA #短ID（渠道前缀 + 8位ID）
- P0-3 ✅ 左栏预览 → 消息缓存补全，fallback "No messages yet"
- P0-4 ✅ 状态系统 → New / Active / Waiting Human / With Agent / Resolved
- P0-5 ✅ 中栏 header → 双行（信息行 + Assign/Handoff/Resolve 操作行）
- P0-6 ✅ 右栏 → Summary block 新增，操作主次排列，去所有"占位"字眼

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

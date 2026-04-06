# ChatFlow Pro — 七通道凭据与 Access Token 获取说明（客户版）

**文档用途**：供新客户按通道准备接入 ChatFlow Pro 所需的密钥、Token 与 ID。  
**安全提醒**：所有密钥与 Token **等同于密码**。请勿在即时消息、邮件正文、工单或截图中明文发送；请通过安全渠道（如一次性加密链接、密码管理器共享）交给实施方。泄露后请立即在对应平台**作废并重新生成**。

**与 ChatFlow 环境变量的对应关系**：实施部署时，下列名称会写入服务器上的 `.env` 文件（名称可能随版本微调，以项目提供的 **`.env.example`** 为准）。

---

## 总览：七通道分别要准备什么

| 通道 | 您主要去哪个平台操作 | ChatFlow 侧常见变量（示例） |
|------|----------------------|----------------------------|
| 网站 Website | 您自己的网站 / 后端 | 自管 URL 与密钥（无「社交平台 Token」） |
| Telegram | Telegram BotFather | `TELEGRAM_BOT_TOKEN` |
| WhatsApp | Meta（Facebook）开发者与商务套件 | `WHATSAPP_ACCESS_TOKEN`、`WHATSAPP_PHONE_NUMBER_ID` 等 |
| Messenger | Meta + Facebook 公共主页 | `MESSENGER_PAGE_ACCESS_TOKEN`、`MESSENGER_PAGE_ID` 等 |
| LINE | LINE Developers | `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET` |
| Zalo | Zalo 开放平台 + OA 管理 | `ZALO_ACCESS_TOKEN`、`ZALO_OA_ID` 等 |

以下按通道说明：**去哪里、大致步骤、拿到什么、填到哪个变量**。各平台界面会改版，若与截图不一致，请以平台当前菜单为准。

---

## 1. 网站（Website）通道

网站通道**不是**从某个社交网站「领取 Access Token」，而是由**您自己的系统**与 ChatFlow 约定 **HTTPS 地址** 与 **共享密钥**。

### 1.1 您需要提供给实施方的信息

| 用途 | 说明 | 常见环境变量 |
|------|------|----------------|
| ChatFlow 接收您网站发来的访客消息 | 由实施方提供 Webhook 地址；您在网站后端向该地址 POST | （由实施方配置，您侧为调用方） |
| 可选：校验 POST 来自合法来源 | 双方约定同一串密钥，用于签名头 | `WEBSITE_WEBHOOK_SIGNING_SECRET`（由您生成随机强密钥后提供） |
| 可选：GET 验证（若网关使用 Meta 风格 challenge） | 双方约定 verify_token 字符串 | `WEBSITE_WEBHOOK_VERIFY_TOKEN` |
| ChatFlow 将机器人回复推送到您的系统 | 您提供一个 **HTTPS** 回调地址 | `WEBSITE_OUTBOUND_URL` |
| 可选：出站签名 | 再约定一串密钥 | `WEBSITE_OUTBOUND_SIGNING_SECRET` |

### 1.2 建议操作

1. 在您的后端或运维工具中**生成**足够长的随机密钥（勿使用弱密码或成语）。  
2. 准备一个**公网 HTTPS**、证书有效的回调 URL，用于接收 ChatFlow 的出站 JSON（路径、鉴权方式请与实施方确认）。  
3. 通过安全渠道把「密钥（如需）+ 出站 URL」交给实施方；**不要**发在微信群/普通邮件正文。

---

## 2. Telegram 通道

### 2.1 官方入口

- 在 Telegram 内打开机器人：**[@BotFather](https://t.me/BotFather)**  
- Telegram Bot API 说明：<https://core.telegram.org/bots/api>

### 2.2 推荐步骤

1. 在 Telegram 搜索并打开 **@BotFather**。  
2. 发送 `/newbot`，按提示设置机器人**显示名称**与 **username**（必须以 `bot` 结尾）。  
3. 创建成功后，BotFather 会返回一行 **HTTP API token**，格式类似 `123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxx`。  
4. 将该 Token 安全交给实施方，对应环境变量：**`TELEGRAM_BOT_TOKEN`**。  
5. （可选）机器人的 **username** 可填入 **`TELEGRAM_BOT_USERNAME`**，便于文档与客户展示。

### 2.3 说明

- Token **只显示一次**时请当场保存；若遗失，在 BotFather 对该 bot 使用 `/token` 重新生成（旧 Token 随即失效）。  
- 若贵司网络访问 Telegram 需代理，请向实施方说明，以便配置 `TELEGRAM_PROXY_*`（见 `.env.example`）。

---

## 3. WhatsApp（WhatsApp Cloud API）通道

WhatsApp 商业消息由 **Meta** 提供，与 **Facebook 开发者账号**、**Meta 商务套件**绑定。

### 3.1 官方入口

- Meta 开发者：<https://developers.facebook.com/>  
- 商务管理（Business Suite）：<https://business.facebook.com/>  
- WhatsApp 产品文档（英文）：在开发者后台选择应用 → **WhatsApp** → **API Setup** 查看当前指引

### 3.2 您需要准备的身份与资源

1. 可用的 **Facebook 账号**，并创建或进入 **Meta 商务账号（Business）**。  
2. 在 [developers.facebook.com](https://developers.facebook.com/) **创建应用（App）**，为应用添加 **WhatsApp** 产品。  
3. 在 WhatsApp 配置中查看：  
   - **Phone number ID**（电话号码 ID，一串数字）→ 提供给实施方：**`WHATSAPP_PHONE_NUMBER_ID`**  
   - **Temporary access token** 或通过 **系统用户（System User）** 生成的长期 Token → **`WHATSAPP_ACCESS_TOKEN`**（具体类型由贵司合规与 Meta 控制台为准）

### 3.3 Webhook 与安全（强烈建议配置）

- 在应用设置中找到 **App Secret**（应用密钥），用于校验 Meta 发来的签名 → 常对应 **`WHATSAPP_APP_SECRET`** 或统一的 **`META_APP_SECRET`**。  
- 配置 Webhook 时会设置 **Verify Token**（自定义字符串，需与 ChatFlow 一致）→ **`WHATSAPP_WEBHOOK_VERIFY_TOKEN`**。  
- 实际 Webhook URL 与验证流程由实施方在部署后提供。

### 3.4 说明

- Meta 控制台界面与「测试号 / 正式号」流程会更新；若使用临时 Token，过期后需在开发者后台**重新生成**并通知实施方更新 `.env`。  
- 轮换与运维可参考项目内 **`docs/152_phase16_ops_token_rotation_runbook.md`**（实施方使用）。

---

## 4. Facebook Messenger 通道

Messenger 与 WhatsApp 同属 **Meta**，通常共用同一个 **Facebook 应用（App）**，但 Token 与 ID 来自 **Facebook 公共主页（Page）**。

### 4.1 官方入口

- Meta 开发者：<https://developers.facebook.com/>  
- 为应用添加 **Messenger** 产品，并绑定您的 **Facebook 公共主页**

### 4.2 推荐步骤

1. 在 [developers.facebook.com](https://developers.facebook.com/) 打开您的应用。  
2. 添加 **Messenger** 产品，按向导关联 **Facebook Page**。  
3. 在 **Messenger → Settings**（或 **API 设置**）中生成或查看具有 **`pages_messaging`** 等权限的 **Page Access Token**。  
4. 将 **Page Access Token** 交给实施方 → **`MESSENGER_PAGE_ACCESS_TOKEN`**。  
5. 在 Facebook 公共主页 **关于 / 设置** 或开发者工具中查看 **Page ID**（数字）→ **`MESSENGER_PAGE_ID`**。

### 4.3 Webhook 与安全

- **App Secret** 用于签名校验 → **`MESSENGER_APP_SECRET`** 或 **`META_APP_SECRET`**。  
- Webhook 验证字符串 → **`MESSENGER_WEBHOOK_VERIFY_TOKEN`**。  
- Webhook 回调 URL 由实施方部署后提供。

### 4.4 说明

- Page Token 可能因权限或密码变更失效；失效后需在 Meta 后台重新生成并更新服务器环境变量。

---

## 5. LINE 通道

LINE 的 Channel Access Token 与 Channel Secret 均在 **LINE Developers Console** 管理。

### 5.1 官方入口

- LINE Developers 控制台：<https://developers.line.biz/console/>  
- 文档入口：<https://developers.line.biz/en/docs/>

### 5.2 推荐步骤

1. 使用 LINE 账号登录 [LINE Developers Console](https://developers.line.biz/console/)。  
2. **创建 Provider**（若尚无），再 **创建 Channel**，类型请选择 **Messaging API**（与贵司机器人用途一致）。  
3. 进入该 Channel 页面，打开 **Messaging API** 相关标签页：  
   - **Channel secret** → 交给实施方：**`LINE_CHANNEL_SECRET`**（用于校验 Webhook 签名）  
   - **Channel access token** → 点击 **Issue** 生成 → **`LINE_CHANNEL_ACCESS_TOKEN`**（用于代机器人发消息）  
4. 将 Webhook URL 填入 LINE 控制台（URL 由实施方提供）；如使用 Verify，按实施方给的 token 配置。

### 5.3 说明

- Channel access token 可重新签发；重新签发后旧 token 失效，需同步更新 ChatFlow 服务器 `.env` 并重启服务。

---

## 6. Zalo 官方账号（OA）通道

Zalo 侧通常涉及 **Zalo 开放平台应用** 与 **官方账号（OA）** 的授权与密钥。

### 6.1 官方入口

- Zalo 开放平台：<https://developers.zalo.me/>  
- 官方账号相关说明请以开放平台当前文档为准（应用管理、OA 授权、API 密钥等）。

### 6.2 您需要准备的内容（与常见变量对应）

| 内容 | 说明 | 常见环境变量 |
|------|------|----------------|
| OA 身份 | 官方账号 ID（数字） | **`ZALO_OA_ID`** |
| 访问令牌 | OA 或应用侧获取的 Access Token（随 Zalo 产品路径而定） | **`ZALO_ACCESS_TOKEN`** |
| （可选）长期刷新 | 若启用刷新流程，需应用 ID/密钥与 refresh token | **`ZALO_APP_ID`**、**`ZALO_APP_SECRET`**、**`ZALO_REFRESH_TOKEN`** 等 |

具体点击路径（「应用」→「OA」→「密钥/Token」）以 Zalo 控制台当前版本为准。建议由贵司 **拥有 OA 管理员权限** 的同事登录后按开放平台向导操作，并将**仅实施需要**的字段通过安全渠道交出。

### 6.3 说明

- Zalo 政策与接口会更新；若启用进程内刷新（`CHATFLOW_INPROCESS_TOKEN_REFRESH`），需额外应用凭证，由实施方按 **`docs/154`** 等内部文档配置。

---

## 7. 提交给实施方的核对清单（建议打印或保存 PDF）

在开通各通道前，可逐项确认：

- [ ] 已阅读本文 **安全提醒**，同意通过安全渠道传递密钥  
- [ ] **Website**：出站 HTTPS URL 已就绪；Webhook 签名/验证字符串已与实施方对齐  
- [ ] **Telegram**：已从 **@BotFather** 取得 **`TELEGRAM_BOT_TOKEN`**  
- [ ] **WhatsApp**：已创建 Meta 应用并开通 WhatsApp；已取得 **`WHATSAPP_PHONE_NUMBER_ID`** 与有效 **`WHATSAPP_ACCESS_TOKEN`**；已准备 App Secret / Verify Token（若启用签名校验）  
- [ ] **Messenger**：已绑定 Facebook Page；已取得 **`MESSENGER_PAGE_ACCESS_TOKEN`** 与 **`MESSENGER_PAGE_ID`**；已准备 App Secret / Verify Token（若启用）  
- [ ] **LINE**：已在 [developers.line.biz](https://developers.line.biz/console/) 创建 Messaging API Channel；已复制 **`LINE_CHANNEL_SECRET`** 与 **`LINE_CHANNEL_ACCESS_TOKEN`**  
- [ ] **Zalo**：已在 [developers.zalo.me](https://developers.zalo.me/) 完成应用/OA 侧配置；已提供 **`ZALO_OA_ID`** 与 **`ZALO_ACCESS_TOKEN`**（及刷新相关字段若需要）  

---

## 附录：常用官方链接速查

| 平台 | 链接 |
|------|------|
| Telegram BotFather | <https://t.me/BotFather> |
| Meta 开发者 | <https://developers.facebook.com/> |
| Meta 商务套件 | <https://business.facebook.com/> |
| LINE Developers | <https://developers.line.biz/console/> |
| Zalo 开放平台 | <https://developers.zalo.me/> |

---

*文档版本随 ChatFlow Pro 仓库更新；环境变量以仓库根目录 **`.env.example`** 为准。*

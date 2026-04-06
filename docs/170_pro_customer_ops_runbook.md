# ChatFlow Pro — 客户实例运维速查（一客户一部署）

与 **`docs/169`** 一致：每套部署只属于一个客户；密钥在**该实例** `.env` 或密钥管理，**不进** git。

## 1. 路径与数据

| 项 | 默认 / 说明 |
|----|-------------|
| 监听端口 | `PORT`（默认 **3030**，见 `Dockerfile` / `docker-compose`） |
| 健康检查 | `GET /health` |
| Lead 落盘 | `data/local-captured-leads.jsonl`（及轮转文件，**gitignore**） |
| Handoff 分配审计 | `data/handoff-assignments.jsonl` |
| 运行时 JSON（可选） | `CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH` 指向的路径 |

**备份**：`npm run backup:data`（见下）或平台级卷快照。

## 2. 备份

```bash
# 备份到目录：./backups/chatflow-data-<timestamp>（可改 CHATFLOW_BACKUP_PARENT）
CHATFLOW_BACKUP_PARENT=/secure/path npm run backup:data
```

还原：停服 → 覆盖 `data/` → 起服（注意文件权限）。

## 3. Docker（客户长期跑）

```bash
# 需已存在 .env（从 .env.example 复制，勿提交）
docker compose -f docker-compose.customer.yml up -d --build
```

模板：**`docker-compose.customer.yml`**（`restart: unless-stopped`）。TLS 放在反代（Caddy / Nginx / 云 LB）。

## 4. 升级

1. 记下当前 **`git rev-parse HEAD`** 或镜像 digest。  
2. `git pull`（或拉取新镜像 tag）→ `npm ci` / `docker compose build` → 重启容器/进程。  
3. `npm run check:go-live`（或 CI 等价）确认构建与 env 摘要无异常。  
4. 失败回滚：回到旧 SHA / 旧镜像，重建。

## 5. 交付给客户的最小信息

- 公网 **HTTPS** 基址与 webhook 路径（`/webhooks/*`）。  
- **`docs/162`**（PDF）+ **`docs/168`** / **`docs/169`** + **`docs/161`**（若启用 notify）。  
- **禁止**在邮件/聊天中发送完整 `.env`；用安全通道传密钥。

## 6. 参考

- **`docs/158`** Docker / smoke  
- **`docs/155`** 无 Docker 时代价路径  
- **`docs/168`** 两天清单  
- **`docs/169`** 商业模型  
- **`docs/171`** 厂商发版核对  

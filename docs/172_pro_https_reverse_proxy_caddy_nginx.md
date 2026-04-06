# ChatFlow Pro — HTTPS 反代（Caddy / Nginx）

**目的**：给 **`docker-compose.customer.yml`**（或裸跑 Node）前面的 **公网 HTTPS**，供 Meta / Line 等控制台填写 webhook URL。

**前提**：DNS **A/AAAA** 已指向本机公网 IP；宿主开放 **443**（及 **80** 若用 ACME HTTP-01）。

---

## 方案 A — 宿主 Caddy（推荐 SMB）

1. 安装 [Caddy](https://caddyserver.com/docs/install)（各发行版包或官方二进制）。  
2. 复制仓库内 **`examples/reverse-proxy/Caddyfile.example`** → 如 `/etc/caddy/Caddyfile`，把 `chatflow.example.com` 改成你的域名。  
3. 确认 ChatFlow 已在 **`127.0.0.1:3030`** 监听（默认 `STAGING_HOST_PORT=3030`）。  
4. `sudo systemctl enable --now caddy`（或 `caddy run --config /etc/caddy/Caddyfile`）。  
5. Caddy 默认 **自动 HTTPS**（Let's Encrypt）；防火墙放行 80/443。  
6. 验证：`curl -sf https://chatflow.example.com/health`

**Webhook 基址**：`https://chatflow.example.com/webhooks/<channel>`（与各平台文档一致）。

---

## 方案 B — 宿主 Nginx

1. 自行申请证书（**certbot**、云厂商证书等）。  
2. 将 **`examples/reverse-proxy/nginx-snippet.conf`** 合并进站点配置，替换 `server_name`、证书路径、`proxy_pass` 端口（若非 3030）。  
3. `nginx -t && sudo systemctl reload nginx`  
4. `curl -sf https://chatflow.example.com/health`

---

## 与 Docker 同事

- **常见**：容器只绑 **`127.0.0.1:3030:3030`**，反代在**宿主**终止 TLS → `reverse_proxy 127.0.0.1:3030`。  
- **勿**把 `.env` 里的密钥写进 Caddy/Nginx 配置；仅反代。

---

## 参考

- **`docs/170`** 运维  
- **`docs/168`** 上线清单  
- **`docker-compose.customer.yml`**

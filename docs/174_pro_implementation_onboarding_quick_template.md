# ChatFlow Pro — 实施接入执行模板（极短版）

> 目标：实施同学拿到包后，按最小步骤完成可访问、可验活、可 smoke 的部署基线。

## 1) 部署（摘自 `docs/171`）

1. 准备 `.env`（从 `.env.example` 复制，密钥不入库）。
2. 启动服务：
   - `docker compose -f docker-compose.customer.yml up -d --build`
3. 健康检查：
   - `npm run health:curl`（或设置 `HEALTH_CHECK_URL` 后执行）

## 2) HTTPS（摘自 `docs/172`）

1. 域名解析到宿主机公网 IP，放行 `80/443`。
2. 选一种反代：
   - Caddy：使用 `examples/reverse-proxy/Caddyfile.example`
   - Nginx：使用 `examples/reverse-proxy/nginx-snippet.conf`
3. 验证：
   - `curl -sf https://{your-domain}/health`

## 3) smoke / 验收最小动作

1. 至少执行 1 条 webhook smoke（见 `docs/157` / `docs/158`）。
2. 确认 `GET /health` 正常、日志无致命报错。
3. 如需 notify，再接 `docs/161` 做回调联调。

## 4) 边界说明（固定口径）

- token、webhook 真实参数联调属于 onboarding 后置步骤。
- 未收到接入指令前，不进入公网真实通道联调。


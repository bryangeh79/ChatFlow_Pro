# ChatFlow Pro — 厂商发版 / 交付核对（可复制）

面向「把同一制品卖给多个客户、每客户独立部署」**（`docs/169`）**。发版前在内部勾一遍。

## 制品

- [ ] **`main`**（或发版 tag）**CI 绿**（build + `check:staging-env` + `docker-smoke`）。
- [ ] **`npm run release:prepare`**（默认含 `check:go-live` + `report:agent-git`；可选 `--with-pdf` / `--with-health`）。
- [ ] 镜像：`docker build -t chatflow-pro:<version> .` 或 registry tag 与 **CHANGELOG** 一致。

## 交付包（发给实施 / 客户）

- [ ] **`docs/162`** PDF（`npm run docs:pdf:162`）。
- [ ] **`docs/168`**、**`docs/169`**、**`docs/170`**、**`docs/161`**（若启用 notify）。
- [ ] **`.env.example`**；客户现场从模板复制为 **`.env`**（不入库）。

## 客户机部署

- [ ] **`docker compose -f docker-compose.customer.yml up -d --build`**（或等价编排）；**`.env` 已填**。
- [ ] 公网 **HTTPS** 反代到容器端口（**`docs/172`** + **`docs/170`**）。
- [ ] **`GET /health`**（`npm run health:curl` 或 **`HEALTH_CHECK_URL`**）与至少一条 **`smoke:webhooks`**（**`docs/157`** / **`docs/158`**）。

## 数据

- [ ] 告知客户 **`npm run backup:data`** 与 `data/` 卷持久化策略。

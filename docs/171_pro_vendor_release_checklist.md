# ChatFlow Pro — 厂商发版 / 交付核对（可复制）

面向「把同一制品卖给多个客户、每客户独立部署」**（`docs/169`）**。发版前在内部勾一遍。

## 制品

- [ ] **`main`**（或发版 tag）**CI 绿**（build + `check:staging-env` + `docker-smoke`）。
- [ ] 可先跑 **`npm run release:verify`**（只校验，不产出新 zip/bundle）。
- [ ] 或者直接跑 **`npm run release:ship`**（一键 `release:prepare` + `delivery:zip` + `report:github-ci` + `delivery:latest`；可附 `-- --with-pdf --with-health`）。
- [ ] 临近发包可用 **`npm run delivery:ship:final`**（固定 `release:ship -- --with-pdf` + `delivery:message:file` + `report:github-ci`）。
- [ ] **`npm run release:prepare`**（默认含 `check:go-live` + `report:agent-git`；可选 `--with-pdf` / `--with-health`）。
- [ ] 镜像：`docker build -t chatflow-pro:<version> .` 或 registry tag 与 **CHANGELOG** 一致。

## 交付包（发给实施 / 客户）

- [ ] **`docs/162`** PDF（`npm run docs:pdf:162`）。
- [ ] **`docs/168`**、**`docs/169`**、**`docs/170`**、**`docs/161`**（若启用 notify）。
- [ ] **`npm run delivery:manifest`** 生成 `data/delivery-manifest.json`（版本、SHA、交付文档存在性）。
- [ ] **`npm run delivery:bundle`** 生成 `dist/delivery-bundle/`（含 `SHA256SUMS.txt`，用于对外打包发放）。
- [ ] **`npm run delivery:zip`** 生成 `dist/delivery-bundle-<timestamp>.zip`（直接发实施/客户）。
- [ ] **`npm run delivery:latest`** 输出最新 zip 路径与 SHA256（便于发包校验）。
- [ ] **`npm run delivery:message`** 输出可直接外发文本（自动带版本、zip、sha、CI）。
- [ ] **`npm run delivery:message:file`** 生成 `dist/delivery-message-latest.txt`（归档/转发可直接附文本）。
- [ ] 可选：**`npm run delivery:clean -- --keep=5`** 清理旧 zip（只保留最近 N 个）。
- [ ] **`.env.example`**；客户现场从模板复制为 **`.env`**（不入库）。

## 客户机部署

- [ ] **`docker compose -f docker-compose.customer.yml up -d --build`**（或等价编排）；**`.env` 已填**。
- [ ] 公网 **HTTPS** 反代到容器端口（**`docs/172`** + **`docs/170`**）。
- [ ] **`GET /health`**（`npm run health:curl` 或 **`HEALTH_CHECK_URL`**）与至少一条 **`smoke:webhooks`**（**`docs/157`** / **`docs/158`**）。

## 数据

- [ ] 告知客户 **`npm run backup:data`** 与 `data/` 卷持久化策略。

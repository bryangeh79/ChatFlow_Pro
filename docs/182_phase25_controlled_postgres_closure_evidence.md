# Phase 25 — Controlled Postgres Closure Evidence

## Scope

This record captures one controlled Postgres closure run only.
It does not change default runtime path, version, or phase.

## Controlled Environment

- Driver gate for this run: `CHATFLOW_SAAS_DB_DRIVER=postgres`
- Postgres client gate: `CHATFLOW_SAAS_POSTGRES_CLIENT=1`
- Target URL: `postgresql://postgres:REDACTED@127.0.0.1:5432/chatflow`
- Default runtime path remains `sqljs` outside this controlled run.

## Source-of-Truth Asset Used

- Ledger table DDL asset: `src/saas/db-migrations/postgres/pg_0003_saas_schema_migrations.sql`

## Run Results

1. `npm run saas:db:migration:bootstrap -- --mode=apply`
   - `run_status=applied`
   - `applied_count=3`

2. `npm run saas:db:postgres:readiness -- --format=json`
   - `postgres_client_runtime_wired=true`
   - `ledger.status=ready`
   - `ledger_persistence_wired=true`
   - `execution_wired=true`

3. `npm run saas:db:postgres:go-no-go -- --format=json`
   - `overall_status=go`
   - `blocking_reasons=[]`

## Boundary Statement

Controlled `go` does not imply default-chain or overall production `GO`.
Default live path remains `sqljs` unless explicitly switched by runtime configuration.

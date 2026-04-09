# MEMORY.md

- **Last Update**: 2026-04-06
- **Project Context**: ChatFlow Pro (龙虾 / OpenClaw)
- **Current Phase**: Phase 20 (Monitoring, Alerting, Autotuning completed)
- **Version**: 1.07.55

## Core Preferences & Style
- **Delivery Strategy**: Phase-based, incremental delivery (packages), highly modular.
- **Workflow**: `npm run` for all lifecycle management; strict adherence to `docs/155` and `COST_SAVING_PLAN.md`.
- **Communication**: Technical, concise, structured logs (raw daily files + curated memory).
- **Compliance**: Strict avoidance of secrets in logs, no fake git, no expanded scope without explicit instruction.

## Key Decisions
- **Handoff System**: Implemented in Phase 18; supports keyword detection and auto-assignment.
- **Reporting**: Implemented Phase 19 (Assignments, SLA, Daily Trends).
- **Operations**: Implemented Phase 20 (Ops Alerts, Autotuning).

## Pending/Future Items
- **Phase 21**: Dynamic Configuration / Admin API (Target).

## Taboos
- No `.env` commits.
- No fake shell/git output.
- No expanded scope (UI,通道测试) without instruction.

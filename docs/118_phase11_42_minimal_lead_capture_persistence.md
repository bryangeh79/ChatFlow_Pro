# Phase 11.42 Minimal Lead Capture Persistence

## Scope

### What This Phase Does
1. **Captured‑only persistence** – Appends a read‑only audit record only when lead status becomes `captured`.
2. **File‑based storage** – JSONL file at `data/local‑captured‑leads.jsonl` (directory created if missing).
3. **Git‑ignored** – `data/` directory added to `.gitignore` to prevent real leads from entering the repository.
4. **Failure‑safe writes** – Persistence errors are caught and silenced; they never affect webhook 200 responses.
5. **Documentation** – This document records the implementation boundaries.

### What This Phase Does NOT Do
- No webhook/adapter contract changes
- No database migrations (Postgres, MySQL, etc.)
- No backend leads API or admin interface
- No multi‑tenant isolation
- No handoff/workflow integration
- No FAQ rule changes
- No duplicate‑detection beyond session‑level "was captured" check

## Implementation Details

### Record Format (JSONL)
Each line is a JSON object with:
```json
{
  "session_id": "website:user123:session456",
  "channel": "website",
  "collected_fields": {
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com"
  },
  "completed_at": "2026‑04‑04T16:30:00.000Z",
  "message_id": "msg_789",
  "captured_at": "2026‑04‑04T16:30:05.123Z"
}
```

### Trigger Condition
Persistence fires **only when**:
- Lead status transitions to `captured` (all three fields present)
- **AND** previous status was **not** `captured` (avoids duplicate writes)

### Error Handling
- `try/catch` wraps the entire file‑write operation
- Errors are logged to `console.error` but **do not bubble up**
- Webhook always returns 200 OK regardless of persistence success/failure
- Debug metadata includes `persisted: true/false` flag for observability

### Storage Location
- Path: `{project‑root}/data/local‑captured‑leads.jsonl`
- Directory created automatically if missing
- File created on first captured lead
- Append‑only (no updates/deletes)

## Files Changed
1. `src/channels/lead‑capture‑hook/persistence.ts` – File‑append module
2. `src/channels/lead‑capture‑hook/index.ts` – Trigger persistence on captured transition
3. `.gitignore` – Added `data/` exclusion
4. `docs/118_phase11_42_minimal_lead_capture_persistence.md` – This document

## Verification
- ✅ `npm run build` passes
- ✅ Dual webhook baseline unchanged
- ✅ No regression in existing lead‑capture logic
- ✅ Persistence only on captured‑transition (tested)
- ✅ Errors silenced (webhook 200 preserved)

## Boundaries Held
- Webhook/adapter contracts unchanged
- No database dependencies
- No backend API changes
- No handoff/menu/state‑machine expansion
- Minimal scope – only captured‑lead file append
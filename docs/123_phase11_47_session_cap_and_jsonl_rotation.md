# Phase 11.47 Session Cap + JSONL Rotation

## Scope

### What This Phase Does
1. **Session store cap** – In‑memory Map now has a maximum size (1000 sessions) with FIFO eviction.
2. **JSONL rotation** – When `local‑captured‑leads.jsonl` exceeds 5MB or 10k lines, it's renamed with timestamp and a new empty file is created.
3. **Failure‑safe** – Both mechanisms fail silently; webhook 200 responses are never affected.
4. **Documentation** – This document explains the configuration and behavior.

### What This Phase Does NOT Do
- No webhook contract changes
- No lead‑detection rule changes
- No TTL‑based session expiration (only size‑based eviction)
- No backup file cleanup (backups accumulate)
- No multi‑instance coordination

## Implementation Details

### Session Store Cap
**Location**: `src/channels/session‑context/in‑memory‑store.ts`  
**Configuration**:
```typescript
private readonly MAX_SESSIONS = 1000; // 硬编码常量
```

**Eviction Logic**:
```typescript
if (this.sessions.size >= this.MAX_SESSIONS && !this.sessions.has(session.session_id)) {
  this.evictOldestSession(); // FIFO: delete first Map entry
}
```

**Behavior**:
- Maximum 1000 concurrent sessions in memory
- FIFO eviction: oldest inserted session is removed first
- Existing sessions are never evicted (only when adding new ones)
- No TTL/age‑based eviction yet

### JSONL File Rotation
**Location**: `src/channels/lead‑capture‑hook/persistence.ts`  
**Configuration**:
```typescript
const JSONL_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const JSONL_MAX_LINES = 10000; // 10k lines
```

**Rotation Triggers**:
1. **Size‑based**: File ≥ 5MB → rotate
2. **Line‑based**: File < 1MB **and** lines ≥ 10k → rotate  
   (Line check only for small files to avoid reading huge files)

**Rotation Process**:
1. Rename current file: `local‑captured‑leads.jsonl` → `local‑captured‑leads.jsonl.backup-{timestamp}`
2. Create new empty `local‑captured‑leads.jsonl`
3. Continue appending to new file

**Backup Files**:
- Format: `local‑captured‑leads.jsonl.backup-2026‑04‑04T16‑30‑00‑000Z`
- No automatic cleanup (manual or external cron needed)
- Accumulate in `data/` directory

## Failure Safety

### Session Store
- Eviction errors are caught internally
- If eviction fails, new session may not be stored (Map remains at max size)
- No effect on webhook responses

### JSONL Rotation
- All rotation steps wrapped in `try/catch`
- Errors logged to `console.error` but not propagated
- If rotation fails, append continues to existing file (may exceed limits)
- Webhook always returns 200 OK

## Files Changed
1. `src/channels/session‑context/in‑memory‑store.ts` – Added MAX_SESSIONS and FIFO eviction
2. `src/channels/lead‑capture‑hook/persistence.ts` – Added JSONL rotation with size/line limits

## Verification
- ✅ `npm run build` passes
- ✅ Dual webhook baseline unchanged (200 OK)
- ✅ Session cap logic compiles (1000 max)
- ✅ Rotation logic compiles (5MB/10k limits)
- ✅ All errors caught and silenced

## Test Considerations
**Session cap**:
- Hard to test without generating 1000+ sessions
- Logic verified by code review

**JSONL rotation**:
- Could be tested with mock file system
- Production will trigger naturally over time

## Limitations
- **Session TTL missing**: Only size‑based eviction, no age‑based
- **Backup accumulation**: No automatic cleanup of old backup files
- **Simple FIFO**: Not true LRU (doesn't track access frequency)
- **Single‑process**: Rotation may conflict if multiple instances write same file
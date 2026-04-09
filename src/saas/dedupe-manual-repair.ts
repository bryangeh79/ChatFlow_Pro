/**
 * Phase D-C3B — single-key manual dedupe repair (Postgres only; apply env-gated + ticket confirm).
 * No batch, no HTTP resend, no scheduler.
 */

import { randomUUID } from 'node:crypto';
import {
  isStructuredRuntimeLogEnabled,
  observabilityFingerprint,
  writeStructuredLog,
} from '../observability/structured-log';
import { getSaaSDbDriver, getSaasDbAdapter } from './db-adapter';
import type { DbRow, SaaSDbAdapter } from './db-adapter/types';

export type DedupeManualRepairLane = 'inbound' | 'outbound' | 'notify';
export type DedupeManualRepairAction = 'close_as_completed' | 'release_for_retry';
export type DedupeManualRepairMode = 'dry_run' | 'apply';

export interface DedupeManualRepairInput {
  mode: DedupeManualRepairMode;
  tenant_id: string;
  lane: DedupeManualRepairLane;
  channel?: string | null;
  event_type?: string | null;
  idempotency_key: string;
  expect_idempotency_key_fp?: string | null;
  action: DedupeManualRepairAction;
  operator: string;
  ticket_id: string;
  reason: string;
  apply_confirm_ticket?: string | null;
  ack_downstream_not_success?: boolean;
  downstream_evidence?: string | null;
}

export interface DedupeManualRepairResult {
  ok: boolean;
  mode: DedupeManualRepairMode;
  write_policy: 'dry_run_no_writes' | 'apply_committed' | 'denied';
  postgres_only?: boolean;
  denied_code?: string;
  message?: string;
  tenant_id?: string;
  lane?: DedupeManualRepairLane;
  action?: DedupeManualRepairAction;
  idempotency_key_fp?: string;
  before_snapshot?: Record<string, unknown> | null;
  after_snapshot?: Record<string, unknown> | null;
  audit_event_id?: string | null;
  detail?: Record<string, unknown>;
}

const MIN_REASON_LEN = 10;
const MIN_TICKET_LEN = 2;
const MIN_DOWNSTREAM_EVIDENCE_LEN = 24;

function nowIso(): string {
  return new Date().toISOString();
}

export function isDedupeManualRepairApplyEnabled(): boolean {
  const v = process.env.CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true';
}

function rowTs(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return String(v ?? '');
}

/** Strip plaintext idempotency key; add fp for audit/snapshots. */
export function dedupeRowToSnapshot(row: DbRow | null): Record<string, unknown> | null {
  if (!row) return null;
  const idem = row.idempotency_key != null ? String(row.idempotency_key) : '';
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'idempotency_key') continue;
    if (k === 'first_seen_at' || k === 'last_seen_at' || k === 'completed_at') {
      o[k] = rowTs(v);
    } else {
      o[k] = v;
    }
  }
  if (idem) o.idempotency_key_fp = observabilityFingerprint(idem);
  return o;
}

type ValidateTrimmedResult =
  | { ok: true; i: DedupeManualRepairInput }
  | (DedupeManualRepairResult & { ok: false });

function validateTrimmed(input: DedupeManualRepairInput): ValidateTrimmedResult {
  const tenant_id = input.tenant_id.trim();
  const idempotency_key = input.idempotency_key.trim();
  const operator = input.operator.trim();
  const ticket_id = input.ticket_id.trim();
  const reason = input.reason.trim();
  const channel = input.channel?.trim() ?? '';
  const event_type = input.event_type?.trim() ?? '';
  const expect_fp = input.expect_idempotency_key_fp?.trim() || null;
  const apply_confirm = input.apply_confirm_ticket?.trim() ?? '';
  const evidence = input.downstream_evidence?.trim() ?? '';

  if (!tenant_id || !idempotency_key || !operator || !ticket_id) {
    return {
      ok: false,
      mode: input.mode,
      write_policy: 'denied',
      denied_code: 'invalid_input',
      message: 'tenant_id, idempotency_key, operator, ticket_id are required.',
    };
  }
  if (ticket_id.length < MIN_TICKET_LEN) {
    return {
      ok: false,
      mode: input.mode,
      write_policy: 'denied',
      denied_code: 'invalid_ticket',
      message: `ticket_id too short (min ${MIN_TICKET_LEN}).`,
    };
  }
  if (reason.length < MIN_REASON_LEN) {
    return {
      ok: false,
      mode: input.mode,
      write_policy: 'denied',
      denied_code: 'invalid_reason',
      message: `reason too short (min ${MIN_REASON_LEN} chars).`,
    };
  }

  if (input.lane === 'notify') {
    if (!event_type) {
      return {
        ok: false,
        mode: input.mode,
        write_policy: 'denied',
        denied_code: 'event_type_required',
        message: 'event_type is required for notify lane.',
      };
    }
  } else if (!channel) {
    return {
      ok: false,
      mode: input.mode,
      write_policy: 'denied',
      denied_code: 'channel_required',
      message: 'channel is required for inbound/outbound lane.',
    };
  }

  const fp = observabilityFingerprint(idempotency_key);
  if (expect_fp && expect_fp.toLowerCase() !== fp.toLowerCase()) {
    return {
      ok: false,
      mode: input.mode,
      write_policy: 'denied',
      denied_code: 'idempotency_key_fp_mismatch',
      message: 'expect_idempotency_key_fp does not match idempotency_key.',
    };
  }

  if (input.mode === 'apply') {
    if (!isDedupeManualRepairApplyEnabled()) {
      return {
        ok: false,
        mode: input.mode,
        write_policy: 'denied',
        denied_code: 'repair_apply_disabled',
        message: 'Set CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED=1 to allow apply.',
      };
    }
    if (apply_confirm !== ticket_id) {
      return {
        ok: false,
        mode: input.mode,
        write_policy: 'denied',
        denied_code: 'apply_confirm_mismatch',
        message: 'apply_confirm_ticket must exactly match ticket_id.',
      };
    }
  }

  if (input.action === 'release_for_retry') {
    if (!input.ack_downstream_not_success) {
      return {
        ok: false,
        mode: input.mode,
        write_policy: 'denied',
        denied_code: 'release_requires_ack',
        message: 'release_for_retry requires ack_downstream_not_success.',
      };
    }
    if (evidence.length < MIN_DOWNSTREAM_EVIDENCE_LEN) {
      return {
        ok: false,
        mode: input.mode,
        write_policy: 'denied',
        denied_code: 'release_requires_evidence',
        message: `downstream_evidence too short (min ${MIN_DOWNSTREAM_EVIDENCE_LEN} chars).`,
      };
    }
  }

  return {
    ok: true,
    i: {
      ...input,
      tenant_id,
      idempotency_key,
      operator,
      ticket_id,
      reason,
      channel: channel || null,
      event_type: event_type || null,
      expect_idempotency_key_fp: expect_fp,
      apply_confirm_ticket: apply_confirm || null,
      downstream_evidence: evidence || null,
    },
  };
}

async function loadRow(
  adapter: SaaSDbAdapter,
  i: DedupeManualRepairInput,
): Promise<DbRow | null> {
  if (i.lane === 'inbound') {
    return adapter.queryOne(
      `SELECT tenant_id, channel, idempotency_key, provider_message_id, status,
              first_seen_at, last_seen_at, completed_at
         FROM tenant_inbound_dedupe
        WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?`,
      [i.tenant_id, i.channel!, i.idempotency_key],
    );
  }
  if (i.lane === 'outbound') {
    return adapter.queryOne(
      `SELECT tenant_id, channel, idempotency_key, session_id, message_trace_id, status, version,
              first_seen_at, last_seen_at, completed_at
         FROM tenant_outbound_dedupe
        WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?`,
      [i.tenant_id, i.channel!, i.idempotency_key],
    );
  }
  return adapter.queryOne(
    `SELECT tenant_id, event_type, idempotency_key, status, version,
            first_seen_at, last_seen_at, completed_at
       FROM tenant_notify_dedupe
      WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?`,
    [i.tenant_id, i.event_type!, i.idempotency_key],
  );
}

async function insertAuditRow(
  adapter: SaaSDbAdapter,
  input: {
    result: 'ok' | 'denied' | 'error';
    tenant_id: string;
    lane: DedupeManualRepairLane;
    channel: string;
    event_type: string;
    idempotency_key_fp: string;
    action: DedupeManualRepairAction;
    operator: string;
    ticket_id: string;
    reason: string;
    before_snapshot: Record<string, unknown> | null;
    after_snapshot: Record<string, unknown> | null;
    detail?: Record<string, unknown> | null;
  },
): Promise<string> {
  const id = randomUUID();
  const ts = nowIso();
  await adapter.execute(
    `INSERT INTO dedupe_manual_repair_audit_events (
       id, ts_iso, mode, result, tenant_id, lane, channel, event_type, idempotency_key_fp,
       action, operator, ticket_id, reason, before_json, after_json, detail_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      ts,
      'apply',
      input.result,
      input.tenant_id,
      input.lane,
      input.channel,
      input.event_type,
      input.idempotency_key_fp,
      input.action,
      input.operator,
      input.ticket_id,
      input.reason,
      input.before_snapshot ? JSON.stringify(input.before_snapshot) : null,
      input.after_snapshot ? JSON.stringify(input.after_snapshot) : null,
      input.detail && Object.keys(input.detail).length > 0 ? JSON.stringify(input.detail) : null,
    ],
  );
  await adapter.persistIfNeeded();
  return id;
}

function previewAfterClose(before: Record<string, unknown> | null, lane: DedupeManualRepairLane): Record<string, unknown> | null {
  if (!before) return null;
  const next: Record<string, unknown> = { ...before, status: 'completed', completed_at: nowIso() };
  if (lane === 'outbound' || lane === 'notify') {
    const v = before['version'] != null ? Number(before['version']) : 1;
    if (Number.isFinite(v)) next['version'] = v + 1;
  }
  return next;
}

export async function runDedupeManualRepair(input: DedupeManualRepairInput): Promise<DedupeManualRepairResult> {
  if (getSaaSDbDriver() !== 'postgres') {
    return {
      ok: false,
      mode: input.mode,
      write_policy: 'denied',
      postgres_only: true,
      denied_code: 'dedupe_manual_repair_postgres_only',
      message: 'D-C3B repair is postgres-only (same boundary as D-C3A).',
    };
  }
  const adapter = await getSaasDbAdapter();
  return executeDedupeManualRepairOnAdapter(adapter, input);
}

/**
 * Core implementation (adapter-bound). Callers must enforce Postgres-only for production;
 * used by verify scripts with sqljs + compatible DDL.
 */
export async function executeDedupeManualRepairOnAdapter(
  adapter: SaaSDbAdapter,
  raw: DedupeManualRepairInput,
): Promise<DedupeManualRepairResult> {
  const v = validateTrimmed(raw);
  if (!v.ok) return v;
  const input = v.i;
  const fp = observabilityFingerprint(input.idempotency_key);
  const channel = input.lane === 'notify' ? '' : input.channel!;
  const event_type = input.lane === 'notify' ? input.event_type! : '';

  const row = await loadRow(adapter, input);
  const before = dedupeRowToSnapshot(row);
  if (!row) {
    return {
      ok: false,
      mode: input.mode,
      write_policy: 'denied',
      denied_code: 'row_not_found',
      message: 'No dedupe row matches tenant/lane/key.',
      tenant_id: input.tenant_id,
      lane: input.lane,
      action: input.action,
      idempotency_key_fp: fp,
      before_snapshot: null,
    };
  }
  if (String(row.status ?? '') !== 'processing') {
    return {
      ok: false,
      mode: input.mode,
      write_policy: 'denied',
      denied_code: 'not_processing',
      message: 'Row is not status=processing; refuse to mutate.',
      tenant_id: input.tenant_id,
      lane: input.lane,
      action: input.action,
      idempotency_key_fp: fp,
      before_snapshot: before,
    };
  }

  if (input.mode === 'dry_run') {
    const afterPreview =
      input.action === 'close_as_completed'
        ? previewAfterClose(before, input.lane)
        : null;
    return {
      ok: true,
      mode: 'dry_run',
      write_policy: 'dry_run_no_writes',
      tenant_id: input.tenant_id,
      lane: input.lane,
      action: input.action,
      idempotency_key_fp: fp,
      before_snapshot: before,
      after_snapshot: afterPreview,
      audit_event_id: null,
      detail: {
        would_mutate: true,
        mutation_kind: input.action === 'close_as_completed' ? 'single_row_complete_or_cas' : 'single_row_delete',
      },
    };
  }

  /* apply */
  const now = nowIso();
  let after: Record<string, unknown> | null = null;
  let auditResult: 'ok' | 'denied' = 'ok';
  let auditDetail: Record<string, unknown> | null =
    input.action === 'release_for_retry'
      ? {
          downstream_evidence: input.downstream_evidence,
        }
      : null;

  try {
    if (input.action === 'close_as_completed') {
      if (input.lane === 'inbound') {
        const u = await adapter.queryOne(
          `UPDATE tenant_inbound_dedupe
              SET status = 'completed', last_seen_at = ?, completed_at = ?
            WHERE tenant_id = ?
              AND channel = ?
              AND idempotency_key = ?
              AND status = 'processing'
            RETURNING tenant_id`,
          [now, now, input.tenant_id, input.channel!, input.idempotency_key],
        );
        if (!u) {
          auditResult = 'denied';
          auditDetail = { ...auditDetail, code: 'inbound_update_no_row' };
        }
      } else if (input.lane === 'outbound') {
        const ver = Number(row.version ?? 1);
        const u = await adapter.queryOne(
          `UPDATE tenant_outbound_dedupe
              SET status = 'completed',
                  version = version + 1,
                  last_seen_at = ?,
                  completed_at = ?
            WHERE tenant_id = ?
              AND channel = ?
              AND idempotency_key = ?
              AND status = 'processing'
              AND version = ?
            RETURNING version`,
          [now, now, input.tenant_id, input.channel!, input.idempotency_key, ver],
        );
        if (!u) {
          auditResult = 'denied';
          auditDetail = { ...auditDetail, code: 'outbound_cas_miss_or_race' };
        }
      } else {
        const ver = Number(row.version ?? 1);
        const u = await adapter.queryOne(
          `UPDATE tenant_notify_dedupe
              SET status = 'completed',
                  version = version + 1,
                  last_seen_at = ?,
                  completed_at = ?
            WHERE tenant_id = ?
              AND event_type = ?
              AND idempotency_key = ?
              AND status = 'processing'
              AND version = ?
            RETURNING version`,
          [now, now, input.tenant_id, input.event_type!, input.idempotency_key, ver],
        );
        if (!u) {
          auditResult = 'denied';
          auditDetail = { ...auditDetail, code: 'notify_cas_miss_or_race' };
        }
      }
    } else {
      /* release_for_retry — single-row DELETE */
      let d: DbRow | null = null;
      if (input.lane === 'inbound') {
        d = await adapter.queryOne(
          `DELETE FROM tenant_inbound_dedupe
            WHERE tenant_id = ?
              AND channel = ?
              AND idempotency_key = ?
              AND status = 'processing'
            RETURNING tenant_id`,
          [input.tenant_id, input.channel!, input.idempotency_key],
        );
      } else if (input.lane === 'outbound') {
        d = await adapter.queryOne(
          `DELETE FROM tenant_outbound_dedupe
            WHERE tenant_id = ?
              AND channel = ?
              AND idempotency_key = ?
              AND status = 'processing'
            RETURNING tenant_id`,
          [input.tenant_id, input.channel!, input.idempotency_key],
        );
      } else {
        d = await adapter.queryOne(
          `DELETE FROM tenant_notify_dedupe
            WHERE tenant_id = ?
              AND event_type = ?
              AND idempotency_key = ?
              AND status = 'processing'
            RETURNING tenant_id`,
          [input.tenant_id, input.event_type!, input.idempotency_key],
        );
      }
      if (!d) {
        auditResult = 'denied';
        auditDetail = { ...auditDetail, code: 'delete_no_row' };
      }
      after = null;
    }

    if (auditResult === 'ok' && input.action === 'close_as_completed') {
      const r2 = await loadRow(adapter, input);
      after = dedupeRowToSnapshot(r2);
    } else if (auditResult === 'denied') {
      after = dedupeRowToSnapshot(await loadRow(adapter, input));
    }

    const auditId = await insertAuditRow(adapter, {
      result: auditResult,
      tenant_id: input.tenant_id,
      lane: input.lane,
      channel,
      event_type,
      idempotency_key_fp: fp,
      action: input.action,
      operator: input.operator,
      ticket_id: input.ticket_id,
      reason: input.reason,
      before_snapshot: before,
      after_snapshot: after,
      detail: auditDetail,
    });

    if (auditResult === 'ok' && isStructuredRuntimeLogEnabled()) {
      writeStructuredLog({
        type: 'dedupe_manual_repair',
        phase: 'admin',
        outcome: 'ok',
        code: input.action,
        tenant_id: input.tenant_id,
        lane: input.lane,
        action: input.action,
        ticket_id: input.ticket_id,
        operator: input.operator,
        idempotency_key_fp: fp,
        audit_event_id: auditId,
      });
    }

    if (auditResult === 'denied') {
      return {
        ok: false,
        mode: 'apply',
        write_policy: 'denied',
        denied_code: String(auditDetail?.code ?? 'apply_denied'),
        message: 'Mutation affected 0 rows (CAS miss, race, or state changed).',
        tenant_id: input.tenant_id,
        lane: input.lane,
        action: input.action,
        idempotency_key_fp: fp,
        before_snapshot: before,
        after_snapshot: dedupeRowToSnapshot(await loadRow(adapter, input)),
        audit_event_id: auditId,
        detail: auditDetail ?? undefined,
      };
    }

    return {
      ok: true,
      mode: 'apply',
      write_policy: 'apply_committed',
      tenant_id: input.tenant_id,
      lane: input.lane,
      action: input.action,
      idempotency_key_fp: fp,
      before_snapshot: before,
      after_snapshot: after,
      audit_event_id: auditId,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let auditId: string | null = null;
    try {
      auditId = await insertAuditRow(adapter, {
        result: 'error',
        tenant_id: input.tenant_id,
        lane: input.lane,
        channel,
        event_type,
        idempotency_key_fp: fp,
        action: input.action,
        operator: input.operator,
        ticket_id: input.ticket_id,
        reason: input.reason,
        before_snapshot: before,
        after_snapshot: null,
        detail: { error: msg },
      });
    } catch {
      auditId = null;
    }

    return {
      ok: false,
      mode: 'apply',
      write_policy: 'denied',
      denied_code: 'apply_error',
      message: msg,
      tenant_id: input.tenant_id,
      lane: input.lane,
      action: input.action,
      idempotency_key_fp: fp,
      before_snapshot: before,
      audit_event_id: auditId,
    };
  }
}

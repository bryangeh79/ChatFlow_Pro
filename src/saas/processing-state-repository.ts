import { logStateCasConflict } from '../observability/state-cas-log';
import { getSaasDbAdapter } from './db-adapter';

export interface TenantProcessingStatePayload {
  phase: string;
  dispatch_stage: string;
  policy_path: string;
  faq_matched: boolean;
  handoff_required: boolean;
  request_id?: string;
  message_trace_id?: string;
}

export interface TenantProcessingStateRow {
  tenant_id: string;
  session_id: string;
  processing_stage: string;
  state: TenantProcessingStatePayload;
  version: number;
  updated_at: string;
}

export type UpsertTenantProcessingStateResult =
  | { ok: true; version: number }
  | { ok: false; reason: 'cas_conflict' };

function nowIso(): string {
  return new Date().toISOString();
}

function parsePayload(raw: unknown): TenantProcessingStatePayload | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as TenantProcessingStatePayload;
  } catch {
    return null;
  }
}

export async function getTenantProcessingState(
  tenantId: string,
  sessionId: string,
): Promise<TenantProcessingStateRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    `SELECT tenant_id, session_id, processing_stage, state_json, version, updated_at
       FROM tenant_processing_state
      WHERE tenant_id = ? AND session_id = ?`,
    [tenantId, sessionId],
  );
  if (!row) return null;
  const payload = parsePayload(row.state_json);
  if (!payload) return null;
  return {
    tenant_id: String(row.tenant_id),
    session_id: String(row.session_id),
    processing_stage: String(row.processing_stage),
    state: payload,
    version: Number(row.version ?? 0),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

export async function upsertTenantProcessingStateWithCas(input: {
  tenant_id: string;
  session_id: string;
  processing_stage: string;
  state: TenantProcessingStatePayload;
  expected_version: number | null;
}): Promise<UpsertTenantProcessingStateResult> {
  const adapter = await getSaasDbAdapter();
  const payload = JSON.stringify(input.state);
  const updatedAt = nowIso();

  if (input.expected_version === null) {
    const inserted = await adapter.queryOne(
      `INSERT INTO tenant_processing_state (
         tenant_id, session_id, processing_stage, state_json, version, updated_at
       ) VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT (tenant_id, session_id)
       DO NOTHING
       RETURNING version`,
      [input.tenant_id, input.session_id, input.processing_stage, payload, updatedAt],
    );
    if (!inserted) {
      logStateCasConflict({
        layer: 'processing_state',
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        channel: null,
      });
      return { ok: false, reason: 'cas_conflict' };
    }
    return { ok: true, version: Number(inserted.version ?? 1) };
  }

  const updated = await adapter.queryOne(
    `UPDATE tenant_processing_state
        SET processing_stage = ?,
            state_json = ?,
            version = version + 1,
            updated_at = ?
      WHERE tenant_id = ?
        AND session_id = ?
        AND version = ?
      RETURNING version`,
    [
      input.processing_stage,
      payload,
      updatedAt,
      input.tenant_id,
      input.session_id,
      input.expected_version,
    ],
  );
  if (!updated) {
    logStateCasConflict({
      layer: 'processing_state',
      tenant_id: input.tenant_id,
      session_id: input.session_id,
      channel: null,
    });
    return { ok: false, reason: 'cas_conflict' };
  }
  return { ok: true, version: Number(updated.version ?? input.expected_version + 1) };
}

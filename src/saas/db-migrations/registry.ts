import { resolveSaasMigrationAssetPath, sha256HexOfFile } from './checksum';
import type {
  MigrationLedgerStatus,
  SaasDbMigrationDef,
  SaasDbMigrationPlanEntry,
} from './types';

/** Ledger table name; DDL asset `postgres/pg_0003_saas_schema_migrations.sql` (app does not auto-apply). */
export const SAAS_SCHEMA_MIGRATIONS_TABLE = 'saas_schema_migrations';

type MigrationBase = Omit<SaasDbMigrationDef, 'checksum_sha256'>;

const SAAS_DB_MIGRATIONS_BASE: readonly MigrationBase[] = [
  {
    id: 'pg_0001_core_saas_tables',
    description: 'Core SaaS tenant metadata: tenants, credentials, FAQ entries, settings.',
    target_driver: 'postgres',
    phase_tag: 'phase24_2e',
    kind: 'schema',
    up_summary: 'CREATE core tenant tables per postgres/pg_0001_core_saas_tables.sql.',
    down_summary: 'Drop core SaaS tables — destructive; no automated down in MVP.',
    asset_path: 'postgres/pg_0001_core_saas_tables.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0002_admin_principals_and_audit',
    description: 'tenant_admin_principals + tenant_admin_principal_audit_logs (+ indexes).',
    target_driver: 'postgres',
    phase_tag: 'phase24_2e',
    kind: 'schema',
    up_summary: 'CREATE principal + audit tables per postgres/pg_0002_admin_principals_and_audit.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0002_admin_principals_and_audit.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0003_saas_schema_migrations',
    description: 'Migration ledger table `saas_schema_migrations` (persistence boundary).',
    target_driver: 'postgres',
    phase_tag: 'phase24_2e',
    kind: 'schema',
    up_summary: 'CREATE saas_schema_migrations per postgres/pg_0003_saas_schema_migrations.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0003_saas_schema_migrations.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0004_phasea_control_plane',
    description:
      'Phase A control-plane tables: tenant_test_results/runtime_health/go_live_checks/website_domains/activity.',
    target_driver: 'postgres',
    phase_tag: 'phasea_v2',
    kind: 'schema',
    up_summary: 'Add Phase A control-plane schema per postgres/pg_0004_phasea_control_plane.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0004_phasea_control_plane.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0005_phaseb_ops_trackability',
    description: 'Phase B schema: knowledge source/update fields + platform_logs + platform_settings.',
    target_driver: 'postgres',
    phase_tag: 'phaseb_v1',
    kind: 'schema',
    up_summary: 'Add Phase B ops trackability schema per postgres/pg_0005_phaseb_ops_trackability.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0005_phaseb_ops_trackability.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0006_phasec_workflow_layer',
    description: 'Phase C workflow schema: conversations/messages/assignments/leads/lead_events.',
    target_driver: 'postgres',
    phase_tag: 'phasec_v1',
    kind: 'schema',
    up_summary: 'Add Phase C workflow schema per postgres/pg_0006_phasec_workflow_layer.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0006_phasec_workflow_layer.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0007_phasedb2_session_state',
    description:
      'Phase D-B2 first slice: tenant_session_state table for externalized session state with version CAS.',
    target_driver: 'postgres',
    phase_tag: 'phasedb2_v1',
    kind: 'schema',
    up_summary: 'Add tenant_session_state schema per postgres/pg_0007_phasedb2_session_state.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0007_phasedb2_session_state.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0008_phasedb2_processing_state',
    description:
      'Phase D-B2 processing state: per-session processing stage snapshot with version CAS.',
    target_driver: 'postgres',
    phase_tag: 'phasedb2_v1',
    kind: 'schema',
    up_summary: 'Add tenant_processing_state schema per postgres/pg_0008_phasedb2_processing_state.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0008_phasedb2_processing_state.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0009_phasedb2_delivery_state',
    description: 'Phase D-B2 delivery state: per-session outbound result snapshot with version CAS.',
    target_driver: 'postgres',
    phase_tag: 'phasedb2_v1',
    kind: 'schema',
    up_summary: 'Add tenant_delivery_state schema per postgres/pg_0009_phasedb2_delivery_state.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0009_phasedb2_delivery_state.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0010_phasedb3_inbound_dedupe',
    description: 'Phase D-B3 first slice: inbound dedupe table and uniqueness contract.',
    target_driver: 'postgres',
    phase_tag: 'phasedb3_v1',
    kind: 'schema',
    up_summary: 'Add tenant_inbound_dedupe schema per postgres/pg_0010_phasedb3_inbound_dedupe.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0010_phasedb3_inbound_dedupe.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0011_phasedb3_outbound_dedupe',
    description: 'Phase D-B3 second slice: outbound dedupe table and uniqueness contract.',
    target_driver: 'postgres',
    phase_tag: 'phasedb3_v1',
    kind: 'schema',
    up_summary: 'Add tenant_outbound_dedupe schema per postgres/pg_0011_phasedb3_outbound_dedupe.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0011_phasedb3_outbound_dedupe.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0012_phasedb3_notify_dedupe',
    description: 'Phase D-B3 third slice: notify dedupe table and uniqueness contract.',
    target_driver: 'postgres',
    phase_tag: 'phasedb3_v1',
    kind: 'schema',
    up_summary: 'Add tenant_notify_dedupe schema per postgres/pg_0012_phasedb3_notify_dedupe.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0012_phasedb3_notify_dedupe.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0013_phasedc2b1_credential_rotation_events',
    description: 'Phase D-C2B1: tenant_credential_rotation_events ledger (rotation fingerprints, no secrets).',
    target_driver: 'postgres',
    phase_tag: 'phasedc2b1_v1',
    kind: 'schema',
    up_summary: 'Add tenant_credential_rotation_events per postgres/pg_0013_phasedc2b1_credential_rotation_events.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0013_phasedc2b1_credential_rotation_events.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0014_phasedc2b2_break_glass_audit',
    description: 'Phase D-C2B2: break_glass_audit_events for TTL gate audit (no secrets).',
    target_driver: 'postgres',
    phase_tag: 'phasedc2b2_v1',
    kind: 'schema',
    up_summary: 'Add break_glass_audit_events per postgres/pg_0014_phasedc2b2_break_glass_audit.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0014_phasedc2b2_break_glass_audit.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0015_phasedc3b_dedupe_manual_repair_audit',
    description:
      'Phase D-C3B: dedupe_manual_repair_audit_events for single-key manual dedupe repair audit (no secrets).',
    target_driver: 'postgres',
    phase_tag: 'phasedc3b_v1',
    kind: 'schema',
    up_summary: 'Add dedupe_manual_repair_audit_events per postgres/pg_0015_phasedc3b_dedupe_manual_repair_audit.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0015_phasedc3b_dedupe_manual_repair_audit.sql',
    asset_kind: 'sql_file',
  },
];

function buildMigrationsWithChecksums(): readonly SaasDbMigrationDef[] {
  return SAAS_DB_MIGRATIONS_BASE.map((m) => {
    const abs = resolveSaasMigrationAssetPath(m.asset_path);
    const checksum_sha256 = sha256HexOfFile(abs);
    return { ...m, checksum_sha256 };
  });
}

/** Resolved migrations with checksums; throws if any SQL asset is missing or unreadable. */
export const SAAS_DB_MIGRATIONS: readonly SaasDbMigrationDef[] = buildMigrationsWithChecksums();

const STATUS_PENDING: MigrationLedgerStatus = 'pending_no_ledger';

export function listSaasDbMigrations(): readonly SaasDbMigrationDef[] {
  return SAAS_DB_MIGRATIONS;
}

export function buildSaasDbMigrationPlan(): {
  ledger_table_future: string;
  migrations: SaasDbMigrationPlanEntry[];
} {
  return {
    ledger_table_future: SAAS_SCHEMA_MIGRATIONS_TABLE,
    migrations: SAAS_DB_MIGRATIONS.map((m) => ({ ...m, status: STATUS_PENDING })),
  };
}

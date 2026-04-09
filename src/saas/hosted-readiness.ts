import { getSaaSDbDriver } from './db-adapter';
import { getPostgresExecutionReadiness } from './db-adapter/postgres-metadata';

export interface HostedReadinessResult {
  ready: boolean;
  http_status: 200 | 503;
  reasons: string[];
  migration_in_progress: boolean;
  db_driver: 'sqljs' | 'postgres';
}

function isMigrationInProgress(): boolean {
  return (process.env.CHATFLOW_SAAS_MIGRATION_IN_PROGRESS?.trim() ?? '') === '1';
}

function isSqlJsCompatStartupAllowed(dbDriver: 'sqljs' | 'postgres'): boolean {
  if (dbDriver !== 'sqljs') return false;
  return (process.env.CHATFLOW_SAAS_SQLJS_COMPAT?.trim() ?? '') === '1';
}

export async function evaluateHostedReadiness(): Promise<HostedReadinessResult> {
  const reasons: string[] = [];
  const db_driver = getSaaSDbDriver();
  const migration_in_progress = isMigrationInProgress();

  if (isSqlJsCompatStartupAllowed(db_driver)) {
    return {
      ready: !migration_in_progress,
      http_status: migration_in_progress ? 503 : 200,
      reasons: migration_in_progress ? ['migration_in_progress'] : [],
      migration_in_progress,
      db_driver,
    };
  }

  const pg = await getPostgresExecutionReadiness();

  if (db_driver !== 'postgres') {
    reasons.push('default_live_driver_not_postgres');
  }
  if (!pg.postgres_client_runtime_wired) {
    reasons.push('postgres_unreachable_or_runtime_unwired');
  }
  if (!pg.connection_config_valid) {
    reasons.push('postgres_connection_config_invalid');
  }
  if (!pg.ledger_persistence_wired) {
    reasons.push('postgres_migration_ledger_not_ready');
  }
  if (!pg.execution_wired) {
    reasons.push('postgres_migration_execution_not_ready');
  }
  if (migration_in_progress) {
    reasons.push('migration_in_progress');
  }

  const ready = reasons.length === 0;
  return {
    ready,
    http_status: ready ? 200 : 503,
    reasons,
    migration_in_progress,
    db_driver,
  };
}

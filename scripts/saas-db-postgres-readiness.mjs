/**
 * Postgres migration / schema metadata readiness (read-only stub — no pg, no DB I/O).
 * Requires: npm run build
 *
 * Usage: node scripts/saas-db-postgres-readiness.mjs [--format=json|text]
 */

import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);

function parseFormat(argv) {
  const i = argv.indexOf('--format');
  if (i >= 0 && argv[i + 1]) {
    const f = String(argv[i + 1]).toLowerCase();
    if (f === 'json' || f === 'text') return f;
    console.error('saas_db_postgres_readiness_error: invalid_format');
    process.exit(1);
  }
  return 'json';
}

function main() {
  const format = parseFormat(process.argv.slice(2));
  const {
    getPostgresMigrationLedgerInfo,
    getPostgresSchemaAssetInfo,
    getPostgresExecutionReadiness,
    getPostgresClientGateSummary,
    POSTGRES_METADATA_QUERY_NOT_WIRED,
  } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js'));

  const ledger = getPostgresMigrationLedgerInfo();
  const schema_assets = getPostgresSchemaAssetInfo();
  const readiness = getPostgresExecutionReadiness();
  const postgres_client_gate = getPostgresClientGateSummary();

  const payload = {
    ok: true,
    note: 'not_a_db_healthcheck: stub metadata only; no postgres connection; execution not wired',
    postgres_metadata_query_not_wired: true,
    constant: POSTGRES_METADATA_QUERY_NOT_WIRED,
    postgres_client_gate,
    postgres_client_gate_enabled: readiness.postgres_client_gate_enabled,
    postgres_client_runtime_wired: readiness.postgres_client_runtime_wired,
    ledger,
    schema_assets: {
      count: schema_assets.count,
      checksums_preview: schema_assets.migrations.map((m) => ({
        id: m.id,
        checksum_sha256: m.checksum_sha256,
      })),
      message: schema_assets.message,
    },
    readiness,
  };

  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('saas_db_postgres_readiness: stub_summary');
  console.log(`driver: ${readiness.driver}`);
  console.log(
    `postgres_client_gate_enabled: ${readiness.postgres_client_gate_enabled} postgres_client_runtime_wired: ${readiness.postgres_client_runtime_wired}`,
  );
  console.log(`adapter_stub: ${readiness.adapter_stub} execution_wired: ${readiness.execution_wired} ledger_persistence_wired: ${readiness.ledger_persistence_wired}`);
  console.log(`sql_assets_present: ${readiness.sql_assets_present}`);
  console.log(`ledger_table: ${ledger.ledger_table} exists: ${ledger.exists} status: ${ledger.status}`);
  console.log(`migration_sql_assets_count: ${schema_assets.count}`);
  console.log(readiness.message);
}

main();

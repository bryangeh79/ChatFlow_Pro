/**
 * Postgres migration / schema / optional TCP probe readiness (not full production health).
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

async function main() {
  const format = parseFormat(process.argv.slice(2));
  const {
    getPostgresMigrationLedgerInfo,
    getPostgresSchemaAssetInfo,
    getPostgresExecutionReadiness,
    getPostgresClientGateSummary,
    getPostgresClientRuntimeSummary,
    getPostgresConnectionConfigSummary,
    getPostgresProbeGateSummary,
    POSTGRES_METADATA_QUERY_NOT_WIRED,
  } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js'));

  const ledger = getPostgresMigrationLedgerInfo();
  const schema_assets = getPostgresSchemaAssetInfo();
  const readiness = await getPostgresExecutionReadiness();
  const postgres_client_gate = getPostgresClientGateSummary();
  const postgres_client_runtime = await getPostgresClientRuntimeSummary();
  const postgres_connection_config = getPostgresConnectionConfigSummary();
  const postgres_probe_gate = getPostgresProbeGateSummary();

  const payload = {
    ok: true,
    note:
      'not_a_db_healthcheck: metadata + config contract; optional TCP connect/end only when CHATFLOW_SAAS_POSTGRES_PROBE=1 and strict gates; not full postgres readiness',
    postgres_metadata_query_not_wired: true,
    constant: POSTGRES_METADATA_QUERY_NOT_WIRED,
    postgres_client_gate,
    postgres_client_runtime,
    postgres_client_gate_enabled: readiness.postgres_client_gate_enabled,
    postgres_client_module_available: readiness.postgres_client_module_available,
    postgres_client_runtime_wired: readiness.postgres_client_runtime_wired,
    postgres_connection_config,
    connection_config_present: readiness.connection_config_present,
    connection_config_valid: readiness.connection_config_valid,
    connection_config_source: readiness.connection_config_source,
    connection_message: readiness.connection_message,
    postgres_probe_gate,
    postgres_probe_enabled: readiness.postgres_probe_enabled,
    postgres_probe_attempted: readiness.postgres_probe_attempted,
    postgres_probe_status: readiness.postgres_probe_status,
    postgres_probe_message: readiness.postgres_probe_message,
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
    `postgres_client_gate_enabled: ${readiness.postgres_client_gate_enabled} module_available: ${readiness.postgres_client_module_available} runtime_wired: ${readiness.postgres_client_runtime_wired}`,
  );
  console.log(`adapter_stub: ${readiness.adapter_stub} execution_wired: ${readiness.execution_wired} ledger_persistence_wired: ${readiness.ledger_persistence_wired}`);
  console.log(`sql_assets_present: ${readiness.sql_assets_present}`);
  console.log(`ledger_table: ${ledger.ledger_table} exists: ${ledger.exists} status: ${ledger.status}`);
  console.log(`migration_sql_assets_count: ${schema_assets.count}`);
  console.log(
    `connection: present=${readiness.connection_config_present} valid=${readiness.connection_config_valid} source=${readiness.connection_config_source}`,
  );
  if (postgres_connection_config.redacted_url) {
    console.log(`connection_redacted_url: ${postgres_connection_config.redacted_url}`);
  } else if (postgres_connection_config.host) {
    console.log(
      `connection_host: ${postgres_connection_config.host} port: ${postgres_connection_config.port} db: ${postgres_connection_config.database} user: ${postgres_connection_config.user} ssl: ${postgres_connection_config.ssl_enabled}`,
    );
  }
  console.log(`connection_message: ${readiness.connection_message}`);
  console.log(
    `probe: enabled=${readiness.postgres_probe_enabled} attempted=${readiness.postgres_probe_attempted} status=${readiness.postgres_probe_status}`,
  );
  console.log(`probe_message: ${readiness.postgres_probe_message}`);
  console.log(readiness.message);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

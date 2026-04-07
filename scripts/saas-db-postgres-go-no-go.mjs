/**
 * Postgres runtime go / no-go summary (Phase 24 / 2M). No secrets in output.
 * Requires: npm run build
 *
 * Usage: node scripts/saas-db-postgres-go-no-go.mjs [--format=json|text]
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
    console.error('saas_db_postgres_go_no_go_error: invalid_format');
    process.exit(1);
  }
  return 'json';
}

async function main() {
  const format = parseFormat(process.argv.slice(2));
  const { evaluatePostgresGoNoGo } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js'));
  const result = await evaluatePostgresGoNoGo();

  if (format === 'json') {
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }

  console.log('saas_db_postgres_go_no_go');
  console.log(`overall_status: ${result.overall_status}`);
  console.log(`blocking_reasons: ${result.blocking_reasons.join('; ') || '(none)'}`);
  console.log(
    `summary: driver=${result.summary.driver} client_gate=${result.summary.postgres_client_gate_enabled} config_valid=${result.summary.connection_config_valid} probe=${result.summary.postgres_probe_status} probe_enabled=${result.summary.postgres_probe_enabled}`,
  );
  console.log('checks:');
  for (const c of result.checks) {
    console.log(`  [${c.ok ? 'ok' : 'NO'}] ${c.id} (required=${c.required_for_go}) ${c.label}`);
  }
  console.log('next_required_capabilities:');
  for (const line of result.next_required_capabilities) {
    console.log(`  - ${line}`);
  }
  console.log(`note: ${result.note}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

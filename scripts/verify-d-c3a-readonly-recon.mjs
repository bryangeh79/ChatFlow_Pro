/**
 * Phase D-C3A — verify read-only recon module: no writes, sqljs empty path, source guard.
 * Run: npm run build && node scripts/verify-d-c3a-readonly-recon.mjs
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const srcPath = join(root, 'src', 'saas', 'dedupe-consistency-readonly.ts');
const src = readFileSync(srcPath, 'utf8');
if (src.includes('adapter.execute') || src.includes('.execute(')) {
  console.error(JSON.stringify({ ok: false, step: 'source_must_not_call_execute', path: srcPath }));
  process.exit(1);
}
if (!src.includes("write_policy: 'readonly'") && !src.includes('write_policy: "readonly"')) {
  console.error(JSON.stringify({ ok: false, step: 'report_must_declare_readonly' }));
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'cf-d3a-verify-'));
const dbPath = join(dir, 'saas.sqlite');
process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;

const { listDedupeConsistencyGaps, parseDedupeConsistencyStaleMinutesFromEnv } = await import(
  '../dist/src/saas/dedupe-consistency-readonly.js'
);

const sm = parseDedupeConsistencyStaleMinutesFromEnv();
if (typeof sm !== 'number' || sm < 1) {
  console.error(JSON.stringify({ ok: false, step: 'stale_minutes_parse' }));
  process.exit(1);
}

const r = await listDedupeConsistencyGaps({ staleMinutes: 30, maxRows: 100 });
if (r.write_policy !== 'readonly') {
  console.error(JSON.stringify({ ok: false, step: 'write_policy', r }));
  process.exit(1);
}
if (r.driver !== 'sqljs') {
  console.error(JSON.stringify({ ok: false, step: 'expected_sqljs_driver', r }));
  process.exit(1);
}
if (r.rows.length !== 0 || r.row_count !== 0) {
  console.error(JSON.stringify({ ok: false, step: 'sqljs_must_return_zero_rows', r }));
  process.exit(1);
}
if (!r.postgres_only || !r.note) {
  console.error(JSON.stringify({ ok: false, step: 'sqljs_must_note_postgres_only', r }));
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true, message: 'D-C3A readonly recon verify passed' }, null, 2));

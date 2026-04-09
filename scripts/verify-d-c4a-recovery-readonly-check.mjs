/**
 * Phase D-C4A — verify recovery-readonly-check: no execute(), sqljs skip path, tier vocabulary.
 * Run: npm run build && node scripts/verify-d-c4a-recovery-readonly-check.mjs
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const srcPath = join(root, 'src', 'saas', 'recovery-readonly-check.ts');
const src = readFileSync(srcPath, 'utf8');
if (src.includes('.execute(') || src.includes('adapter.execute')) {
  console.error(JSON.stringify({ ok: false, step: 'source_must_not_call_adapter_execute', path: srcPath }));
  process.exit(1);
}
if (!src.includes("write_policy: 'readonly'") && !src.includes('write_policy: "readonly"')) {
  console.error(JSON.stringify({ ok: false, step: 'report_must_declare_readonly' }));
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'cf-d4a-verify-'));
const dbPath = join(dir, 'saas.sqlite');
process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;

const { runRecoveryReadonlyCheck } = await import('../dist/src/saas/recovery-readonly-check.js');

const r = await runRecoveryReadonlyCheck({});
if (r.write_policy !== 'readonly' || r.phase !== 'd-c4a') {
  console.error(JSON.stringify({ ok: false, step: 'report_shape', r }));
  process.exit(1);
}
if (!r.postgres_only) {
  console.error(JSON.stringify({ ok: false, step: 'expected_sqljs_postgres_only', r }));
  process.exit(1);
}
if (r.overall_tier !== 'observe') {
  console.error(JSON.stringify({ ok: false, step: 'sqljs_tier_observe', r }));
  process.exit(1);
}
if (r.steps.length !== 0) {
  console.error(JSON.stringify({ ok: false, step: 'sqljs_empty_steps', r }));
  process.exit(1);
}

const tiers = ['observe', 'manual_d_c3b_only', 'freeze_no_go'];
function tierOk(t) {
  return tiers.includes(t);
}
if (!tierOk(r.overall_tier)) {
  console.error(JSON.stringify({ ok: false, step: 'tier_enum', r }));
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true, message: 'D-C4A recovery readonly check verify passed' }, null, 2));

/**
 * Phase D-C4C — Read-only governance bundle (C1). No DB writes; no D-C3B; no D-C4A semantic changes.
 * Run: npm run verify:d-c4c-readonly-governance-bundle
 * CI (after build): npm run verify:d-c4c-readonly-governance-bundle:ci
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const skipBuild = process.argv.includes('--skip-build');

function log(obj) {
  console.log(JSON.stringify({ phase: 'd-c4c-bundle', ...obj }));
}

function runShell(label, cmd) {
  log({ step: label, status: 'start' });
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
    log({ step: label, status: 'pass' });
  } catch (e) {
    const code = e.status ?? 1;
    log({ step: label, status: 'fail', exitCode: code });
    process.exit(code);
  }
}

if (!skipBuild) {
  runShell('build', 'npm run build');
} else {
  log({ step: 'build', status: 'skipped', reason: '--skip-build' });
}

runShell('verify_migration_assets', 'node scripts/verify-saas-db-migration-assets.mjs');
runShell('verify_d4a_readonly', 'node scripts/verify-d-c4a-recovery-readonly-check.mjs');

const docs = [
  join('docs', 'internal', 'd-c4c-readonly-governance-bundle-spec.md'),
  join('docs', 'internal', 'd-c4c-ci-rc-staging-gates.md'),
];
log({ step: 'verify_c4c_docs_present', status: 'start' });
for (const rel of docs) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    log({ step: 'verify_c4c_docs_present', status: 'fail', missing: rel });
    process.exit(1);
  }
}
log({ step: 'verify_c4c_docs_present', status: 'pass' });

console.log(JSON.stringify({ ok: true, phase: 'd-c4c-bundle', message: 'readonly governance bundle passed' }, null, 2));

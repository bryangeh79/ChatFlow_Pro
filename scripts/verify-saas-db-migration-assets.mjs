/**
 * Phase 24 / 2E — SQL migration assets + checksum model (no pg).
 * Requires: npm run build
 */

import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const { listSaasDbMigrations } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-migrations', 'registry.js'));
  const { resolveSaasMigrationAssetPath, sha256HexOfFile } = require(pathJoin(
    root,
    'dist',
    'src',
    'saas',
    'db-migrations',
    'checksum.js',
  ));

  const list = listSaasDbMigrations();
  const hex64 = /^[a-f0-9]{64}$/;

  for (const m of list) {
    if (!m.asset_path) fail(`missing asset_path: ${m.id}`);
    let abs;
    try {
      abs = resolveSaasMigrationAssetPath(m.asset_path);
    } catch (e) {
      fail(`resolve asset ${m.id}: ${e}`);
    }
    if (!existsSync(abs)) fail(`sql file missing: ${abs}`);
    const h1 = sha256HexOfFile(abs);
    const h2 = sha256HexOfFile(abs);
    if (h1 !== h2) fail('checksum unstable');
    if (h1 !== m.checksum_sha256) fail(`registry checksum mismatch for ${m.id}`);
    if (!hex64.test(m.checksum_sha256)) fail(`checksum not hex64: ${m.id}`);
  }

  const planOut = execFileSync(process.execPath, [pathJoin(root, 'scripts', 'saas-db-migration-plan.mjs'), '--format=json'], {
    cwd: root,
    encoding: 'utf8',
  });
  const planJson = JSON.parse(planOut);
  if (!planJson.planned_migrations?.every((r) => r.checksum_sha256 && hex64.test(r.checksum_sha256))) {
    fail('plan json missing checksum_sha256');
  }

  const bootOut = execFileSync(process.execPath, [pathJoin(root, 'scripts', 'saas-db-migration-bootstrap.mjs')], {
    cwd: root,
    encoding: 'utf8',
  });
  if (!bootOut.includes('saas_migration_bootstrap: sql_assets_summary')) fail('bootstrap missing sql_assets_summary');
  if (!bootOut.includes('checksum_sha256=')) fail('bootstrap missing checksum lines');

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', 'verify-saas-db-migration-ledger.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('verify-saas-db-migration-ledger failed')),
    );
  });

  console.log('verify-saas-db-migration-assets: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

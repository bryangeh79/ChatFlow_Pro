#!/usr/bin/env node
/**
 * One-command vendor release helper.
 *
 * Steps:
 * 1) npm run release:prepare
 * 2) npm run delivery:zip
 * 3) npm run report:github-ci
 */

import { spawnSync } from 'node:child_process';

const steps = [
  ['npm', ['run', 'release:prepare']],
  ['npm', ['run', 'delivery:zip']],
  ['npm', ['run', 'report:github-ci']],
];

for (const [cmd, args] of steps) {
  console.log(`\n[release:ship] $ ${cmd} ${args.join(' ')}`);
  const r =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', `${cmd} ${args.join(' ')}`], { stdio: 'inherit' })
      : spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n[release:ship] FAILED at: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('\n[release:ship] OK');
console.log('[release:ship] Bundle zip generated under dist/, CI summary printed above.');

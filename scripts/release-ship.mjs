#!/usr/bin/env node
/**
 * One-command vendor release helper.
 *
 * Steps:
 * 1) npm run release:prepare
 * 2) npm run delivery:zip
 * 3) npm run report:github-ci
 * 4) npm run delivery:latest
 *
 * Flags:
 *   --with-pdf     pass through to release:prepare
 *   --with-health  pass through to release:prepare
 */

import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const prepareArgs = ['run', 'release:prepare'];
if (argv.includes('--with-pdf')) prepareArgs.push('--', '--with-pdf');
if (argv.includes('--with-health')) prepareArgs.push('--', '--with-health');

const steps = [
  ['npm', prepareArgs],
  ['npm', ['run', 'delivery:zip']],
  ['npm', ['run', 'report:github-ci']],
  ['npm', ['run', 'delivery:latest']],
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
console.log('[release:ship] Bundle zip generated under dist/, CI summary and latest file hash printed above.');

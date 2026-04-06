#!/usr/bin/env node
/**
 * Final delivery command for external handoff.
 *
 * Steps:
 * 1) npm run release:ship -- --with-pdf
 * 2) npm run delivery:message:file
 * 3) npm run report:github-ci
 */

import { spawnSync } from 'node:child_process';

const steps = [
  ['npm', ['run', 'release:ship', '--', '--with-pdf']],
  ['npm', ['run', 'delivery:message:file']],
  ['npm', ['run', 'report:github-ci']],
];

for (const [cmd, args] of steps) {
  console.log(`\n[delivery:ship:final] $ ${cmd} ${args.join(' ')}`);
  const r =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', `${cmd} ${args.join(' ')}`], { stdio: 'inherit' })
      : spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n[delivery:ship:final] FAILED at: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('\n[delivery:ship:final] OK');
console.log('[delivery:ship:final] Ship + message file + CI snapshot completed.');

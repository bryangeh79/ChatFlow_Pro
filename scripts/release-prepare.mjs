#!/usr/bin/env node
/**
 * Release preparation helper for vendor handoff.
 *
 * Default:
 * - npm run check:go-live
 * - npm run report:agent-git
 *
 * Optional flags:
 *   --with-pdf     also run npm run docs:pdf:162
 *   --with-health  also run npm run health:curl (requires running service)
 */

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const withPdf = args.includes('--with-pdf');
const withHealth = args.includes('--with-health');

const steps = [
  ['npm', ['run', 'check:go-live']],
  ['npm', ['run', 'report:agent-git']],
];

if (withPdf) steps.push(['npm', ['run', 'docs:pdf:162']]);
if (withHealth) steps.push(['npm', ['run', 'health:curl']]);

for (const [cmd, cmdArgs] of steps) {
  console.log(`\n[release:prepare] $ ${cmd} ${cmdArgs.join(' ')}`);
  const r =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', `${cmd} ${cmdArgs.join(' ')}`], { stdio: 'inherit' })
      : spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n[release:prepare] FAILED at: ${cmd} ${cmdArgs.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('\n[release:prepare] OK');
console.log('[release:prepare] Next: review docs/171 checklist and update CHANGELOG if needed.');

#!/usr/bin/env node
/**
 * Verifies Node/npm/git for local agents (e.g. 龙虾). Run from repo root: npm run check:agent-env
 * Exit 1 if git is missing or not inside a git work tree.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      cwd: opts.cwd ?? root,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    }).trim();
  } catch {
    return null;
  }
}

function fail(msg) {
  console.error(`[agent-env-check] FAIL: ${msg}`);
  process.exit(1);
}

function ok(line) {
  console.log(`[agent-env-check] ok ${line}`);
}

console.log('[agent-env-check] ChatFlow Pro — agent environment (git required for commit/push)\n');

ok(`node ${process.version}`);

let npmV = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version']);
if (!npmV && process.platform === 'win32') {
  npmV = run('npm', ['--version']);
}
if (npmV) ok(`npm ${npmV}`);
else console.warn('[agent-env-check] warn npm not on PATH (optional if agent only runs node/git)');

let git = 'git';
let gitVersion = run(git, ['--version']);
if (!gitVersion && process.platform === 'win32') {
  git = 'git.exe';
  gitVersion = run(git, ['--version']);
}
if (!gitVersion) {
  console.error(`
[agent-env-check] Git is not on PATH.

Windows (Git for Windows):
  1. Install from https://git-scm.com/download/win
  2. Ensure "Git from the command line and also from 3rd-party software" (or add Git\\cmd to PATH)
  3. Restart the terminal / agent host, then: git --version

See docs/155_phase17_lobster_and_git_environment.md
`);
  fail('git missing');
}
ok(gitVersion);

if (!existsSync(path.join(root, '.git'))) {
  fail(`not a git work tree (expected .git under ${root})`);
}

const top = run(git, ['rev-parse', '--show-toplevel']);
if (top) ok(`git top-level ${top}`);

const head = run(git, ['rev-parse', 'HEAD']);
if (!head) fail('git rev-parse HEAD failed');
ok(`HEAD ${head}`);

const branch = run(git, ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch) ok(`branch ${branch}`);

console.log('\n[agent-env-check] all required checks passed — agent may use git commit/push from this repo.');

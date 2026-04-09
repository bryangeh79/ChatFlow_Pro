/**
 * Phase D-C3 closeout — ensure收口文档与关键锚点存在（只读文件检查，无 DB I/O）。
 * Run after: npm run verify:d-c3-bundle
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

function mustContain(pathRel, substrings, label) {
  const p = join(root, pathRel);
  let text;
  try {
    text = readFileSync(p, 'utf8');
  } catch {
    console.error(JSON.stringify({ ok: false, step: 'missing_file', path: pathRel }));
    process.exit(1);
  }
  for (const s of substrings) {
    if (!text.includes(s)) {
      console.error(JSON.stringify({ ok: false, step: 'missing_anchor', label, path: pathRel, substring: s }));
      process.exit(1);
    }
  }
}

mustContain(
  join('docs', 'internal', 'd-c3-closeout.md'),
  [
    'D-C3C',
    'G1',
    'G2',
    '不双发',
    'dry-run',
    'dedupe_manual_repair_audit_events',
    '最低治理标准',
  ],
  'closeout',
);

mustContain(
  join('docs', 'internal', 'd-c3-operator-runbook.md'),
  ['D-C3A', 'D-C3B', 'CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED', '不准先'],
  'runbook',
);

mustContain(
  join('docs', 'internal', 'd-c3-acceptance-checklist.md'),
  ['verify:d-c3-closeout', 'dry_run_no_writes', 'processing'],
  'acceptance',
);

console.log(JSON.stringify({ ok: true, message: 'D-C3 closeout assets verify passed' }, null, 2));

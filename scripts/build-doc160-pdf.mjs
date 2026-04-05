#!/usr/bin/env node
/**
 * Build printable HTML + PDF for docs/160 (Markdown → marked → wrapped HTML → Edge headless print-to-pdf).
 * Requires: Node, npx, Microsoft Edge (Windows).
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mdName = '160_phase17_minimal_test_matrix_beginner.md';
const mdPath = path.join(root, 'docs', mdName);
const printHtmlPath = path.join(root, 'docs', '160_phase17_minimal_test_matrix_beginner_print.html');
const pdfPath = path.join(root, 'docs', '160_phase17_minimal_test_matrix_beginner.pdf');
const fragmentPath = path.join(os.tmpdir(), `chatflow-${mdName}.fragment.html`);

function findEdge() {
  const cands = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
  for (const p of cands) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function wrapHtml(inner) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Phase 17 最小必测矩阵（小白版）</title>
<style>
body { font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.55; color: #111; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.95rem; }
th, td { border: 1px solid #bbb; padding: 0.45rem 0.55rem; vertical-align: top; }
code, pre { font-family: ui-monospace, Consolas, monospace; font-size: 0.88em; }
h1 { font-size: 1.55rem; }
h2 { font-size: 1.2rem; margin-top: 1.6rem; }
blockquote { margin: 0.8rem 0; padding-left: 1rem; border-left: 4px solid #ccc; color: #333; }
@media print {
  body { margin: 0; max-width: none; }
  h2 { break-after: avoid; }
  tr { break-inside: avoid; }
}
</style>
</head>
<body>
${inner}
</body>
</html>`;
}

if (!fs.existsSync(mdPath)) {
  console.error('Missing', mdPath);
  process.exit(1);
}

console.log('marked:', mdPath, '→', fragmentPath);
execSync(`npx --yes marked "${mdPath}" -o "${fragmentPath}"`, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

const inner = fs.readFileSync(fragmentPath, 'utf8');
fs.writeFileSync(printHtmlPath, wrapHtml(inner), 'utf8');
console.log('Wrote', printHtmlPath);

const edge = findEdge();
if (!edge) {
  console.error('Microsoft Edge not found. Open the _print.html file in a browser and use Print → Save as PDF.');
  process.exit(1);
}

const fileUrl = pathToFileURL(printHtmlPath).href;
const pdfAbs = path.resolve(pdfPath);
console.log('Edge print-to-pdf:', pdfAbs);
execSync(
  `"${edge}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfAbs}" "${fileUrl}"`,
  { stdio: 'inherit', shell: true },
);

if (!fs.existsSync(pdfPath)) {
  console.error('PDF was not created. Open docs/160_phase17_minimal_test_matrix_beginner_print.html and print to PDF manually.');
  process.exit(1);
}

console.log('OK:', pdfPath);
try {
  fs.unlinkSync(fragmentPath);
} catch {
  /* ignore */
}

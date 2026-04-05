#!/usr/bin/env node
/**
 * Print latest GitHub Actions run for workflow `.github/workflows/ci.yml` (no git required).
 *
 * Env:
 *   GITHUB_REPOSITORY — default `bryangeh79/ChatFlow_Pro` (override for forks)
 *   GITHUB_TOKEN — optional; required for private repos (needs actions/workflow read)
 */

const repo = process.env.GITHUB_REPOSITORY || 'bryangeh79/ChatFlow_Pro';
const [owner, name] = repo.includes('/') ? repo.split('/') : [null, null];
if (!owner || !name) {
  console.error('report-github-ci: invalid GITHUB_REPOSITORY, expected owner/name');
  process.exit(1);
}

const url = `https://api.github.com/repos/${owner}/${name}/actions/workflows/ci.yml/runs?per_page=1`;
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'chatflow-pro-report-github-ci',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (process.env.GITHUB_TOKEN?.trim()) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
}

const res = await fetch(url, { headers });
const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error('report-github-ci: non-JSON response', res.status, text.slice(0, 200));
  process.exit(1);
}

if (!res.ok) {
  console.error(
    'report-github-ci: API error',
    res.status,
    data?.message || text.slice(0, 200),
  );
  process.exit(1);
}

const run = data.workflow_runs?.[0];
if (!run) {
  console.log('report-github-ci: no workflow runs found for ci.yml');
  process.exit(0);
}

const sha = run.head_sha || '';
console.log(
  [
    `report-github-ci: conclusion=${run.conclusion ?? 'null'}`,
    `status=${run.status ?? 'null'}`,
    `head_sha=${sha}`,
    `event=${run.event ?? ''}`,
    `html_url=${run.html_url ?? ''}`,
  ].join('\n'),
);

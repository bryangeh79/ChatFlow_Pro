#!/usr/bin/env node
/**
 * Build a copy-ready external delivery message with concrete values:
 * - package version
 * - latest delivery zip path
 * - latest delivery zip sha256
 * - latest GitHub CI URL/status for ci.yml
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readVersion() {
  const pkgPath = path.join(root, 'package.json');
  const raw = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  return String(pkg.version || 'unknown');
}

function getLatestZipAndSha() {
  const distDir = path.join(root, 'dist');
  if (!existsSync(distDir)) {
    throw new Error('dist/ not found. Run npm run delivery:zip first.');
  }

  const zips = readdirSync(distDir)
    .filter((n) => /^delivery-bundle-.*\.zip$/i.test(n))
    .map((name) => {
      const full = path.join(distDir, name);
      return { full, mtimeMs: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (zips.length === 0) {
    throw new Error('no delivery-bundle-*.zip found. Run npm run delivery:zip first.');
  }

  const latest = zips[0].full;
  const sha256 = createHash('sha256').update(readFileSync(latest)).digest('hex');
  return { latest, sha256 };
}

async function getLatestCi() {
  const repo = process.env.GITHUB_REPOSITORY || 'bryangeh79/ChatFlow_Pro';
  const [owner, name] = repo.includes('/') ? repo.split('/') : [null, null];
  if (!owner || !name) {
    return { status: 'unknown', conclusion: 'unknown', url: '(invalid GITHUB_REPOSITORY)' };
  }

  const url = `https://api.github.com/repos/${owner}/${name}/actions/workflows/ci.yml/runs?per_page=1`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'chatflow-pro-delivery-message',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN?.trim()) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
  }

  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) {
      return {
        status: 'error',
        conclusion: 'error',
        url: `(ci lookup failed: ${res.status} ${data?.message || ''})`,
      };
    }
    const run = data.workflow_runs?.[0];
    if (!run) {
      return { status: 'missing', conclusion: 'missing', url: '(no ci run found)' };
    }
    return {
      status: String(run.status ?? 'null'),
      conclusion: String(run.conclusion ?? 'null'),
      url: String(run.html_url ?? ''),
    };
  } catch (err) {
    return {
      status: 'error',
      conclusion: 'error',
      url: `(ci lookup exception: ${err instanceof Error ? err.message : String(err)})`,
    };
  }
}

function printMessage({ version, zipPath, sha256, ci }) {
  const lines = [
    '各位好，以下为本次 ChatFlow Pro 交付包信息（请按 SHA 校验后再解压部署）：',
    '',
    `- 包版本：${version}`,
    `- 交付 zip：${zipPath}`,
    `- SHA256：${sha256}`,
    `- CI 记录：${ci.url}`,
    `- CI 状态：${ci.status}/${ci.conclusion}`,
    '',
    '本包包含文档：',
    '- docs/168_pro_two_day_go_live_checklist.md',
    '- docs/169_pro_commercial_one_customer_one_deploy.md',
    '- docs/170_pro_customer_ops_runbook.md',
    '- docs/171_pro_vendor_release_checklist.md',
    '- docs/172_pro_https_reverse_proxy_caddy_nginx.md',
    '- docs/161_phase17_notify_webhooks.md（如启用 notify）',
    '- docs/162_customer_seven_channel_access_token_guide.pdf',
    '',
    '注意事项（固定口径）：',
    '1) 当前阶段先完成产品工程与交付部署，客户 token/webhook 实配在 onboarding 阶段执行。',
    '2) 请勿在邮件/IM 中直接发送完整密钥；统一使用安全通道。',
    '3) 默认交付模型为一客户一部署，不共享生产密钥与数据卷。',
  ];
  console.log(lines.join('\n'));
}

async function main() {
  try {
    const version = readVersion();
    const { latest, sha256 } = getLatestZipAndSha();
    const ci = await getLatestCi();
    printMessage({ version, zipPath: latest, sha256, ci });
  } catch (err) {
    console.error(
      `delivery:message: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
}

await main();

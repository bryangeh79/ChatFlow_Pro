#!/usr/bin/env node
/**
 * Lists staging-related env vars as SET / MISSING / ANY_OK without printing values.
 * Aligns with docs/157, docs/160, docs/154, docs/156.
 *
 * If project root `.env` exists, KEY=VALUE lines are loaded into `process.env` only for
 * keys not already set in the shell (same idea as many app starters; no dependency).
 *
 * Usage:
 *   node scripts/check-staging-env.mjs
 *   node scripts/check-staging-env.mjs --phase=all
 *   node scripts/check-staging-env.mjs --phase=b --strict
 *   node scripts/check-staging-env.mjs --phase=c-wa --strict
 *   node scripts/check-staging-env.mjs --phase=c-messenger --strict
 *   node scripts/check-staging-env.mjs --json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Load `.env` from repo root without overriding existing `process.env`. */
function loadDotEnvOptional() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  let text = fs.readFileSync(envPath, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split(/\r?\n/)) {
    let t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (/^export\s+/i.test(t)) t = t.replace(/^export\s+/i, '').trim();
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    } else {
      const ci = val.indexOf(' #');
      if (ci >= 0) val = val.slice(0, ci).trim();
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function isNonEmpty(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() !== '';
}

function inProcessRefreshOn() {
  const v = process.env.CHATFLOW_INPROCESS_TOKEN_REFRESH?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function anyNonEmpty(names) {
  return names.some(isNonEmpty);
}

function metaSecretOk() {
  return anyNonEmpty(['META_APP_SECRET', 'WHATSAPP_APP_SECRET', 'MESSENGER_APP_SECRET']);
}

/** @type {{ ok: boolean; lines: string[] }} */
function sectionPhase0() {
  const lines = [];
  const on = inProcessRefreshOn();
  lines.push('[Phase 0 — baseline] docs/157');
  lines.push(
    `  CHATFLOW_INPROCESS_TOKEN_REFRESH  ${on ? 'ON (prefer OFF for Phase 0)' : 'OFF or unset (OK for Phase 0)'}`,
  );
  lines.push('  (No secrets required for smoke; use SMOKE_BASE_URL + npm run smoke:webhooks.)');
  return { ok: true, lines };
}

function sectionPhaseB() {
  const lines = [];
  const rows = [
    ['CHATFLOW_INPROCESS_TOKEN_REFRESH', inProcessRefreshOn()],
    ['ZALO_REFRESH_TOKEN', isNonEmpty('ZALO_REFRESH_TOKEN')],
    ['ZALO_APP_ID', isNonEmpty('ZALO_APP_ID')],
    ['ZALO_APP_SECRET', isNonEmpty('ZALO_APP_SECRET')],
    ['ZALO_ACCESS_TOKEN', isNonEmpty('ZALO_ACCESS_TOKEN')],
    ['ZALO_OA_ID', isNonEmpty('ZALO_OA_ID')],
  ];
  lines.push('[Phase B — Zalo in-process refresh] docs/154');
  for (const [name, ok] of rows) {
    lines.push(`  ${name.padEnd(38)} ${ok ? 'SET' : 'MISSING'}`);
  }
  const ok = rows.every(([, v]) => v);
  return { ok, lines };
}

function sectionMetaCommon() {
  const lines = [];
  const id = isNonEmpty('META_APP_ID');
  const sec = metaSecretOk();
  const ip = inProcessRefreshOn();
  lines.push('[Phase C — Meta shared] docs/156');
  lines.push(`  CHATFLOW_INPROCESS_TOKEN_REFRESH  ${ip ? 'SET (on)' : 'MISSING or off'}`);
  lines.push(`  META_APP_ID                          ${id ? 'SET' : 'MISSING'}`);
  lines.push(
    `  META_APP_SECRET | WHATSAPP_* | MESSENGER_*  ${sec ? 'ANY_OK' : 'MISSING (need one secret)'}`,
  );
  const ok = ip && id && sec;
  return { ok, lines };
}

function sectionPhaseCWhatsApp() {
  const lines = [];
  const tok = isNonEmpty('WHATSAPP_ACCESS_TOKEN');
  const pn = isNonEmpty('WHATSAPP_PHONE_NUMBER_ID');
  const sandbox =
    ['1', 'true', 'yes'].includes(process.env.WHATSAPP_SANDBOX?.trim().toLowerCase() || '') ||
    ['1', 'true', 'yes'].includes(process.env.WHATSAPP_CLOUD_DISABLED?.trim().toLowerCase() || '');
  lines.push('[Phase C — WhatsApp Cloud line]');
  lines.push(`  WHATSAPP_ACCESS_TOKEN                ${tok ? 'SET' : 'MISSING'}`);
  lines.push(`  WHATSAPP_PHONE_NUMBER_ID             ${pn ? 'SET' : 'MISSING'}`);
  if (sandbox) {
    lines.push('  WHATSAPP_SANDBOX / _DISABLED        WARN (real send may be off — check config)');
  }
  const ok = tok && pn;
  return { ok, lines };
}

function sectionPhaseCMessenger() {
  const lines = [];
  const tok = isNonEmpty('MESSENGER_PAGE_ACCESS_TOKEN');
  const pid = isNonEmpty('MESSENGER_PAGE_ID');
  const sandbox = ['1', 'true', 'yes'].includes(process.env.MESSENGER_SANDBOX?.trim().toLowerCase() || '');
  lines.push('[Phase C — Messenger line]');
  lines.push(`  MESSENGER_PAGE_ACCESS_TOKEN          ${tok ? 'SET' : 'MISSING'}`);
  lines.push(`  MESSENGER_PAGE_ID                    ${pid ? 'SET' : 'MISSING'}`);
  if (sandbox) {
    lines.push('  MESSENGER_SANDBOX                    WARN (real send may be off)');
  }
  const ok = tok && pid;
  return { ok, lines };
}

function printHeader() {
  console.log('check-staging-env: secret values are never printed — only SET / MISSING / ANY_OK.\n');
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let phase = 'all';
  let strict = false;
  let json = false;
  for (const a of argv) {
    if (a === '--strict') strict = true;
    else if (a === '--json') json = true;
    else if (a.startsWith('--phase=')) phase = a.slice('--phase='.length);
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/check-staging-env.mjs [--phase=all|0|b|c-wa|c-messenger|c] [--strict] [--json]`);
      process.exit(0);
    }
  }
  return { phase, strict, json };
}

function main() {
  loadDotEnvOptional();
  const { phase, strict, json } = parseArgs();

  const p0 = sectionPhase0();
  const pb = sectionPhaseB();
  const mc = sectionMetaCommon();
  const cwa = sectionPhaseCWhatsApp();
  const cms = sectionPhaseCMessenger();

  const sections = { '0': p0, all: null, b: pb, 'c-wa': null, 'c-messenger': null, c: null };

  /** Combined strict for Meta WA */
  sections['c-wa'] = {
    ok: mc.ok && cwa.ok,
    lines: [...mc.lines, '', ...cwa.lines],
  };
  sections['c-messenger'] = {
    ok: mc.ok && cms.ok,
    lines: [...mc.lines, '', ...cms.lines],
  };
  sections.c = {
    ok: mc.ok && cwa.ok && cms.ok,
    lines: [...mc.lines, '', ...cwa.lines, '', ...cms.lines],
  };
  sections.all = {
    ok: true,
    lines: [
      ...p0.lines,
      '',
      ...pb.lines,
      '',
      ...mc.lines,
      '',
      ...cwa.lines,
      '',
      ...cms.lines,
    ],
  };

  if (json) {
    const out = {
      phase0: { in_process_refresh_on: inProcessRefreshOn() },
      phase_b: {
        ok: pb.ok,
        vars: {
          CHATFLOW_INPROCESS_TOKEN_REFRESH: inProcessRefreshOn(),
          ZALO_REFRESH_TOKEN: isNonEmpty('ZALO_REFRESH_TOKEN'),
          ZALO_APP_ID: isNonEmpty('ZALO_APP_ID'),
          ZALO_APP_SECRET: isNonEmpty('ZALO_APP_SECRET'),
          ZALO_ACCESS_TOKEN: isNonEmpty('ZALO_ACCESS_TOKEN'),
          ZALO_OA_ID: isNonEmpty('ZALO_OA_ID'),
        },
      },
      phase_c_meta: {
        ok: mc.ok,
        vars: {
          CHATFLOW_INPROCESS_TOKEN_REFRESH: inProcessRefreshOn(),
          META_APP_ID: isNonEmpty('META_APP_ID'),
          meta_or_channel_secret: metaSecretOk(),
        },
      },
      phase_c_whatsapp: {
        ok: cwa.ok,
        WHATSAPP_ACCESS_TOKEN: isNonEmpty('WHATSAPP_ACCESS_TOKEN'),
        WHATSAPP_PHONE_NUMBER_ID: isNonEmpty('WHATSAPP_PHONE_NUMBER_ID'),
      },
      phase_c_messenger: {
        ok: cms.ok,
        MESSENGER_PAGE_ACCESS_TOKEN: isNonEmpty('MESSENGER_PAGE_ACCESS_TOKEN'),
        MESSENGER_PAGE_ID: isNonEmpty('MESSENGER_PAGE_ID'),
      },
      combined: {
        'c-wa': sections['c-wa'].ok,
        'c-messenger': sections['c-messenger'].ok,
        c: sections.c.ok,
      },
    };
    console.log(JSON.stringify(out, null, 2));
    if (strict) {
      let sel = true;
      if (phase === 'b') sel = pb.ok;
      else if (phase === 'c-wa') sel = sections['c-wa'].ok;
      else if (phase === 'c-messenger') sel = sections['c-messenger'].ok;
      else if (phase === 'c') sel = sections.c.ok;
      else if (phase === 'all' || phase === '0' || phase === '')
        sel = true;
      else sel = true;
      process.exitCode = sel ? 0 : 1;
    }
    return;
  }

  printHeader();

  let toShow;
  let failOk = true;

  if (phase === 'all' || phase === '') {
    toShow = sections.all.lines;
    failOk = true;
  } else if (phase === '0') {
    toShow = p0.lines;
  } else if (phase === 'b') {
    toShow = pb.lines;
    failOk = pb.ok;
  } else if (phase === 'c-wa') {
    toShow = sections['c-wa'].lines;
    failOk = sections['c-wa'].ok;
  } else if (phase === 'c-messenger') {
    toShow = sections['c-messenger'].lines;
    failOk = sections['c-messenger'].ok;
  } else if (phase === 'c') {
    toShow = sections.c.lines;
    failOk = sections.c.ok;
  } else {
    console.error(`Unknown --phase=${phase} (use all, 0, b, c-wa, c-messenger, c)`);
    process.exitCode = 2;
    return;
  }

  console.log(toShow.join('\n'));
  console.log('');

  if (strict && !failOk) {
    console.error('check-staging-env: --strict FAILED for phase', phase);
    process.exitCode = 1;
  }
}

main();

#!/usr/bin/env node
/**
 * Phase E3 — read-only aggregate report skeleton (stdout only).
 * - Reads a fixed allowlist of repo files via fs.readFileSync / statSync only.
 * - No subprocess, no network, no DB, no writes.
 * Not registered in package.json (no npm script) per E3 scope.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DOC_ALLOWLIST = [
  "docs/internal/phase-e-hosted-v1-signoff-template.md",
  "docs/internal/phase-e2-hosted-v1-checklist-spec.md",
  "docs/internal/phase-e-hosted-v1-go-live-gate-design.md",
  "docs/internal/phase-e-hosted-v1-index.md",
  "docs/internal/phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md",
  "docs/internal/phase-e3-hosted-v1-readonly-aggregate-report-spec.md",
  "docs/internal/phase-e3-hosted-v1-readonly-aggregate-report.template.md",
  "docs/internal/d-c4-overall-closeout.md",
  "docs/internal/d-c4a-recovery-readonly-check-spec.md",
  "docs/internal/d-c4b-recovery-decision-table.md",
  "docs/internal/d-c4b-delivery-drill-checklist.md",
  "docs/internal/d-c4c-readonly-governance-bundle-spec.md",
  "docs/internal/d-c4c-ci-rc-staging-gates.md",
];

const KIND_HINT = {
  "CHK-BUILD-01": "BUILD_LOG",
  "CHK-BUILD-02": "BUILD_LOG",
  "CHK-CI-01": "PIPELINE_RUN",
  "CHK-CI-02": "PIPELINE_RUN",
  "CHK-CI-03": "PIPELINE_RUN",
  "CHK-STG-01": "STAGING_HEALTH",
  "CHK-STG-02": "STAGING_SMOKE",
  "CHK-STG-03": "MIGRATION_LEDGER_SUMMARY",
  "CHK-RC-01": "RC_MANIFEST_DIFF",
  "CHK-RC-02": "ROLLBACK_VERIFY_LOG",
  "CHK-PROD-01": "MIGRATION_LEDGER_SUMMARY",
  "CHK-PROD-02": "ATTESTATION_NO_WEAKEN",
  "CHK-MAN-D4A": "D4A_RECOVERY_JSONL",
  "CHK-MAN-D4B": "D4B_DECISION_REF",
  "CHK-MAN-EG4": "OPS_CREDENTIALS_TICKET",
  "CHK-MAN-EG8": "TENANT_GOLIVE_EXPORT",
  "CHK-MAN-EG67": "SOP_ACK",
  "CHK-EV-D4B-DRILL": "DRILL_CHECKLIST",
  "CHK-EV-RC-MTG": "MEETING_MINUTES",
  "CHK-EV-BACKUP": "BACKUP_RECORD",
};

function readPackageVersion() {
  const p = path.join(ROOT, "package.json");
  const raw = fs.readFileSync(p, "utf8");
  const m = raw.match(/"version"\s*:\s*"([^"]+)"/);
  return m ? m[1] : "unknown";
}

function extractChkIds(checklistBody) {
  const set = new Set();
  const re = /\*\*(CHK-[A-Z0-9-]+)\*\*/g;
  let x;
  while ((x = re.exec(checklistBody)) !== null) {
    set.add(x[1]);
  }
  return [...set].sort();
}

function main() {
  const lines = [];
  lines.push("# Hosted v1 — E3 只读聚合报告（机器生成骨架）");
  lines.push("");
  lines.push("**警告**：本输出 **不是**签核结论；**证据 URI 须人工补全**。");
  lines.push("");
  lines.push("## META");
  lines.push("");
  lines.push(`| 字段 | 值 |`);
  lines.push(`|------|-----|`);
  lines.push(`| generated_at | ${new Date().toISOString()} |`);
  lines.push(`| generator | e3-hosted-v1-readonly-aggregate-report.mjs |`);
  lines.push(`| package_version_ref | ${readPackageVersion()} |`);
  lines.push("");
  lines.push("## 真源文件存在性（只读扫描）");
  lines.push("");
  lines.push("| path | status | bytes | mtime (UTC) |");
  lines.push("|------|--------|-------|-------------|");
  for (const rel of DOC_ALLOWLIST) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      lines.push(`| ${rel} | MISSING | — | — |`);
      continue;
    }
    const st = fs.statSync(abs);
    lines.push(
      `| ${rel} | present | ${st.size} | ${st.mtime.toISOString()} |`
    );
  }
  lines.push("");
  const chkPath = path.join(
    ROOT,
    "docs/internal/phase-e2-hosted-v1-checklist-spec.md"
  );
  const chkBody = fs.readFileSync(chkPath, "utf8");
  const chkIds = extractChkIds(chkBody);
  lines.push("## COVERAGE 骨架（chk_id 自 E2 规格提取）");
  lines.push("");
  lines.push(
    "| chk_id | e2b_kind_hint | evidence_status | evidence_uri | notes |"
  );
  lines.push("|--------|---------------|-----------------|--------------|-------|");
  for (const id of chkIds) {
    const hint = KIND_HINT[id] || "—";
    const isNogo = id.startsWith("CHK-NOGO-");
    const status = isNogo ? "—" : "missing";
    const notes = isNogo ? "须与模板 D 节一致（否定项）" : "人工填写 URI";
    lines.push(`| ${id} | ${hint} | ${status} |  | ${notes} |`);
  }
  lines.push("");
  lines.push("## SIGNOFF");
  lines.push("");
  lines.push(
    "**本输出不替代** `phase-e-hosted-v1-signoff-template.md` **E / F**。"
  );
  lines.push("");
  process.stdout.write(lines.join("\n"));
}

main();

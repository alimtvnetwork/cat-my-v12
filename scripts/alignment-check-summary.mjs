#!/usr/bin/env node
// Emits a compact alignment-check summary into $GITHUB_STEP_SUMMARY
// (or stdout when not on CI). Scans tests/reports/ for relevant artifacts
// produced by padding_tokens_wrap.py and its siblings.
import { readFileSync, existsSync, readdirSync, statSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/reports";
const out = [];
const push = (l = "") => out.push(l);

push("## Alignment check summary");
push("");
push(`Generated: ${new Date().toISOString()}`);
push("");

function listShots(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .map((f) => ({ name: f, size: statSync(join(dir, f)).size }));
}

const engine = process.env.E2E_BROWSER || "chromium";
const suffix = engine === "chromium" ? "" : `-${engine}`;
push(`Engine: \`${engine}\``);
push("");
const shotDirs = [
  `padding-tokens${suffix}`,
  `padding-tokens-wrap${suffix}`,
  `item-rows-long-labels${suffix}`,
  "diff-heatmaps",
];

push("### Screenshots captured");
push("");
for (const d of shotDirs) {
  const p = join(ROOT, d);
  const shots = listShots(p);
  push(`- \`${d}\`: ${shots.length} file(s)`);
  for (const s of shots.slice(0, 20)) {
    push(`  - ${s.name} (${(s.size / 1024).toFixed(1)} KB)`);
  }
}
push("");

const latestMetrics = join(ROOT, "alignment", "latest.json");
if (existsSync(latestMetrics)) {
  push("### Alignment metrics (latest.json)");
  push("");
  try {
    const data = JSON.parse(readFileSync(latestMetrics, "utf8"));
    push("```json");
    push(JSON.stringify(data, null, 2).slice(0, 4000));
    push("```");
  } catch (e) {
    push(`_Failed to parse: ${e.message}_`);
  }
  push("");
}

const contrast = join(ROOT, "item-rows-contrast.json");
if (existsSync(contrast)) {
  push("### Contrast report");
  push("");
  push("```json");
  push(readFileSync(contrast, "utf8").slice(0, 2000));
  push("```");
  push("");
}

push("_Full artifacts uploaded under `alignment-reports`._");

const body = out.join("\n") + "\n";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) appendFileSync(summaryPath, body);
process.stdout.write(body);

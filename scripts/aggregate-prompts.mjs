#!/usr/bin/env node
// Regenerates the bundled prompt index from `.lovable/prompts/*.md` into
// `.lovable/prompts/_bundle.md`. This project has no `standalone-scripts/`
// tree; the release ceremony still calls this step, so it runs as a no-op
// when there are no prompt sources.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const SRC = ".lovable/prompts";
const OUT = join(SRC, "_bundle.md");

if (!existsSync(SRC)) {
  console.log(`aggregate-prompts: ${SRC} not present, nothing to do.`);
  process.exit(0);
}

const entries = (await readdir(SRC, { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "_bundle.md")
  .map((e) => e.name)
  .sort();

if (entries.length === 0) {
  console.log("aggregate-prompts: no prompt sources found, nothing to do.");
  process.exit(0);
}

const chunks = [
  "# Prompt Bundle",
  `Generated: ${new Date().toISOString()}`,
  `Sources: ${entries.length}`,
  "",
];
for (const name of entries) {
  const body = readFileSync(join(SRC, name), "utf8").trimEnd();
  chunks.push(`## ${name}`, "", body, "");
}

mkdirSync(SRC, { recursive: true });
writeFileSync(OUT, chunks.join("\n"));
console.log(`aggregate-prompts: wrote ${OUT} from ${entries.length} source(s).`);

#!/usr/bin/env node
// Rewrites lingering references to a previous version tag across the repo.
// Skips historic files (CHANGELOG.md, RELEASE_NOTES.md) and node_modules /
// build output. Re-scans afterwards and exits non-zero if the old tag
// still appears in a non-historic file.
//
// Usage: node scripts/update-stale-version-refs.mjs <previous> <new>
//   e.g. node scripts/update-stale-version-refs.mjs 3.908.0 3.909.0
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const [prev, next] = process.argv.slice(2);
if (!prev || !next) {
  console.error("usage: update-stale-version-refs.mjs <previous> <new>");
  process.exit(2);
}
const stripV = (s) => s.replace(/^v/, "");
const prevBare = stripV(prev);
const nextBare = stripV(next);
const prevTag = `v${prevBare}`;
const nextTag = `v${nextBare}`;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".output",
  ".vinxi",
  ".tanstack",
  ".cache",
  "coverage",
  ".lovable",
  "docs",
  "tests",
  "playwright-report",
  "test-results",
]);
const SKIP_FILES = new Set([
  "CHANGELOG.md",
  "RELEASE_NOTES.md",
  "bun.lockb",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);
const TEXT_EXT = /\.(m?[jt]sx?|json|md|mdx|css|scss|html|ya?ml|toml|sh|py|txt)$/i;

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".env.example") {
      if (e.isDirectory() && !SKIP_DIRS.has(e.name)) {
        // allow hidden dirs like .github but skip our SKIP set
      } else if (e.isDirectory()) {
        continue;
      }
    }
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(join(dir, e.name), out);
    } else if (e.isFile()) {
      if (SKIP_FILES.has(e.name)) continue;
      if (!TEXT_EXT.test(e.name)) continue;
      out.push(join(dir, e.name));
    }
  }
  return out;
}

const root = process.cwd();
const files = await walk(root);
const tagRe = new RegExp(`v${prevBare.replace(/\./g, "\\.")}`, "g");
const bareRe = new RegExp(`(?<![vV\\d\\.])${prevBare.replace(/\./g, "\\.")}(?![\\d\\.])`, "g");

let changed = 0;
for (const file of files) {
  let body;
  try {
    body = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (!body.includes(prevBare)) continue;
  const updated = body.replace(tagRe, nextTag).replace(bareRe, nextBare);
  if (updated !== body) {
    writeFileSync(file, updated);
    console.log(`upd   ${relative(root, file)}`);
    changed++;
  }
}

// Re-scan
const remaining = [];
for (const file of files) {
  let body;
  try {
    body = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (tagRe.test(body) || bareRe.test(body)) remaining.push(relative(root, file));
}

console.log(`\nupdate-stale-version-refs: ${changed} file(s) rewritten ${prevTag} -> ${nextTag}`);
if (remaining.length) {
  console.error(`still contains ${prevTag}/${prevBare}:`);
  for (const r of remaining) console.error(`  ${r}`);
  process.exit(1);
}
console.log("no stale references remain in scanned tree.");

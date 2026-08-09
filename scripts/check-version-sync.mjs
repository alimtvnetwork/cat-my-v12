#!/usr/bin/env node
// Verifies the version pinned in package.json is also pinned in
// CHANGELOG.md, RELEASE_NOTES.md, and README.md. Exit 0 on match.
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;
const tag = `v${version}`;

const targets = [
  { path: "CHANGELOG.md", needle: tag },
  { path: "RELEASE_NOTES.md", needle: tag },
  { path: "README.md", needle: tag },
];

let failed = false;
for (const { path, needle } of targets) {
  let body = "";
  try {
    body = readFileSync(path, "utf8");
  } catch {
    console.error(`MISS  ${path}: file not found`);
    failed = true;
    continue;
  }
  if (!body.includes(needle)) {
    console.error(`MISS  ${path}: missing ${needle}`);
    failed = true;
  } else {
    console.log(`OK    ${path}: ${needle}`);
  }
}

if (failed) {
  console.error(`\ncheck-version-sync: FAIL (expected ${tag} in every target)`);
  process.exit(1);
}
console.log(`\ncheck-version-sync: OK (${tag})`);

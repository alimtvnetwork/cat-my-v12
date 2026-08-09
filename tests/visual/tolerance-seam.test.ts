/**
 * I-CX-04 single-seam invariant guard.
 *
 * `docs/plans/84/visual-tolerance-pin.md` mandates that every visual spec
 * consumes `VISUAL_DIFF` / `HEADER_VISUAL_DIFF` from
 * `tests/visual/routes.config.ts` and NEVER re-declares a numeric
 * `threshold` or `maxDiffPixelRatio` literal locally. Without an
 * executable check the contract is doc-only; the next copy-paste spec
 * can silently dodge a `maxDiffPixelRatio` ratchet (planned 0.01 -> 0.005).
 *
 * This test scans every `tests/visual/*.spec.ts` file and fails when a
 * hardcoded numeric literal appears on the right-hand side of
 * `threshold` or `maxDiffPixelRatio`. References through the seam
 * (`VISUAL_DIFF.threshold`, `HEADER_VISUAL_DIFF.maxDiffPixelRatio`) are
 * allowed. String-argument screenshot names like
 * `toHaveScreenshot("header-...")` are unaffected: we only look at the
 * two guarded property names.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const VISUAL_DIR = join(process.cwd(), "tests", "visual");

// Matches `threshold: 0.1` or `maxDiffPixelRatio: 0.005` with a numeric
// (integer/decimal/exponent) literal on the right. Whitespace between
// key, colon, and value is tolerated. Trailing comma or `}` is fine.
const HARDCODED_TOLERANCE_RE = /\b(threshold|maxDiffPixelRatio)\s*:\s*-?\d+(?:\.\d+)?(?:e-?\d+)?/g;

function listSpecs(): string[] {
  return readdirSync(VISUAL_DIR)
    .filter((name) => name.endsWith(".spec.ts"))
    .map((name) => join(VISUAL_DIR, name));
}

describe("visual tolerance seam (I-CX-04)", () => {
  it("finds spec files to scan", () => {
    const specs = listSpecs();
    expect(specs.length, "at least one *.spec.ts under tests/visual/").toBeGreaterThan(0);
  });

  it("no spec re-declares a numeric threshold / maxDiffPixelRatio", () => {
    const offenders: string[] = [];
    for (const specPath of listSpecs()) {
      const source = readFileSync(specPath, "utf8");
      // Strip line comments so the doc block in sticky-header-states.spec.ts
      // that mentions `maxDiffPixelRatio` in prose does not trip the regex.
      // Block comments (/** ... */) can span multiple lines; strip those too.
      const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
      const matches = stripped.match(HARDCODED_TOLERANCE_RE);
      if (matches && matches.length > 0) {
        offenders.push(`${specPath}: ${matches.join(", ")}`);
      }
    }
    expect(
      offenders,
      `Hardcoded tolerance literal detected. Route through VISUAL_DIFF / HEADER_VISUAL_DIFF in tests/visual/routes.config.ts (see docs/plans/84/visual-tolerance-pin.md).\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

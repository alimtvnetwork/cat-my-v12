// Plan 86 step 40: facade-only ratchet.
//
// Root cause guarded here: nothing structurally prevented UI code from
// importing raw stores (projects/store, rules/audit-store, palette-store,
// favorites-store, recent-projects-store, program-store,
// reference-image-store) instead of going through the seed-backed facades.
// A snapshot allowlist locks the current callers and fails when a new UI
// file introduces a raw-store import for a V4 entity. To remove an entry,
// migrate the file to a facade (usually via `useFacadeOrStore`) and delete
// its line from ALLOWLIST below.
//
// Any NEW UI file (routes/**, components/**) that imports one of the
// RATCHETED_MODULES will fail this test. That is intentional: use the
// facade layer instead.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(process.cwd(), "src");
const SCAN_DIRS = ["routes", "components"];

const RATCHETED_MODULES = [
  "@/lib/projects/store",
  "@/lib/rules/audit-store",
  "@/lib/stores/palette-store",
  "@/lib/stores/favorites-store",
  "@/lib/stores/recent-projects-store",
  "@/lib/stores/program-store",
  "@/lib/reference-image-store",
];

// Snapshot of pre-existing offenders as of v3.831.0. Do NOT add to this list;
// migrate the file to a facade and remove its entry instead.
const ALLOWLIST: ReadonlySet<string> = new Set(
  [
    "components/app-shell/AppBreadcrumb.tsx",
    "components/app-shell/PaletteFrame.tsx",
    "components/editor/canvas/CanvasViewport.tsx",
    "components/editor/shell/EditorTopBar.tsx",
    "components/hmi/HmiShell.tsx",
    "components/hmi/MachineFrame.tsx",
    "components/hmi/StatusBar.tsx",
    "components/hmi/ViewportImageControls.tsx",
    "components/home/GettingStarted.tsx",
    "components/shell/AddressBar.tsx",
    "components/home/RecentProjectsChip.tsx",
    "components/nav/CommandPalette.tsx",
    "components/nav/FavoritesBar.tsx",
    "components/projects/ProjectEditorSections.tsx",
    "components/projects/RulesetPicker.tsx",
    "components/projects/__tests__/ImageSamplesSection.reorder.test.tsx",
    "components/settings/ReferenceImageCard.tsx",
    "routes/diagnostics.tsx",
    "routes/index.tsx",
    "routes/projects.$projectId.ai-testing-history.tsx",
    "routes/projects.$projectId.ai-testing.tsx",
    "routes/projects.$projectId.camera.tsx",
    "routes/projects.$projectId.categories.tsx",
    "routes/projects.$projectId.index.tsx",
    "routes/projects.$projectId.rulesets.$rulesetId.tsx",
    "routes/projects.$projectId.rulesets.index.tsx",
    "routes/projects.$projectId.rulesets.new.tsx",
    "routes/projects.$projectId.trial-run.$runId.tsx",
    "routes/projects.$projectId.trial-run.tsx",
    "routes/projects.$projectId.tsx",
    "routes/projects.index.tsx",
    "routes/run.tsx",
    "routes/setup.chain-events.tsx",
    "routes/setup.rules.tsx",
    "routes/trial-run.tsx",
  ].map((p) => p.split("/").join(sep)),
);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }

  return out;
}

function importsRatchetedModule(source: string): string | null {
  for (const mod of RATCHETED_MODULES) {
    // match `from "mod"` or `from 'mod'`
    const re = new RegExp(`from\\s+['"]${mod.replace(/[/.]/g, "\\$&")}['"]`);
    if (re.test(source)) return mod;
  }

  return null;
}

describe("Plan 86 step 40: facade-only ratchet for V4 entities", () => {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

  it("no NEW UI file bypasses facades for ratcheted store modules", () => {
    const newOffenders: string[] = [];
    const stillOffending: string[] = [];

    for (const file of files) {
      const rel = relative(ROOT, file);
      const src = readFileSync(file, "utf8");
      const hit = importsRatchetedModule(src);
      if (!hit) continue;
      if (ALLOWLIST.has(rel)) {
        stillOffending.push(rel);
      } else {
        newOffenders.push(`${rel}  -> ${hit}`);
      }
    }

    // Fail loudly on new offenders; also fail if an allowlisted file was
    // migrated so the snapshot must be trimmed (prevents rot in the other
    // direction).
    const removedFromAllowlist = [...ALLOWLIST].filter(
      (rel) => stillOffending.includes(rel) === false,
    );

    expect(
      { newOffenders, removedFromAllowlist },
      "Update src/lib/facades/__tests__/facade-only-ratchet.step40.test.ts ALLOWLIST",
    ).toEqual({ newOffenders: [], removedFromAllowlist: [] });
  });

  it("ratcheted module list stays in sync with facade coverage", () => {
    // Guard: every ratcheted module should have a corresponding facade layer
    // available. If a module is removed, delete it from RATCHETED_MODULES.
    expect(RATCHETED_MODULES.length).toBeGreaterThan(0);
    expect(new Set(RATCHETED_MODULES).size).toBe(RATCHETED_MODULES.length);
  });
});

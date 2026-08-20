/**
 * Plan 80 step 50 (closeout): facade single-seam ratchet.
 *
 * Spec 21 §52 mandates that browser persistence flows through the SDK
 * facade so a future runtime (server-owned SQLite, IndexedDB shard, etc.)
 * can swap in without touching every store. Steps 29-42 migrated the
 * zustand stores; steps 39 + 40 deleted the legacy `persist.ts` shim.
 *
 * Some modules still legitimately need raw `localStorage` /
 * `sessionStorage` access:
 *   - facade internals + legacy-key migration paths
 *   - a few UI components that remember tiny per-tab UI state
 *     (dock hints, collapsible section expanded flags) predating the
 *     facade.
 *
 * This test pins the CURRENT set as an allowlist. Any NEW file that
 * bypasses the facade fails CI; deletions from the allowlist are also
 * caught so we notice when a migration lands. The intent is a
 * one-way ratchet: the allowlist can only shrink over time.
 */
import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(process.cwd(), "src");
// Word-boundary match so both `localStorage.setItem`, `window.localStorage ?`,
// and `sessionStorage[key]` all flag. Comments that mention the identifier
// also match; the allowlist below explicitly acknowledges those files.
const PATTERN = /\b(?:localStorage|sessionStorage)\b/;

const ALLOWLIST: ReadonlySet<string> = new Set([
  // UI components with tiny per-tab UI state that predates the facade.
  "components/app-shell/LightingReadout.tsx",
  "components/app-shell/RunningPill.tsx",
  "components/camera/CaptureRequestDebugPanel.tsx",
  "components/editor/CollapsibleSection.tsx",
  "components/editor/canvas/CanvasViewport.tsx",
  "components/hmi/CameraPreview.tsx",
  "components/hmi/ViewportImageControls.tsx",
  "components/rules/tools/ToolsPalette.tsx",
  "components/settings/ReferenceImageCard.tsx",
  "components/cli/DeveloperPreferences.tsx",
  "components/data-source/DataSourceToggle.tsx",
  "components/editor/rail/CollapsiblePanelSection.tsx",
  "hooks/use-show-dev-frames.ts",
  "hooks/useRailPanelState.ts",
  "lib/data-source/store.ts",
  "lib/ids/int-alias.ts",
  "lib/observability/savedViews.ts",
  "lib/rules/draftPersistence.ts",
  "lib/rules/envelopeAdapter.ts",
  "lib/rules/rule-id-alias.ts",
  "lib/rules/ruleset-id-alias.ts",
  "routes/index.tsx",
  "routes/observability.sessions.tsx",
  // Supabase client mentions `localStorage` in its config comments.
  "integrations/supabase/client.ts",
  // lib/* stores + facade internals + legacy-key migration paths.
  "hooks/use-hardware-mock.ts",
  "lib/ai-testing/aggregate.ts",
  "lib/camera/capture-bridge.ts",
  "lib/camera/facade.ts",
  "lib/camera/seed.ts",
  "lib/camera/store.ts",
  "lib/stores/capture-history-store.ts",
  "lib/diagnostics/home-error-log.ts",
  "lib/editor/preview-mode-store.ts",
  "lib/editor/snap-store.ts",
  // Per-tab HUD position (Plan 83): same pattern as running-pill-position.ts.
  "lib/editor/hud-position.ts",
  "lib/editor/validation-store.ts",
  // Facade contract doc references localStorage in a comment only.
  "lib/facade/contracts.ts",
  "lib/stores/favorites-store.ts",
  "lib/functions/persistence.ts",
  // Per-project last-selected sample id (Plan 83): tiny per-tab UI state.
  "lib/image-samples/use-selected-sample.ts",
  "lib/lighting/store.ts",
  "lib/stores/palette-store.ts",
  "lib/stores/program-store.ts",
  "lib/projects/facade-json.ts",
  "lib/projects/facade.ts",
  "lib/projects/seed.ts",
  "lib/projects/trials.ts",
  "lib/stores/recent-projects-store.ts",
  "lib/stores/reference-image-store.ts",
  "lib/rules/seed.ts",
  // Per-tab rule enable/disable audit ring buffer (Plan 83 backlog 13):
  // same ring-buffer + localStorage shape as `lib/seed/telemetry-store.ts`.
  "lib/rules/audit-store.ts",
  "lib/stores/run-store.ts",
  "lib/running-pill-position.ts",
  // Autoseed reset path: resetSeedFlags() needs raw removeItem.
  "lib/seed/orchestrator.ts",
  // Telemetry ring buffer references localStorage in a comment only.
  "lib/seed/telemetry-store.ts",
  "lib/stores/shortcuts-store.ts",
  "lib/stores/ui-prefs-store.ts",
  "lib/workspace/layout-presets.ts",
  "lib/workspace/layout-slice.ts",
  // Routes still reading legacy keys for one-off migrations / debug.
  "routes/projects.$projectId.rulesets.new.tsx",
  "routes/settings.index.tsx",
  // Comment-only mention of localStorage in an SSR-hydration note.
  "routes/setup.camera.tsx",
  "routes/setup.chain-events.tsx",
  "routes/setup.functions.tsx",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name === "dist") continue;
    const abs = join(dir, name);
    const s = statSync(abs);
    if (s.isDirectory()) walk(abs, out);
    else if (
      (name.endsWith(".ts") || name.endsWith(".tsx")) &&
      name.endsWith(".test.ts") === false &&
      name.endsWith(".test.tsx") === false &&
      name.endsWith(".d.ts") === false
    )
      out.push(abs);
  }

  return out;
}

describe("facade single-seam ratchet (spec 21 §52)", () => {
  const files = walk(ROOT);
  const violators = files
    .filter((abs) => PATTERN.test(readFileSync(abs, "utf8")))
    .map((abs) => relative(ROOT, abs).replace(/\\/g, "/"));

  test("no NEW file bypasses the facade", () => {
    const unexpected = violators.filter((rel) => ALLOWLIST.has(rel) === false);
    expect(unexpected).toEqual([]);
  });

  test("allowlist entries still bypass the facade (ratchet only shrinks)", () => {
    const missing = [...ALLOWLIST].filter((rel) => violators.includes(rel) === false);
    // If this fails, remove the entry from ALLOWLIST above. The ratchet
    // intentionally forces the allowlist to shrink whenever a migration
    // lands, so future PRs cannot re-widen the seam silently.
    expect(missing).toEqual([]);
  });
});

// Plan 90 Step 138. Shell boot mount for `reconcileDrafts()`.
//
// Spec: spec/21-app/80-ruleset-draft-save.md
//
// Root cause this fixes (one sentence): `reconcileDrafts()` shipped in
// Step 137 is an unreachable seam because no shell code invokes it on
// mount, so IndexedDB drafts silently diverge from the server after any
// cross-tab or cross-operator commit.
//
// Contract:
//   - runBootReconcile() runs `reconcileDrafts()` exactly once per page
//     load (guarded by module-level flag, StrictMode-safe).
//   - Every `server-newer` / `local-newer` entry surfaces a toast so the
//     operator sees drift immediately at boot, not on the next Save.
//   - `server-missing` and `load-failed` are logged only (already carried
//     by `reconcileDrafts`'s structured log line); we never auto-purge at
//     boot because that would silently discard local work.
//   - Never throws: any unexpected failure is caught and logged so a
//     flaky IDB or network call cannot brick the app shell.

import { toast } from "sonner";
import { reconcileDrafts, type DraftReconcileEntry } from "./reconcileDrafts";

let hasBootRan = false;
let bootInFlight: Promise<DraftReconcileEntry[]> | null = null;

/**
 * Reset the once-per-page guard. Test-only.
 */
export function __resetBootReconcileForTests(): void {
  hasBootRan = false;
  bootInFlight = null;
}

export interface BootReconcileOptions {
  /**
   * Injected notifier (defaults to sonner `toast.warning`). Test seam.
   * The optional `action` lets a toast render a deep-link button.
   */
  notify?: (
    message: string,
    opts?: {
      description?: string;
      action?: { label: string; onClick: () => void };
    },
  ) => void;
  /**
   * Plan 90 Step 141: called when the operator clicks the toast action
   * for a drift entry. Receives the envelope integer id; the caller is
   * expected to resolve it to a router path via `fromRulesetIntId`.
   */
  onOpenRuleSet?: (intId: number) => void;
}

/**
 * Boot the reconciliation pass. Idempotent per page load. Returns the
 * entries (or an empty array if it already ran / failed).
 */
export async function runBootReconcile(
  opts: BootReconcileOptions = {},
): Promise<DraftReconcileEntry[]> {
  if (hasBootRan) return [];

  if (bootInFlight) return bootInFlight;

  const notify =
    opts.notify ??
    ((msg, o) =>
      toast.warning(msg, o ? { description: o.description, action: o.action } : undefined));

  bootInFlight = (async () => {
    try {
      const entries = await reconcileDrafts();
      hasBootRan = true;

      const drift = entries.filter((e) => e.Kind === "server-newer" || e.Kind === "local-newer");
      const missing = entries.filter((e) => e.Kind === "server-missing");
      const failed = entries.filter((e) => e.Kind === "load-failed");

      for (const e of drift) {
        const local = e.Local?.Version ?? "?";
        const server = e.Server?.Version ?? "?";
        const action = opts.onOpenRuleSet
          ? { label: "Open", onClick: () => opts.onOpenRuleSet!(e.RuleSetId) }
          : undefined;
        notify(`Rule set #${e.RuleSetId} is out of sync with the server`, {
          description: `Local draft v${local}, server v${server}. Open the rule set to reload or overwrite.`,
          action,
        });
      }

      // Single structured summary line so operators can grep boot health.
      console.info("[bootReconcile] complete", {
        total: entries.length,
        drift: drift.length,
        missing: missing.length,
        failed: failed.length,
      });

      return entries;
    } catch (e) {
      // Never let a boot reconciliation failure break the shell.
      console.error("[bootReconcile] fatal", e);
      hasBootRan = true; // do not retry-storm on every re-render

      return [];
    } finally {
      bootInFlight = null;
    }
  })();

  return bootInFlight;
}

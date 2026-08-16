import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 79 step 25. Metadata bar for the rule editor.
//
// Renders name, pocket size, notes, and applies-before picker. Saves
// through `useRulesLibrary().save()` on every change (debounced), so the
// facade is the single source of truth. Errors from the facade
// (RuleCycleError, RuleValidationError) are surfaced inline next to the
// offending field AND pushed to the Global Error Modal via
// `showToastError` for later inspection.
//
// Cycle prevention (defense in depth):
//   - The applies-before picker filters out `rule.id` itself AND any rule
//     that transitively depends on `rule.id`, so choices offered to the
//     user cannot form a cycle. If the user somehow saves a cycle anyway
//     (concurrent edit, direct facade call), the facade rejects it and we
//     display the returned cycle path.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { showToastError } from "@/lib/errors/notify";
import {
  ALL_POCKET_SIZES,
  RuleCycleError,
  RuleValidationError,
  UNCATEGORIZED_RULE_ID,
  type PocketSize,
  type Rule,
  type RuleId,
} from "@/lib/rules/model";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";

interface Props {
  rule: Rule;
}

/** Depth-first, returns true if `target` is reachable from `startId` in the
 * appliesBefore graph. Used to hide unsafe picks from the picker. */
function reaches(startId: RuleId, target: RuleId, index: Map<RuleId, Rule>): boolean {
  const stack: RuleId[] = [startId];
  const seen = new Set<RuleId>();
  while (stack.length > 0) {
    const id = stack.pop()!;

    if (id === target) return true;

    if (seen.has(id)) continue;
    seen.add(id);
    const node = index.get(id);

    if (!node) continue;
    for (const dep of node.appliesBefore) stack.push(dep);
  }

  return false;
}

export function RuleMetadataBar({ rule }: Props) {
  const { all, save } = useRulesLibrary();
  const [name, setName] = useState(rule.name);
  const [notes, setNotes] = useState(rule.notes ?? "");
  const [pocketSize, setPocketSize] = useState<PocketSize | undefined>(rule.pocketSize);
  const [appliesBefore, setAppliesBefore] = useState<RuleId[]>(rule.appliesBefore);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // When the incoming rule changes (route param change), reset local state.
  const idRef = useRef(rule.id);
  useEffect(() => {
    if (idRef.current === rule.id) return;
    idRef.current = rule.id;
    setName(rule.name);
    setNotes(rule.notes ?? "");
    setPocketSize(rule.pocketSize);
    setAppliesBefore(rule.appliesBefore);
    setError(null);
  }, [rule]);

  const index = useMemo(() => {
    const m = new Map<RuleId, Rule>();
    for (const r of all) m.set(r.id, r);

    return m;
  }, [all]);

  const commit = useCallback(
    async (patch: Partial<Rule>) => {
      const next: Rule = {
        ...rule,
        name: (patch.name ?? name).trim(),
        notes: patch.notes ?? (notes.trim() ? notes.trim() : undefined),
        pocketSize: patch.pocketSize ?? pocketSize,
        appliesBefore: patch.appliesBefore ?? appliesBefore,
        updatedAt: new Date().toISOString(),
      };
      setSaving(true);
      setError(null);
      try {
        await save(next);
        ClientLogger.info(
          `[rules/editor] saved id=${String(next.id)} name="${next.name}" pocket=${next.pocketSize ?? "-"} applies=${next.appliesBefore.length}`,
        );
      } catch (err) {
        if (err instanceof RuleCycleError) {
          const msg = `Cycle: ${err.path.map(String).join(" -> ")}`;
          setError({ field: "appliesBefore", message: msg });
          showToastError("Applies-before cycle rejected", err);
        } else if (err instanceof RuleValidationError) {
          const first = err.issues[0];
          const field = String(first?.path?.[0] ?? "form");
          setError({ field, message: first?.message ?? "Invalid" });
          showToastError("Rule validation failed", err);
        } else {
          setError({ field: "form", message: (err as Error).message });
          showToastError("Rule save failed", err);
        }
      } finally {
        setSaving(false);
      }
    },
    [rule, name, notes, pocketSize, appliesBefore, save],
  );

  // Debounced auto-save for text fields.
  const nameTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (name.trim() === rule.name) return;
    window.clearTimeout(nameTimer.current);
    nameTimer.current = window.setTimeout(() => void commit({ name }), 400);

    return () => window.clearTimeout(nameTimer.current);
  }, [name, rule.name, commit]);

  const notesTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if ((notes.trim() || undefined) === rule.notes) return;
    window.clearTimeout(notesTimer.current);
    notesTimer.current = window.setTimeout(() => void commit({ notes }), 500);

    return () => window.clearTimeout(notesTimer.current);
  }, [notes, rule.notes, commit]);

  const availableAppliesBefore = useMemo(() => {
    return all.filter((candidate) => {
      if (candidate.id === rule.id) return false;

      if (candidate.id === UNCATEGORIZED_RULE_ID) return false;

      if (appliesBefore.includes(candidate.id)) return false;
      // If `candidate` already reaches `rule`, adding `candidate` to rule's
      // appliesBefore would form a cycle.
      if (reaches(candidate.id, rule.id, index)) return false;

      return true;
    });
  }, [all, appliesBefore, rule.id, index]);

  const addDep = (id: RuleId) => {
    const next = [...appliesBefore, id];
    setAppliesBefore(next);
    void commit({ appliesBefore: next });
  };
  const removeDep = (id: RuleId) => {
    const next = appliesBefore.filter((d) => d !== id);
    setAppliesBefore(next);
    void commit({ appliesBefore: next });
  };

  const nameError = name.trim().length === 0 ? "Name is required" : null;

  return (
    <section
      aria-labelledby="rule-metadata-heading"
      className="rounded-sm border border-ca-border bg-ca-panel"
      data-testid="rule-metadata-bar"
    >
      <header className="flex items-center justify-between border-b border-ca-border px-hmi-3 py-hmi-2">
        <h2 id="rule-metadata-heading" className="text-hmi-h3 font-semibold">
          Metadata
        </h2>
        <span className="font-mono text-[13px] tabular-nums text-ca-ink-muted" aria-live="polite">
          {saving ? "Saving..." : "Saved"}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-hmi-3 p-hmi-3 md:grid-cols-2">
        {/* Name */}
        <label className="flex flex-col gap-hmi-1">
          <span className="text-hmi-body text-ca-ink-muted">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            aria-invalid={Boolean(nameError) || error?.field === "name"}
            className="h-[24px] rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
            data-testid="rule-name-input"
          />
          {(nameError || error?.field === "name") && (
            <span role="alert" className="text-[12px] text-ca-danger">
              {nameError ?? error?.message}
            </span>
          )}
        </label>

        {/* Pocket size */}
        <label className="flex flex-col gap-hmi-1">
          <span className="text-hmi-body text-ca-ink-muted">Pocket size</span>
          <select
            value={pocketSize ?? ""}
            onChange={(e) => {
              const v = e.target.value ? (Number(e.target.value) as PocketSize) : undefined;
              setPocketSize(v);
              void commit({ pocketSize: v });
            }}
            className="h-[24px] rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
            data-testid="rule-pocket-select"
          >
            <option value="">Unset</option>
            {ALL_POCKET_SIZES.map((p) => (
              <option key={p} value={p}>{`P${p}`}</option>
            ))}
          </select>
        </label>

        {/* Notes */}
        <label className="flex flex-col gap-hmi-1 md:col-span-2">
          <span className="text-hmi-body text-ca-ink-muted">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
            className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
          />
          <span className="text-right font-mono text-[12px] tabular-nums text-ca-ink-muted">
            {notes.length}/500
          </span>
        </label>

        {/* Applies before */}
        <div className="flex flex-col gap-hmi-1 md:col-span-2">
          <span className="text-hmi-body text-ca-ink-muted">
            Applies before{" "}
            <span className="font-mono text-[13px] tabular-nums text-ca-ink">
              ({appliesBefore.length})
            </span>
          </span>
          <div
            className="flex flex-wrap gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 p-hmi-2"
            data-testid="applies-before-chips"
          >
            {appliesBefore.length === 0 ? (
              <span className="text-hmi-body text-ca-ink-muted">
                No dependencies. This rule runs first.
              </span>
            ) : (
              appliesBefore.map((depId) => {
                const dep = index.get(depId);

                return (
                  <span
                    key={String(depId)}
                    className="inline-flex h-[22px] items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 text-[13px]"
                  >
                    <span className="font-medium">{dep?.name ?? String(depId)}</span>
                    <button
                      type="button"
                      onClick={() => removeDep(depId)}
                      className="text-ca-ink-muted hover:text-ca-danger"
                      aria-label={`Remove ${dep?.name ?? String(depId)}`}
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              addDep(e.target.value as RuleId);
              e.currentTarget.value = "";
            }}
            className="h-[24px] rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
            data-testid="applies-before-picker"
            aria-label="Add applies-before dependency"
          >
            <option value="">Add dependency...</option>
            {availableAppliesBefore.map((r) => (
              <option key={String(r.id)} value={String(r.id)}>
                {r.isCategory ? `[cat] ${r.name}` : r.name}
              </option>
            ))}
          </select>

          {error?.field === "appliesBefore" && (
            <span role="alert" className="text-[12px] text-ca-danger">
              {error.message}
            </span>
          )}
        </div>
      </div>

      {error?.field === "form" && (
        <div
          role="alert"
          className="border-t border-ca-danger px-hmi-3 py-hmi-2 text-[12px] text-ca-danger"
        >
          {error.message}
        </div>
      )}
    </section>
  );
}

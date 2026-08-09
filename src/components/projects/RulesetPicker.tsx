import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// Plan 67 step 41 (PR-06): multi-select rule sets on the project detail
// with override-chain preview. Selected ids are handed to the Run picker
// (step 42) via `/run?projectId=&rulesetIds=`. Selection state lives in
// local component state: rulesets are already project-scoped, so we
// don't persist a "selected" list on the store yet. The picker is a
// controlled surface so callers can pre-select from URL state later.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckSquare, Square, Play, ImageIcon, Pencil } from "lucide-react";
import type { RuleSet } from "@/lib/projects/store";
import { resolveOverrideChain, summarizeOverrideChain } from "@/lib/projects/override-chain";
import { toIntParam } from "@/lib/ids/int-alias";

export interface RulesetPickerProps {
  projectId: string;
  rulesets: readonly RuleSet[];
  /** Initially selected ruleset ids. Defaults to all rulesets. */
  initialSelected?: readonly string[];
  /** Called whenever the selection changes. Optional for uncontrolled use. */
  onChange?: (selected: string[]) => void;
}

export function RulesetPicker({
  projectId,
  rulesets,
  initialSelected,
  onChange,
}: RulesetPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected ?? rulesets.map((r) => r.id)),
  );
  const rulesetsById = useMemo(() => {
    const map: Record<string, RuleSet> = {};
    for (const r of rulesets) map[r.id] = r;

    return map;
  }, [rulesets]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange?.(Array.from(next));

      return next;
    });
  }

  function selectAll() {
    const next = new Set(rulesets.map((r) => r.id));
    setSelected(next);
    onChange?.(Array.from(next));
  }

  function selectNone() {
    const next = new Set<string>();
    setSelected(next);
    onChange?.([]);
  }

  const selectedList = rulesets.filter((r) => selected.has(r.id));
  const runSearch = {
    projectId,
    rulesetIds: selectedList.length > 0 ? selectedList.map((r) => r.id) : undefined,
  };

  if (rulesets.length === 0) {
    return (
      <p className="text-hmi-body text-ca-ink-muted">
        No rule sets on this project yet. Create one before running.
      </p>
    );
  }

  return (
    <div className="space-y-hmi-3">
      <div className="flex flex-wrap items-center gap-hmi-2">
        <button
          type="button"
          onClick={selectAll}
          className="inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={selectNone}
          className="inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
        >
          Clear
        </button>
        <span className="text-hmi-caption text-ca-ink-muted">
          {selectedList.length} of {rulesets.length} selected
        </span>
        <div className="ml-auto">
          <Link
            to="/run"
            search={runSearch}
            aria-disabled={selectedList.length === 0}
            className={`inline-flex items-center gap-hmi-2 rounded-sm px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus ${
              selectedList.length === 0
                ? "pointer-events-none cursor-not-allowed bg-ca-panel-2 text-ca-ink-muted"
                : "bg-ca-select hover:brightness-110"
            }`}
          >
            <Play aria-hidden size={16} />
            Open in Run
          </Link>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-hmi-2">
        {rulesets.map((r) => {
          const chain = resolveOverrideChain(r, rulesetsById);
          const summary = summarizeOverrideChain(chain);
          const isSel = selected.has(r.id);

          return (
            <li
              key={r.id}
              className={`flex items-start gap-hmi-3 rounded-md border p-hmi-3 ${
                isSel ? "border-ca-select bg-ca-panel" : "border-ca-border bg-ca-panel-2"
              }`}
            >
              <button
                type="button"
                aria-pressed={isSel}
                onClick={() => toggle(r.id)}
                className="mt-hmi-1 text-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                aria-label={isSel ? `Deselect ${r.name}` : `Select ${r.name}`}
              >
                {isSel ? (
                  <CheckSquare aria-hidden size={20} />
                ) : (
                  <Square aria-hidden size={20} className="text-ca-ink-muted" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-hmi-2">
                  <span className="font-display text-hmi-body font-semibold text-ca-ink">
                    {r.name}
                  </span>
                  <span
                    className={`rounded-sm border px-hmi-1 text-hmi-caption uppercase tracking-wide ${
                      r.overrideMode === "reference"
                        ? "border-ca-select/40 text-ca-select"
                        : r.overrideMode === "snapshot"
                          ? "border-ca-warn/40 text-ca-warn"
                          : "border-ca-border text-ca-ink-muted"
                    }`}
                  >
                    {r.overrideMode ?? "direct"}
                  </span>
                  {r.categoryName ? (
                    <span className="rounded-sm border border-ca-border px-hmi-1 text-hmi-caption text-ca-ink-muted">
                      {r.categoryName}
                    </span>
                  ) : null}
                </div>
                <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
                  {r.rules.length} {r.rules.length === 1 ? "rule" : "rules"},{" "}
                  {r.imageRef ? (
                    <span className="inline-flex items-center gap-hmi-1">
                      <ImageIcon aria-hidden size={12} /> image attached
                    </span>
                  ) : (
                    "no image"
                  )}
                </p>
                <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
                  Chain: {summary}
                  {chain.isTruncated ? " (parent missing)" : ""}
                </p>
              </div>
              <Link
                to="/projects/$projectId/rulesets/$rulesetId"
                params={{ projectId, rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, r.id) }}
                className="inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                aria-label={`Edit ${r.name}`}
              >
                <Pencil aria-hidden size={12} /> Edit
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

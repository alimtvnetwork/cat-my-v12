// Plan 03 step 4. Rule preview (§6.3).
// Summary card in Yeasin ResultCard language: name, category, pocket
// size, conditions count, camera setting, appliesBefore chips.
// Actions: edit rule (→ /setup/rules/$id).

import { Pencil } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";

export function RulePreview({ ruleId }: { ruleId: string }): React.JSX.Element {
  const navigate = useNavigate();
  const { byId } = useRulesLibrary();
  const rule = byId(ruleId as never);

  if (!rule) return <p className="text-xs text-ca-ink-muted">Rule not found.</p>;

  const categoryName = rule.categoryId ? (byId(rule.categoryId)?.name ?? "—") : "—";
  const preNames = (rule.appliesBefore ?? []).map((id) => byId(id)?.name ?? id);

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-ca-border bg-ca-panel-2 p-2.5">
        <p className="text-sm font-semibold text-ca-ink">{rule.name}</p>
        {rule.notes ? (
          <p className="mt-1 text-[11px] leading-relaxed text-ca-ink-muted">{rule.notes}</p>
        ) : null}
      </div>

      <dl className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-ca-ink-muted">Category</dt>
          <dd className="truncate text-ca-ink">{categoryName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ca-ink-muted">Pocket size</dt>
          <dd className="font-mono text-ca-ink">{rule.pocketSize ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ca-ink-muted">Conditions</dt>
          <dd className="font-mono tabular-nums text-ca-ink">{rule.conditions.length}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ca-ink-muted">Camera setting</dt>
          <dd className="truncate font-mono text-ca-ink">{rule.cameraSettingId ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ca-ink-muted">Last verdict</dt>
          <dd>
            <span className="rounded border border-ca-border px-1.5 py-0.5 font-mono text-[10px] text-ca-ink-muted">
              —
            </span>
          </dd>
        </div>
      </dl>

      {preNames.length > 0 ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ca-ink-muted">
            Runs before
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {preNames.map((name) => (
              <span
                key={name}
                className="rounded bg-ca-panel-2 px-1.5 py-0.5 text-[10px] text-ca-ink"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void navigate({ to: "/setup/rules/$id", params: { id: ruleId } })}
        className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-ca-border bg-ca-panel px-2 py-1.5 text-xs font-medium text-ca-ink hover:border-ca-select"
      >
        <Pencil size={14} />
        Edit rule
      </button>
    </div>
  );
}

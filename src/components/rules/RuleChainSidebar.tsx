import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { GitCommitHorizontal, Network } from "lucide-react";
import type { Rule, RuleId } from "@/lib/rules/model";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import { toIntId } from "@/lib/rules/rule-id-alias";

export function RuleChainSidebar({ rule }: { rule: Rule }): React.JSX.Element | null {
  const { all } = useRulesLibrary();
  const byId = useMemo(() => new Map(all.map((r) => [r.id, r])), [all]);

  return (
    <section
      aria-label="Rule Chain"
      className="flex max-h-[300px] min-h-[160px] flex-col border-t border-ca-border bg-ca-panel"
      data-testid="rule-chain-sidebar"
    >
      <header className="flex items-center gap-hmi-2 border-b border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-[11px] font-semibold uppercase tracking-wide text-ca-ink-muted">
        <Network size={12} aria-hidden />
        <h2>Dependencies</h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-hmi-2">
        <ChainNode id={rule.id} depth={0} byId={byId} seen={new Set()} isRoot={true} />
      </div>
    </section>
  );
}

function ChainNode({
  id,
  depth,
  byId,
  seen,
  isRoot,
}: {
  id: RuleId;
  depth: number;
  byId: Map<RuleId, Rule>;
  seen: Set<RuleId>;
  isRoot?: boolean;
}) {
  const rule = byId.get(id);
  const isMissing = !rule;
  const isCycle = seen.has(id);
  const nextSeen = new Set(seen).add(id);

  return (
    <div className="flex flex-col">
      <div
        className="flex min-h-[24px] items-center gap-hmi-1 rounded-sm px-hmi-2 hover:bg-ca-panel-2"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <GitCommitHorizontal
          size={12}
          className={isRoot ? "text-ca-select" : "text-ca-ink-muted"}
          aria-hidden
        />
        {isMissing ? (
          <span className="text-[12px] text-ca-ink-muted line-through">Unknown {id}</span>
        ) : (
          <Link
            to={rule.isCategory ? "/setup/categories/$id" : "/setup/rules/$id"}
            params={{
              id: rule.isCategory ? String(rule.id) : String(toIntId(String(rule.id))),
            }}
            className={[
              "truncate text-[12px] font-medium hover:underline",
              isRoot ? "text-ca-ink" : "text-ca-ink-muted hover:text-ca-ink",
            ].join(" ")}
          >
            {rule.name}
          </Link>
        )}
        {isCycle && <span className="ml-1 text-[10px] text-ca-danger">(Cycle)</span>}
        {!isMissing && !isRoot && (
          <span
            className="ml-auto inline-flex items-center justify-center rounded-[2px] border border-ca-border bg-ca-bg px-1 font-mono text-[9px] uppercase text-ca-ink-muted"
            title="Dependency kind"
          >
            {rule.isCategory ? "CAT" : "RULE"}
          </span>
        )}
      </div>
      {!isCycle &&
        rule &&
        rule.appliesBefore.map((depId) => (
          <ChainNode key={depId} id={depId} depth={depth + 1} byId={byId} seen={nextSeen} />
        ))}
    </div>
  );
}

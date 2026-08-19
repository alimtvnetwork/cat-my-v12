// Plan 72 step 15: rule template hints panel.
//
// Root cause of the old design: rule templates lived nowhere. The
// `ruleTemplates` slice was defined in the UI seed facade (Plan 72
// steps 2-6) but no UI consumed it, so operators had no idea which
// canonical rule shapes the platform ships with. This surfaces those
// hints inline in the drawer, filtered to the currently-edited rule's
// kind so the list stays short and relevant.
//
// This is a hints surface (read-only): applying a template is a
// separate action landed in step 17 alongside the sample-tile refactor.
// Explicit "no data" and "load failure" states keep the panel honest
// per spec/03-error-manage — silent empty states are not acceptable.
import { useMemo } from "react";
import { SeedSlot } from "@/lib/seed";
import type { CatSeedRuleKind, CatSeedRuleTemplate } from "@/lib/seed/types";

export interface RuleTemplateHintsProps {
  /** Kind of the rule currently being edited. Filters template list. */
  ruleKind: CatSeedRuleKind;
  /**
   * Plan 72 step 17: apply-template action. Fired when the operator clicks
   * "Apply" on a hint. Consumers use this to prefill the current rule.
   * When omitted, the "Apply" button is hidden so the panel stays a pure
   * read-only hint surface (test / storybook contexts).
   */
  onApply?: (template: CatSeedRuleTemplate) => void;
}

export function RuleTemplateHints({ ruleKind, onApply }: RuleTemplateHintsProps): React.JSX.Element | null {
  // Plan 72 step 19: render via `SeedSlot` so loading gets a real
  // skeleton (non-blocking) and error/empty branches match every other
  // seed consumer. Filtering by `ruleKind` still happens locally because
  // it is view state, not facade concern.
  return (
    <SeedSlot slice="ruleTemplates" slot="rule-template-hints" ariaLabel="Rule templates">
      {(all) => (
        <ReadyList
          all={all as ReadonlyArray<CatSeedRuleTemplate>}
          ruleKind={ruleKind}
          onApply={onApply}
        />
      )}
    </SeedSlot>
  );
}

function ReadyList({
  all,
  ruleKind,
  onApply,
}: {
  all: ReadonlyArray<CatSeedRuleTemplate>;
  ruleKind: CatSeedRuleKind;
  onApply?: (t: CatSeedRuleTemplate) => void;
}) {
  const matches = useMemo(() => all.filter((t) => t.kind === ruleKind), [all, ruleKind]);

  if (matches.length === 0) {
    return (
      <section
        aria-label="Rule templates"
        data-slot="rule-template-hints"
        data-state="empty"
        className="rounded-md border border-dashed p-2 text-xs text-muted-foreground"
      >
        No seeded templates for kind {ruleKind}.
      </section>
    );
  }

  return (
    <section
      aria-label="Rule templates"
      data-slot="rule-template-hints"
      data-state="ready"
      className="flex flex-col gap-1.5 rounded-md border p-2"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Templates for kind {ruleKind}
      </div>
      <ul className="flex flex-col gap-1">
        {matches.map((t) => (
          <li
            key={t.id}
            data-testid={`rule-template-hint-${t.id}`}
            className="flex items-start justify-between gap-2 text-xs leading-snug"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium">{t.label}</div>
              {t.description ? <div className="text-muted-foreground">{t.description}</div> : null}
            </div>
            {onApply ? (
              <button
                type="button"
                data-testid={`rule-template-apply-${t.id}`}
                onClick={() => onApply(t)}
                className="shrink-0 rounded border px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Apply
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

import { EditorRuleKindType } from "@/lib/editor/types";
// Math-expression param panel (plan 30 step 79, per-kind panel for kind "E").
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { RuleKindType } from "@/types/rules/RuleKind";
import { PassThresholdField } from "./PassThresholdField";
import { getCalibrationSuggestion } from "@/lib/editor/calibration";

export interface MathRuleEditorProps {
  rule: EditorRule;
  onChange: (id: string, patch: EditorRuleParams) => void;
}

export function MathRuleEditor({ rule, onChange }: MathRuleEditorProps) {
  if (RuleKindType.isEdge(rule.kind) === false) return null;
  const p = rule.params ?? {};
  const expression = String(p.expression ?? "");
  const threshold = Number(
    p.threshold ?? getCalibrationSuggestion(EditorRuleKindType.E)?.threshold ?? 0.75,
  );
  const patch = (next: EditorRuleParams) => onChange(rule.id, { ...p, ...next });

  return (
    <section
      aria-label="Math rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Math expression</h2>
        <span className="text-hmi-caption text-ca-ink-muted">{rule.name}</span>
      </header>

      <label className="flex flex-col gap-hmi-1">
        <span className="text-hmi-body text-ca-ink">Expression</span>
        <textarea
          value={expression}
          spellCheck={false}
          rows={3}
          onChange={(e) => patch({ expression: e.target.value })}
          placeholder="area(rule1) / area(rule2)"
          className="border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 font-hmi-mono text-hmi-body text-ca-ink"
        />
        <span className="text-hmi-caption text-ca-ink-muted">
          Reference sibling rules by name. Result must exceed the pass threshold.
        </span>
      </label>

      <PassThresholdField
        kind={EditorRuleKindType.E}
        value={threshold}
        onChange={(v) => patch({ threshold: v })}
      />
    </section>
  );
}

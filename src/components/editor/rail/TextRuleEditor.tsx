import { EditorRuleKindType } from "@/lib/editor/types";
// Text-match param panel (plan 30 step 77, per-kind panel for kind "S").
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { RuleKindType } from "@/types/rules/RuleKind";
import { PassThresholdField } from "./PassThresholdField";
import { getCalibrationSuggestion } from "@/lib/editor/calibration";

export interface TextRuleEditorProps {
  rule: EditorRule;
  onChange: (id: string, patch: EditorRuleParams) => void;
}

interface TextFlagOption {
  value: string;
  label: string;
  hint: string;
}

const FLAG_OPTIONS: TextFlagOption[] = [
  { value: "i", label: "i", hint: "Case-insensitive" },
  { value: "m", label: "m", hint: "Multiline anchors" },
  { value: "s", label: "s", hint: "Dot matches newlines" },
  { value: "u", label: "u", hint: "Unicode mode" },
];

export function TextRuleEditor({ rule, onChange }: TextRuleEditorProps) {
  if (RuleKindType.isSlot(rule.kind) === false) return null;
  const p = rule.params ?? {};
  const pattern = String(p.pattern ?? "");
  const flags = String(p.flags ?? "i");
  const passThreshold = Number(
    p.passThreshold ?? getCalibrationSuggestion(EditorRuleKindType.S)?.threshold ?? 0.6,
  );
  const patch = (next: EditorRuleParams) => onChange(rule.id, { ...p, ...next });

  const toggleFlag = (f: string) => {
    const set = new Set(flags.split(""));

    if (set.has(f)) set.delete(f);
    else set.add(f);
    patch({ flags: Array.from(set).join("") });
  };

  const testResult = evaluatePattern(pattern, flags);

  return (
    <section
      aria-label="Text match rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Text pattern</h2>
        <span className="text-hmi-caption text-ca-ink-muted">{rule.name}</span>
      </header>

      <label className="flex flex-col gap-hmi-1">
        <span className="text-hmi-body text-ca-ink">Regex pattern</span>
        <input
          type="text"
          value={pattern}
          spellCheck={false}
          onChange={(e) => patch({ pattern: e.target.value })}
          placeholder="^LOT-\d{6}$"
          className="border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 font-hmi-mono text-hmi-body text-ca-ink"
        />
      </label>

      <fieldset className="flex flex-col gap-hmi-1">
        <legend className="text-hmi-body text-ca-ink">Flags</legend>
        <div className="grid grid-cols-4 gap-hmi-1">
          {FLAG_OPTIONS.map((f) => (
            <label
              key={f.value}
              title={f.hint}
              className={`flex cursor-pointer items-center justify-center gap-hmi-1 border px-hmi-2 py-hmi-1 text-hmi-body ${
                flags.includes(f.value)
                  ? "border-ca-primary text-ca-ink"
                  : "border-ca-border text-ca-ink-muted"
              }`}
            >
              <input
                type="checkbox"
                checked={flags.includes(f.value)}
                onChange={() => toggleFlag(f.value)}
                className="accent-ca-primary"
              />
              <span className="font-hmi-mono">{f.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p
        role="status"
        aria-live="polite"
        className={`text-hmi-caption ${testResult.ok ? "text-ca-ink-muted" : "text-ca-ng"}`}
      >
        {testResult.ok ? "Pattern compiles" : `Invalid: ${testResult.error}`}
      </p>
      <PassThresholdField
        kind={EditorRuleKindType.S}
        value={passThreshold}
        onChange={(v) => patch({ passThreshold: v })}
      />
    </section>
  );
}

function evaluatePattern(
  pattern: string,
  flags: string,
): { ok: true } | { ok: false; error: string } {
  if (pattern.length === 0) return { ok: true };
  try {
    new RegExp(pattern, flags);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
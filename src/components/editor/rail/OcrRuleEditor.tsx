import { EditorRuleKindType } from "@/lib/editor/types";
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { RuleKindType } from "@/types/rules/RuleKind";
import { PassThresholdField } from "./PassThresholdField";
import { getCalibrationSuggestion } from "@/lib/editor/calibration";
import { useSyncExternalStore } from "react";
import { getOcrResult, subscribeOcrResults } from "@/lib/editor/ocr/results-bus";

import { OcrMatchModeType } from "@/lib/enums/editor";
export enum OcrBoundingBehaviorType {
  Fixed = "fixed",
  ExpandToText = "expand-to-text",
  SnapToText = "snap-to-text",
}
export type OcrBoundingBehavior = OcrBoundingBehaviorType;

export interface OcrRuleEditorProps {
  rule: EditorRule;
  onChange: (id: string, patch: EditorRuleParams) => void;
}

interface OcrMatchModeOption {
  value: OcrMatchModeType;
  label: string;
  hint: string;
}

const MATCH_MODES: OcrMatchModeOption[] = [
  { value: OcrMatchModeType.Exact, label: "Exact", hint: "Text must match the target verbatim." },
  {
    value: OcrMatchModeType.Contains,
    label: "Contains",
    hint: "Passes if the target appears anywhere in the OCR result.",
  },
  {
    value: OcrMatchModeType.Regex,
    label: "Regex",
    hint: "Target is a regular expression evaluated against the OCR result.",
  },
  {
    value: OcrMatchModeType.Fuzzy,
    label: "Fuzzy",
    hint: "Passes when similarity ≥ threshold (0-1).",
  },
];

interface OcrBoundingOption {
  value: OcrBoundingBehaviorType;
  label: string;
  hint: string;
}

const BOUNDING_MODES: OcrBoundingOption[] = [
  {
    value: OcrBoundingBehaviorType.Fixed,
    label: "Fixed ROI",
    hint: "OCR runs on the drawn rectangle as-is.",
  },
  {
    value: OcrBoundingBehaviorType.ExpandToText,
    label: "Expand to text",
    hint: "ROI grows outward until text edges are found.",
  },
  {
    value: OcrBoundingBehaviorType.SnapToText,
    label: "Snap to text",
    hint: "ROI shrinks to tightly wrap detected glyphs.",
  },
];

export function OcrRuleEditor({ rule, onChange }: OcrRuleEditorProps) {
  const lastRead = useSyncExternalStore(
    subscribeOcrResults,
    () => getOcrResult(rule.id),
    () => undefined,
  );

  if (RuleKindType.isKeypoint(rule.kind) === false) return null;
  const p = rule.params ?? {};
  const expectedText = String(p.expectedText ?? "");
  const matchMode = String(p.matchMode ?? OcrMatchModeType.Exact) as OcrMatchModeType;
  const caseInsensitive = Boolean(p.caseInsensitive ?? true);
  const stripWhitespace = Boolean(p.stripWhitespace ?? true);
  const fuzzyThreshold = Number(p.fuzzyThreshold ?? 0.85);
  const boundingBehavior = String(p.boundingBehavior ?? "fixed") as OcrBoundingBehavior;
  const paddingPx = Number(p.paddingPx ?? 4);
  const passThreshold = Number(
    p.passThreshold ?? getCalibrationSuggestion(EditorRuleKindType.K)?.threshold ?? 0.45,
  );

  const patch = (next: EditorRuleParams) => onChange(rule.id, { ...p, ...next });

  return (
    <section
      aria-label="OCR rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">OCR / text validation</h2>
        <span className="text-hmi-caption text-ca-ink-muted">{rule.name}</span>
      </header>

      <label className="flex flex-col gap-hmi-1">
        <span className="text-hmi-body text-ca-ink">Target text</span>
        <input
          type="text"
          value={expectedText}
          spellCheck={false}
          onChange={(e) => patch({ expectedText: e.target.value })}
          className="border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
          placeholder={matchMode === "regex" ? "^LOT-\\d{6}$" : "e.g. LOT-000123"}
        />
      </label>

      <fieldset className="flex flex-col gap-hmi-1">
        <legend className="text-hmi-body text-ca-ink">Matching mode</legend>
        <div className="grid grid-cols-2 gap-hmi-1">
          {MATCH_MODES.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer items-center gap-hmi-2 border px-hmi-2 py-hmi-1 text-hmi-body ${
                matchMode === m.value
                  ? "border-ca-primary text-ca-ink"
                  : "border-ca-border text-ca-ink-muted"
              }`}
              title={m.hint}
            >
              <input
                type="radio"
                name={`match-mode-${rule.id}`}
                value={m.value}
                checked={matchMode === m.value}
                onChange={() => patch({ matchMode: m.value })}
                className="accent-ca-primary"
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-hmi-2">
        <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
          <input
            type="checkbox"
            checked={caseInsensitive}
            onChange={(e) => patch({ caseInsensitive: e.target.checked })}
            className="accent-ca-primary"
            disabled={matchMode === "regex"}
          />
          Case-insensitive
        </label>
        <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
          <input
            type="checkbox"
            checked={stripWhitespace}
            onChange={(e) => patch({ stripWhitespace: e.target.checked })}
            className="accent-ca-primary"
          />
          Strip whitespace
        </label>
      </div>

      {matchMode === "fuzzy" ? (
        <label className="flex flex-col gap-hmi-1">
          <span className="flex justify-between text-hmi-body text-ca-ink">
            <span>Fuzzy threshold</span>
            <span className="font-hmi-mono text-ca-ink-muted">{fuzzyThreshold.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={fuzzyThreshold}
            onChange={(e) => patch({ fuzzyThreshold: Number(e.target.value) })}
            className="accent-ca-primary"
          />
        </label>
      ) : null}

      <fieldset className="flex flex-col gap-hmi-1">
        <legend className="text-hmi-body text-ca-ink">Bounding behavior</legend>
        <div className="flex flex-col gap-hmi-1">
          {BOUNDING_MODES.map((b) => (
            <label
              key={b.value}
              className="flex items-start gap-hmi-2 border border-ca-border p-hmi-2 text-hmi-body text-ca-ink"
              title={b.hint}
            >
              <input
                type="radio"
                name={`bound-${rule.id}`}
                value={b.value}
                checked={boundingBehavior === b.value}
                onChange={() => patch({ boundingBehavior: b.value })}
                className="mt-1 accent-ca-primary"
              />
              <span className="flex flex-col">
                <span>{b.label}</span>
                <span className="text-hmi-caption text-ca-ink-muted">{b.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span>ROI padding (px)</span>
          <span className="font-hmi-mono text-ca-ink-muted">{paddingPx}</span>
        </span>
        <input
          type="number"
          min={0}
          max={64}
          step={1}
          value={paddingPx}
          onChange={(e) => patch({ paddingPx: Number(e.target.value) })}
          className="border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
        />
      </label>
      <PassThresholdField
        kind={EditorRuleKindType.K}
        value={passThreshold}
        onChange={(v) => patch({ passThreshold: v })}
      />
      <div
        aria-label="Last OCR read"
        className="flex flex-col gap-hmi-1 border border-ca-border bg-ca-bg p-hmi-2"
      >
        <span className="text-hmi-caption text-ca-ink-muted">Last read</span>
        {lastRead ? (
          <>
            <span className="font-hmi-mono text-hmi-body text-ca-ink break-all">
              {lastRead.text || <em className="text-ca-ink-muted">(empty)</em>}
            </span>
            <span className="text-hmi-caption text-ca-ink-muted">
              confidence {(lastRead.confidence * 100).toFixed(1)}% ·{" "}
              {new Date(lastRead.at).toLocaleTimeString()}
            </span>
          </>
        ) : (
          <span className="text-hmi-caption text-ca-ink-muted">
            No OCR result yet. Run the rule to populate.
          </span>
        )}
      </div>
    </section>
  );
}

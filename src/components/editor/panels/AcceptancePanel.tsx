// Per-rule acceptance criteria panel. Each rule carries an ordered list
// of acceptance conditions the Python backend AND-combines to decide
// pass/fail. The list is serialized into `rule.params.acceptanceConditions`
// as a JSON string (EditorRuleParams only allows primitive values).
//
// For back-compat with older rules that used the flat single-condition
// shape (acceptancePresence/acceptanceTargetColor/acceptanceSimilarityPct),
// readConditions() migrates those into a one-element list, and every
// write mirrors the first condition back into those flat fields.
//
// Backend contract lives at spec/21-app/60-rule-acceptance-contract.md.
import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { PresenceModeType } from "@/lib/enums/editor";
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface AcceptanceCondition {
  id: string;
  presence: PresenceModeType;
  targetColor: string;
  similarityPct: number;
}

// eslint-disable-next-line react-refresh/only-export-components -- helper colocated with the panel that owns its schema.
export function readConditions(rule: EditorRule): AcceptanceCondition[] {
  const p = rule.params ?? {};
  const raw = typeof p.acceptanceConditions === "string" ? p.acceptanceConditions : "";

  if (raw) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed))
        return parsed.map(normalize).filter(Boolean) as AcceptanceCondition[];
    } catch {
      // fall through to legacy migration
    }
  }
  // Legacy single-condition migration. Two historical shapes exist:
  //   1. `acceptancePresence: "present" | "absent" | "ignore"` (later flat form)
  //   2. `acceptanceAbsence: boolean` (older form, true meant "must be absent")
  // Either one, plus the flat targetColor / similarity fields, maps to a
  // single-condition list.
  const legacyPresenceStr = typeof p.acceptancePresence === "string" ? p.acceptancePresence : null;
  const legacyAbsenceBool = typeof p.acceptanceAbsence === "boolean" ? p.acceptanceAbsence : null;
  const hasLegacy =
    legacyPresenceStr !== null ||
    legacyAbsenceBool !== null ||
    typeof p.acceptanceTargetColor === "string" ||
    typeof p.acceptanceSimilarityPct === "number";

  if (!hasLegacy) return [];
  // Explicit presence string wins; otherwise derive from the boolean.
  const presence: PresenceModeType =
    legacyPresenceStr !== null
      ? coercePresence(legacyPresenceStr)
      : legacyAbsenceBool === true
        ? PresenceModeType.Absent
        : legacyAbsenceBool === false
          ? PresenceModeType.Present
          : PresenceModeType.Ignore;

  return [
    {
      id: freshId(),
      presence,
      targetColor: typeof p.acceptanceTargetColor === "string" ? p.acceptanceTargetColor : "",
      similarityPct: clampPct(
        typeof p.acceptanceSimilarityPct === "number" ? p.acceptanceSimilarityPct : 80,
      ),
    },
  ];
}

// eslint-disable-next-line react-refresh/only-export-components -- see above.
export function writeConditions(rule: EditorRule, next: AcceptanceCondition[]): EditorRuleParams {
  const first = next[0];

  return {
    ...(rule.params ?? {}),
    acceptanceConditions: JSON.stringify(next),
    // Mirror the first condition into every legacy flat field so backends
    // still on the old contract keep working. `acceptanceAbsence` is the
    // pre-`acceptancePresence` boolean shape: true iff the primary
    // condition marks the target as "must be absent".
    acceptancePresence: first ? first.presence : PresenceModeType.Ignore,
    acceptanceAbsence: first ? PresenceModeType.isAbsent(first.presence) : false,
    acceptanceTargetColor: first ? first.targetColor : "",
    acceptanceSimilarityPct: first ? first.similarityPct : 80,
  };
}

export interface AcceptancePanelProps {
  rule: EditorRule;
  onUpdateParams: (id: string, params: EditorRuleParams) => void;
}

export function AcceptancePanel({ rule, onUpdateParams }: AcceptancePanelProps): React.JSX.Element | null {
  const list = readConditions(rule);
  const disabled = rule.isLocked;

  const commit = (next: AcceptanceCondition[]) => {
    onUpdateParams(rule.id, writeConditions(rule, next));
  };

  const add = (presence: PresenceModeType) => {
    commit([...list, { id: freshId(), presence, targetColor: "", similarityPct: 80 }]);
  };

  const patch = (idx: number, partial: Partial<AcceptanceCondition>) => {
    const next = list.slice();
    next[idx] = { ...next[idx], ...partial };
    commit(next);
  };

  const remove = (idx: number) => {
    const next = list.slice();
    next.splice(idx, 1);
    commit(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;

    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    commit(next);
  };

  return (
    <section
      aria-label="Rule acceptance criteria"
      className="editor-acceptance-panel"
      data-testid="properties-acceptance-panel"
    >
      <header className="editor-acceptance-toolbar">
        <AddConditionSplit onAdd={add} disabled={disabled} />
      </header>

      {list.length === 0 ? (
        <div className="min-h-1" aria-hidden />
      ) : (
        <ol className="editor-acceptance-list">
          {list.map((c, i) => (
            <ConditionRow
              key={c.id}
              index={i}
              total={list.length}
              condition={c}
              disabled={disabled}
              onPatch={(partial) => patch(i, partial)}
              onRemove={() => remove(i)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function AddConditionSplit({
  onAdd,
  disabled,
}: {
  onAdd: (p: PresenceModeType) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pick = (p: PresenceModeType) => {
    onAdd(p);
    setOpen(false);
  };

  return (
    <div className="editor-acceptance-add">
      <button
        type="button"
        onClick={() => onAdd(PresenceModeType.Present)}
        disabled={disabled}
        className="editor-acceptance-add-main"
        title="Add a Present condition"
      >
        <Plus size={11} aria-hidden /> Add condition
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Add condition type"
            title="Pick condition type"
            className="editor-acceptance-add-menu"
          >
            <ChevronDown size={12} aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={4} className="w-40 p-1">
          <MenuItem label="Present" onClick={() => pick(PresenceModeType.Present)} />
          <MenuItem label="Absent" onClick={() => pick(PresenceModeType.Absent)} />
          <MenuItem label="Ignore" onClick={() => pick(PresenceModeType.Ignore)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="editor-acceptance-menu-item">
      <Plus size={10} aria-hidden /> {label}
    </button>
  );
}

interface ConditionRowProps {
  index: number;
  total: number;
  condition: AcceptanceCondition;
  disabled: boolean;
  onPatch: (partial: Partial<AcceptanceCondition>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ConditionRow({
  index,
  total,
  condition,
  disabled,
  onPatch,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ConditionRowProps) {
  const presenceId = useId();
  const colorId = useId();
  const simId = useId();
  const colorOff = !condition.targetColor;

  return (
    <li className="editor-acceptance-condition">
      <div className="editor-acceptance-condition-head">
        <span className="editor-acceptance-index">#{index + 1}</span>
        <span className="editor-acceptance-actions">
          <IconButton label="Move up" onClick={onMoveUp} disabled={disabled || index === 0}>
            <ArrowUp size={12} />
          </IconButton>
          <IconButton
            label="Move down"
            onClick={onMoveDown}
            disabled={disabled || index === total - 1}
          >
            <ArrowDown size={12} />
          </IconButton>
          <IconButton label="Remove condition" onClick={onRemove} disabled={disabled}>
            <Trash2 size={12} />
          </IconButton>
        </span>
      </div>

      <label htmlFor={presenceId} className="editor-acceptance-field">
        Presence
        <select
          id={presenceId}
          value={condition.presence}
          disabled={disabled}
          onChange={(e) => onPatch({ presence: e.target.value as PresenceModeType })}
          className="editor-acceptance-select"
        >
          <option value={PresenceModeType.Present}>Must be present</option>
          <option value={PresenceModeType.Absent}>Must be absent</option>
          <option value={PresenceModeType.Ignore}>Ignore presence</option>
        </select>
      </label>

      <label htmlFor={colorId} className="editor-acceptance-field">
        <span className="editor-acceptance-label-line">
          Target color {colorOff ? <span className="editor-acceptance-muted">(off)</span> : null}
        </span>
        <span className="editor-acceptance-color-row">
          <input
            id={colorId}
            type="color"
            value={condition.targetColor || "#000000"}
            disabled={disabled}
            onChange={(e) => onPatch({ targetColor: e.target.value })}
            className="editor-acceptance-color"
            aria-label="Pick target color"
          />
          <input
            type="text"
            value={condition.targetColor}
            disabled={disabled}
            placeholder="#rrggbb or blank"
            onChange={(e) => onPatch({ targetColor: e.target.value })}
            className="editor-acceptance-text"
            aria-label="Target color hex"
          />
        </span>
      </label>

      <label htmlFor={simId} className="editor-acceptance-field">
        <span className="editor-acceptance-label-line">
          Similarity threshold
          <span aria-hidden className="editor-acceptance-muted">
            ({condition.similarityPct}%)
          </span>
        </span>
        <span className="editor-acceptance-range-row">
          <input
            id={simId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={condition.similarityPct}
            disabled={disabled}
            onChange={(e) => onPatch({ similarityPct: clampPct(Number(e.target.value)) })}
            className="editor-acceptance-range"
            aria-label="Minimum similarity percentage"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={condition.similarityPct}
            disabled={disabled}
            onChange={(e) => onPatch({ similarityPct: clampPct(Number(e.target.value)) })}
            className="editor-acceptance-number"
            aria-label="Minimum similarity percentage"
          />
        </span>
      </label>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="editor-acceptance-icon-button"
    >
      {children}
    </button>
  );
}

function coercePresence(v: unknown): PresenceModeType {
  const val = v as string | null | undefined;

  return PresenceModeType.isPresent(val) || PresenceModeType.isAbsent(val)
    ? (v as PresenceModeType)
    : PresenceModeType.Ignore;
}

function normalize(raw: unknown): AcceptanceCondition | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  return {
    id: typeof r.id === "string" && r.id ? r.id : freshId(),
    presence: coercePresence(r.presence),
    targetColor: typeof r.targetColor === "string" ? r.targetColor : "",
    similarityPct: clampPct(typeof r.similarityPct === "number" ? r.similarityPct : 80),
  };
}

function freshId(): string {
  return `ac-${Math.random().toString(36).slice(2, 10)}`;
}

function clampPct(n: number): number {
  if (Number.isFinite(n) === false) return 0;

  if (n < 0) return 0;

  if (n > 100) return 100;

  return Math.round(n);
}

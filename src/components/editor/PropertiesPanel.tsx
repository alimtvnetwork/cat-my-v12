
export enum PropertiesPanelToneType {
  On = "on",
  Off = "off",
}
import { EditorRuleKindType } from "@/lib/editor/types";
// PropertiesPanel, docked-inspector densification pass 3 (v3.964.0).
//
// Fixes issued in assets/issues/07-properties-panel-verdict-and-bounds-review.md:
// - Identity + meta collapsed into a single 28px row (name, #id, order, kind, hide, lock).
// - Status strip is now inline dot-list (Bounds / Conditions / lock / hidden), 20px, no pills.
// - Verdict bar uses icon+label with a bold active state that reads at a glance.
// - Bounds row reserves a value column; aspect-lock is an icon-only trailing button.
// - Acceptance empty state uses title case and a ghost link (no dashed blue CTA).
// - Mask / Focus / Kind options are grouped under a single "More options" section
//   so an empty rule doesn't stack three collapsed cards.
// - Kind options section header uses the actual kind label (e.g. "Rect options").
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Link2, Link2Off, Lock, Unlock } from "lucide-react";

import { SelectionModeType, PresenceModeType } from "@/lib/enums/editor";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { editorKindLabel } from "@/lib/editor/tools";
import type { EditorRect, EditorRule, EditorRuleKind, EditorRuleParams } from "@/lib/editor/types";
import {
  RULE_NAME_MAX,
  validateRuleBounds,
  validateRuleName,
  hasBoundsError,
  type BoundsErrors,
} from "@/lib/editor/validation";
import { toIntId } from "@/lib/rules/rule-id-alias";
import { RectRuleEditor } from "./rail/RectRuleEditor";
import { CircleRuleEditor } from "./rail/CircleRuleEditor";
import { OcrRuleEditor } from "./rail/OcrRuleEditor";
import { TextRuleEditor } from "./rail/TextRuleEditor";
import { MathRuleEditor } from "./rail/MathRuleEditor";
import { AcceptancePanel, readConditions, writeConditions } from "./panels/AcceptancePanel";
import { MaskPanel } from "./panels/MaskPanel";
import { FocusPanel } from "./panels/FocusPanel";

interface RuleKindOption {
  value: EditorRuleKindType;
  label: string;
}

const KIND_OPTIONS: RuleKindOption[] = [
  { value: EditorRuleKindType.C, label: "ROI" },
  { value: EditorRuleKindType.R, label: "Rect" },
  { value: EditorRuleKindType.K, label: "OCR Anchor" },
  { value: EditorRuleKindType.S, label: "Text" },
  { value: EditorRuleKindType.E, label: "Math" },
];

export interface PropertiesPanelProps {
  rules: readonly EditorRule[];
  selectedIds: readonly string[];
  imageBounds: EditorRect;
  onRename: (id: string, name: string) => void;
  onSetKind: (id: string, kind: EditorRuleKind) => void;
  onUpdateParams: (id: string, params: EditorRuleParams) => void;
  onSetBounds: (id: string, rect: EditorRect) => void;
  onSetHidden: (ids: string[], hidden: boolean) => void;
  onSetLocked: (ids: string[], locked: boolean) => void;
}

export function PropertiesPanel({
  rules,
  selectedIds,
  imageBounds,
  onRename,
  onSetKind,
  onUpdateParams,
  onSetBounds,
  onSetHidden,
  onSetLocked,
}: PropertiesPanelProps) {
  const selected = rules.filter((r) => selectedIds.includes(r.id));

  if (selected.length === 0) {
    return (
      <div className="editor-properties-panel flex flex-col items-center justify-center gap-hmi-2 p-hmi-4 text-center text-ca-ink-muted">
        <p className="text-hmi-body">No layer selected.</p>
        <p className="text-hmi-caption">Pick a rule in the Layers panel to edit its properties.</p>
      </div>
    );
  }

  if (selected.length > 1) {
    const anyVisible = selected.some((r) => !r.isHidden);
    const anyUnlocked = selected.some((r) => !r.isLocked);

    return (
      <div
        className="editor-properties-panel flex flex-col gap-hmi-2 p-hmi-3"
        role="region"
        aria-label="Properties"
      >
        <header className="text-hmi-header text-ca-ink">{selected.length} layers selected</header>
        <button
          type="button"
          className="editor-btn"
          onClick={() =>
            onSetHidden(
              selected.map((r) => r.id),
              anyVisible,
            )
          }
        >
          {anyVisible ? "Hide all" : "Show all"}
        </button>
        <button
          type="button"
          className="editor-btn"
          onClick={() =>
            onSetLocked(
              selected.map((r) => r.id),
              anyUnlocked,
            )
          }
        >
          {anyUnlocked ? "Lock all" : "Unlock all"}
        </button>
      </div>
    );
  }

  const rule = selected[0];
  const order = rules.findIndex((r) => r.id === rule.id) + 1;
  const intId = useMemo(() => {
    try {
      return toIntId(rule.id);
    } catch {
      return null;
    }
  }, [rule.id]);

  const acceptanceList = readConditions(rule);
  const acceptanceCount = acceptanceList.length;
  const maskCount =
    (typeof rule.params?.maskImageUrl === "string" && rule.params.maskImageUrl.length > 0 ? 1 : 0) +
    (typeof rule.params?.shapeSvgPath === "string" && rule.params.shapeSvgPath.length > 0 ? 1 : 0);
  const focusEnabled = rule.params?.focusOverrideEnabled === true;
  const moreCount = maskCount + (focusEnabled ? 1 : 0);
  const boundsErrors = useMemo<BoundsErrors>(
    () => validateRuleBounds(rule, imageBounds),
    [rule, imageBounds],
  );
  const boundsInvalid = hasBoundsError(boundsErrors);

  const addFirstCondition = () => {
    if (rule.isLocked) return;
    const seeded = [
      {
        id: freshVerdictId(),
        presence: PresenceModeType.Present,
        targetColor: "",
        similarityPct: 80,
      },
    ];
    onUpdateParams(rule.id, writeConditions(rule, seeded));
  };

  const kindLabel = editorKindLabel(rule.kind);

  return (
    <div
      className="editor-properties-panel flex min-h-0 flex-col"
      role="region"
      aria-label="Properties"
      data-testid="properties-panel"
    >
      <div className="sticky top-0 z-10 bg-ca-panel">
        <RuleHeader
          rule={rule}
          intId={intId}
          order={order}
          onRename={onRename}
          onSetKind={onSetKind}
          onSetHidden={onSetHidden}
          onSetLocked={onSetLocked}
        />
      </div>

      <div
        className="editor-properties-scroll flex min-h-0 flex-1 flex-col gap-hmi-2 overflow-y-auto p-hmi-2"
        data-testid="properties-panel-scroll"
        style={{ scrollbarGutter: "stable" }}
      >
        <div
          className="editor-properties-card"
          data-tone={boundsInvalid ? "err" : "ok"}
          data-inspector-section="bounds"
          data-testid="properties-bounds-card"
          id="inspector-section-bounds"
        >
          <section className="editor-properties-section" aria-labelledby="properties-bounds-title">
            <header className="editor-properties-section-head">
              <span id="properties-bounds-title" className="editor-properties-section-title">
                Bounds
              </span>
              <span
                className="editor-properties-inline-status"
                data-tone={boundsInvalid ? "err" : "ok"}
              >
                {boundsInvalid ? "invalid" : "ok"}
              </span>
            </header>
            <div className="editor-properties-section-body" data-testid="properties-bounds-body">
              <BoundsRow
                rule={rule}
                imageBounds={imageBounds}
                onSetBounds={onSetBounds}
                errors={boundsErrors}
              />
            </div>
          </section>
        </div>

        <div
          className="editor-properties-card"
          data-tone={acceptanceCount > 0 ? "ok" : "warn"}
          data-inspector-section="acceptance"
          data-testid="properties-acceptance-card"
          id="inspector-section-acceptance"
        >
          {acceptanceCount === 0 ? (
            <div className="editor-properties-empty-row" role="group" aria-label="Acceptance">
              <span className="editor-properties-empty-label">Acceptance</span>
              <span className="editor-properties-empty-value">no rules yet</span>
              <button
                type="button"
                className="editor-properties-empty-link"
                onClick={addFirstCondition}
                disabled={rule.isLocked}
              >
                + Add condition
              </button>
            </div>
          ) : (
            <section
              className="editor-properties-section"
              aria-labelledby="properties-acceptance-title"
            >
              <header className="editor-properties-section-head">
                <span id="properties-acceptance-title" className="editor-properties-section-title">
                  Acceptance
                </span>
                <CountBadge n={acceptanceCount} tone="on" />
              </header>
              <div
                className="editor-properties-section-body"
                data-testid="properties-acceptance-body"
              >
                <AcceptancePanel rule={rule} onUpdateParams={onUpdateParams} />
              </div>
            </section>
          )}
        </div>

        <div
          className="editor-properties-card"
          data-tone="muted"
          data-inspector-section="more"
          data-testid="properties-more-card"
          id="inspector-section-more"
        >
          <MoreOptionsTabs
            rule={rule}
            kindLabel={kindLabel}
            maskCount={maskCount}
            focusEnabled={focusEnabled}
            onUpdateParams={onUpdateParams}
          />
        </div>

        {/* v3.982: removed StatusLegend. Tone colors are already shown on each
            card's left stripe + Verdict pill, so the legend was redundant
            chrome that ate ~48px of scarce panel height. */}
      </div>
    </div>
  );
}

function freshVerdictId(): string {
  return `ac-${Math.random().toString(36).slice(2, 10)}`;
}

function CountBadge({ n, tone, label }: { n: number; tone: PropertiesPanelToneType; label?: string }) {
  return (
    <span
      className="editor-properties-badge"
      data-tone={tone}
      aria-label={`${n} item${n === 1 ? "" : "s"}`}
    >
      {label ?? n}
    </span>
  );
}

function RuleHeader({
  rule,
  intId,
  order,
  onRename,
  onSetKind,
  onSetHidden,
  onSetLocked,
}: {
  rule: EditorRule;
  intId: number | null;
  order: number;
  onRename: (id: string, name: string) => void;
  onSetKind: (id: string, kind: EditorRuleKind) => void;
  onSetHidden: (ids: string[], hidden: boolean) => void;
  onSetLocked: (ids: string[], locked: boolean) => void;
}) {
  const [name, setName] = useState(rule.name);
  useEffect(() => setName(rule.name), [rule.id, rule.name]);
  const nameError = validateRuleName(name);
  const commit = () => {
    if (nameError) {
      console.warn("[PropertiesPanel] rename rejected", { ruleId: rule.id, nameError });

      return;
    }

    const trimmed = name.trim();

    if (trimmed !== rule.name) onRename(rule.id, trimmed);
  };
  const nameErrId = `rule-name-error-${rule.id}`;

  return (
    <section aria-label="Rule identity" className="editor-properties-identity">
      <div className="editor-properties-identity-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            switch (e.key) {
              case KeyboardKeyType.Enter:
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
                break;
            }
          }}
          placeholder="Name"
          className={`editor-properties-name ${nameError ? "is-invalid" : ""}`}
          maxLength={RULE_NAME_MAX + 20}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? nameErrId : undefined}
          title={nameError ?? `Name (${name.trim().length}/${RULE_NAME_MAX})`}
          aria-label={`Name of ${editorKindLabel(rule.kind)}`}
        />
        {intId != null ? (
          <span
            className="editor-properties-meta-chip"
            data-role="id"
            title="Integer alias id used in the URL"
          >
            #{intId}
          </span>
        ) : null}
        <span className="editor-properties-meta-chip" data-role="order" title="Execution order">
          <span aria-hidden>≡</span>
          {order}
        </span>
        <select
          value={rule.kind}
          onChange={(e) => onSetKind(rule.id, e.target.value as EditorRuleKind)}
          className="editor-properties-kind"
          disabled={rule.isLocked}
          aria-label="Rule kind"
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="editor-properties-meta-btn"
          onClick={() => onSetHidden([rule.id], !rule.isHidden)}
          aria-pressed={rule.isHidden}
          title={rule.isHidden ? "Show" : "Hide"}
        >
          {rule.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          type="button"
          className="editor-properties-meta-btn"
          onClick={() => onSetLocked([rule.id], !rule.isLocked)}
          aria-pressed={rule.isLocked}
          title={rule.isLocked ? "Unlock" : "Lock"}
        >
          {rule.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      </div>
      {nameError ? (
        <span id={nameErrId} role="alert" className="text-hmi-caption text-ca-ng">
          {nameError}
        </span>
      ) : null}
    </section>
  );
}

function BoundsRow({
  rule,
  imageBounds,
  onSetBounds,
  errors,
}: {
  rule: EditorRule;
  imageBounds: EditorRect;
  onSetBounds: (id: string, rect: EditorRect) => void;
  errors: BoundsErrors;
}) {
  const [aspectLocked, setAspectLocked] = useState(false);
  const patch = (next: Partial<EditorRect>) => {
    if (rule.isLocked) return;
    let width = next.width ?? rule.width;
    let height = next.height ?? rule.height;

    if (aspectLocked && (next.width !== undefined || next.height !== undefined)) {
      const ratio = rule.width > 0 && rule.height > 0 ? rule.width / rule.height : 1;

      if (next.width !== undefined) height = Math.max(1, Math.round(next.width / ratio));
      else if (next.height !== undefined) width = Math.max(1, Math.round(next.height * ratio));
    }

    const rect: EditorRect = {
      x: next.x ?? rule.x,
      y: next.y ?? rule.y,
      width,
      height,
    };
    onSetBounds(rule.id, rect);
  };

  return (
    <section
      aria-label="Rule bounds"
      className="editor-properties-bounds"
      title={`Image ${Math.round(imageBounds.width)}×${Math.round(imageBounds.height)}`}
    >
      <InlineNumber
        label="X"
        value={rule.x}
        error={errors.x}
        disabled={rule.isLocked}
        onChange={(v) => patch({ x: v })}
      />
      <InlineNumber
        label="Y"
        value={rule.y}
        error={errors.y}
        disabled={rule.isLocked}
        onChange={(v) => patch({ y: v })}
      />
      <InlineNumber
        label="W"
        value={rule.width}
        min={1}
        error={errors.width}
        disabled={rule.isLocked}
        onChange={(v) => patch({ width: v })}
      />
      <InlineNumber
        label="H"
        value={rule.height}
        min={1}
        error={errors.height}
        disabled={rule.isLocked}
        onChange={(v) => patch({ height: v })}
      />
      <button
        type="button"
        className="editor-properties-aspect-btn"
        aria-pressed={aspectLocked}
        aria-label={aspectLocked ? "Aspect locked" : "Lock aspect ratio"}
        data-active={aspectLocked ? "true" : undefined}
        onClick={() => setAspectLocked((v) => !v)}
        title={aspectLocked ? "Aspect locked" : "Lock aspect ratio"}
        disabled={rule.isLocked}
      >
        {aspectLocked ? <Link2 size={12} /> : <Link2Off size={12} />}
      </button>
      {hasBoundsError(errors) ? (
        <p role="alert" className="editor-properties-bounds-error text-hmi-caption text-ca-ng">
          Fix the highlighted fields before running or saving.
        </p>
      ) : null}
    </section>
  );
}

function InlineNumber({
  label,
  value,
  min,
  disabled,
  error,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  disabled?: boolean;
  error?: string | null;
  onChange: (v: number) => void;
}) {
  const errId = `num-${label}-error`;
  const dragRef = useRef<{ startX: number; startValue: number } | null>(null);
  const onLabelPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (disabled) return;
    (e.currentTarget as HTMLSpanElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startValue: Math.round(value) };
  };
  const onLabelPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    let next = dragRef.current.startValue + Math.round(dx);

    if (min !== undefined && next < min) next = min;
    onChange(next);
  };
  const onLabelPointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLSpanElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <label className={`editor-properties-num ${error ? "is-invalid" : ""}`}>
      <span
        className="editor-properties-num-label"
        role="slider"
        tabIndex={-1}
        aria-label={`${label} drag-to-scrub`}
        onPointerDown={onLabelPointerDown}
        onPointerMove={onLabelPointerMove}
        onPointerUp={onLabelPointerUp}
        onPointerCancel={onLabelPointerUp}
        title={`Drag to scrub ${label}`}
      >
        {label}
      </span>
      <input
        type="number"
        step={1}
        value={Number.isFinite(value) ? Math.round(value) : 0}
        min={min}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);

          if (Number.isFinite(n)) onChange(Math.round(n));
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        title={error ?? undefined}
        aria-label={label}
      />
      <span className="editor-properties-num-suffix" aria-hidden>
        px
      </span>
      {error ? (
        <span id={errId} role="alert" className="sr-only">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function KindEditor({
  rule,
  onUpdateParams,
}: {
  rule: EditorRule;
  onUpdateParams: (id: string, params: EditorRuleParams) => void;
}) {
  switch (rule.kind) {
    case "R":

      return <RectRuleEditor rule={rule} onChange={onUpdateParams} />;
    case "C":

      return <CircleRuleEditor rule={rule} onChange={onUpdateParams} />;
    case "K":

      return <OcrRuleEditor rule={rule} onChange={onUpdateParams} />;
    case "S":

      return <TextRuleEditor rule={rule} onChange={onUpdateParams} />;
    case "E":

      return <MathRuleEditor rule={rule} onChange={onUpdateParams} />;
    default:

      return null;
  }
}

export enum MoreTabType {
  Mask = "mask",
  Focus = "focus",
  Kind = "kind",
}
export type MoreTab = MoreTabType;

function getInitialMoreTab(maskCount: number, focusEnabled: boolean): MoreTab {
  if (maskCount > 0) return MoreTabType.Mask;

  if (focusEnabled) return MoreTabType.Focus;

  return MoreTabType.Mask;
}

function MoreOptionsTabs({
  rule,
  kindLabel,
  maskCount,
  focusEnabled,
  onUpdateParams,
}: {
  rule: EditorRule;
  kindLabel: string;
  maskCount: number;
  focusEnabled: boolean;
  onUpdateParams: (id: string, params: EditorRuleParams) => void;
}) {
  const initial: MoreTab = getInitialMoreTab(maskCount, focusEnabled);
  const [tab, setTab] = useState<MoreTab>(initial);
  interface MoreTabItem {
    id: MoreTabType;
    label: string;
    badge?: React.ReactNode;
  }

  const tabs: MoreTabItem[] = [
    {
      id: MoreTabType.Mask,
      label: "Mask",
      badge: <CountBadge n={maskCount} tone={maskCount > 0 ? "on" : "off"} />,
    },
    {
      id: MoreTabType.Focus,
      label: "Focus",
      badge: (
        <CountBadge
          n={focusEnabled ? 1 : 0}
          tone={focusEnabled ? "on" : "off"}
          label={focusEnabled ? "on" : "off"}
        />
      ),
    },
    { id: MoreTabType.Kind, label: `${kindLabel} options` },
  ];

  return (
    <section aria-label="More options" data-panel-section="properties.more">
      <div className="editor-properties-more-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-pressed={tab === t.id}
            aria-selected={tab === t.id}
            className="editor-properties-more-tab"
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
            {t.badge}
          </button>
        ))}
      </div>
      <div className="editor-properties-more-body" role="tabpanel">
        {tab === "mask" ? <MaskPanel rule={rule} onUpdateParams={onUpdateParams} /> : null}
        {tab === "focus" ? <FocusPanel rule={rule} onUpdateParams={onUpdateParams} /> : null}
        {tab === "kind" ? <KindEditor rule={rule} onUpdateParams={onUpdateParams} /> : null}
      </div>
    </section>
  );
}
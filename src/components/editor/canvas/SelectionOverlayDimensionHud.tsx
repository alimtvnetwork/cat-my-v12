import type { RefObject } from "react";
import { BadgeNumberField } from "./BadgeNumberField";
import { InlineEdit, type InlineEditHandle } from "@/components/ui/InlineEdit";
import { IMAGE_BOUNDS } from "@/lib/editor/coords";
import type { EditorRule } from "@/lib/editor/types";

interface Props {
  rule: EditorRule;
  tl: { x: number; y: number };
  br: { x: number; y: number };
  ringColor: string;
  onResize: (id: string, rect: { x: number; y: number; width: number; height: number }) => void;
  roiPreviewSharpen: boolean;
  toggleRoiPreviewSharpen: () => void;
  renameRef: RefObject<InlineEditHandle | null>;
  setRuleName: (id: string, name: string) => void;
}

export function SelectionOverlayDimensionHud({
  rule,
  tl,
  br,
  ringColor,
  onResize,
  roiPreviewSharpen,
  toggleRoiPreviewSharpen,
  renameRef,
  setRuleName,
}: Props): React.JSX.Element | null {
  const needed = 20 /* numeric row */ + 24 /* name row */ + 6;
  const stackAbove = tl.y - needed >= 0;
  const stackTop = stackAbove ? tl.y - needed : br.y + 6;

  return (
    <div
      data-testid="rule-position-badge"
      className="pointer-events-none absolute z-40 flex flex-col items-start gap-1"
      style={{ left: tl.x, top: stackTop }}
    >
      {/* Row 1: compact numeric badges, side by side. */}
      <div className="pointer-events-none flex items-center gap-1">
        <span
          className="pointer-events-auto flex items-center gap-1 whitespace-nowrap rounded-sm border bg-popover/95 px-1.5 py-0.5 font-mono text-[13px] font-medium leading-none text-foreground shadow-sm tabular-nums backdrop-blur-sm"
          style={{ borderColor: ringColor }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="opacity-60">X</span>
          <BadgeNumberField
            value={rule.x}
            ariaLabel="X position (px)"
            min={0}
            max={Math.max(0, IMAGE_BOUNDS.width - rule.width)}
            disabled={rule.isLocked}
            onCommit={(nx) =>
              onResize(rule.id, {
                x: nx,
                y: rule.y,
                width: rule.width,
                height: rule.height,
              })
            }
          />
          <span className="opacity-60">· Y</span>
          <BadgeNumberField
            value={rule.y}
            ariaLabel="Y position (px)"
            min={0}
            max={Math.max(0, IMAGE_BOUNDS.height - rule.height)}
            disabled={rule.isLocked}
            onCommit={(ny) =>
              onResize(rule.id, {
                x: rule.x,
                y: ny,
                width: rule.width,
                height: rule.height,
              })
            }
          />
          <span
            className="ml-0.5 rounded-sm bg-muted/70 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            aria-hidden="true"
          >
            px
          </span>
        </span>
        <span
          data-testid="rule-size-badge"
          className="pointer-events-auto flex items-center gap-1 whitespace-nowrap rounded-sm border bg-popover/95 px-1.5 py-0.5 font-mono text-[13px] font-medium leading-none text-foreground shadow-sm tabular-nums backdrop-blur-sm"
          style={{ borderColor: ringColor }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <BadgeNumberField
            value={rule.width}
            ariaLabel="Width (px)"
            min={8}
            max={Math.max(8, IMAGE_BOUNDS.width - rule.x)}
            disabled={rule.isLocked}
            onCommit={(nw) =>
              onResize(rule.id, {
                x: rule.x,
                y: rule.y,
                width: nw,
                height: rule.height,
              })
            }
          />
          <span className="opacity-60">×</span>
          <BadgeNumberField
            value={rule.height}
            ariaLabel="Height (px)"
            min={8}
            max={Math.max(8, IMAGE_BOUNDS.height - rule.y)}
            disabled={rule.isLocked}
            onCommit={(nh) =>
              onResize(rule.id, {
                x: rule.x,
                y: rule.y,
                width: rule.width,
                height: nh,
              })
            }
          />
          <span
            className="ml-0.5 rounded-sm bg-muted/70 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            aria-hidden="true"
          >
            px
          </span>
        </span>
        {/* Sharpen preview toggle: flips the kind-specific
            backdrop filter on/off so the operator can compare
            the crisp underlying image against the styled
            preview. Persisted in ui-prefs. */}
        <button
          type="button"
          data-testid="rule-sharpen-toggle"
          aria-pressed={roiPreviewSharpen}
          aria-label={
            roiPreviewSharpen
              ? "Sharpen preview on. Click to compare with styled preview."
              : "Styled preview on. Click to sharpen."
          }
          title={
            roiPreviewSharpen
              ? "Sharpen: on (crisp). Click to compare."
              : "Sharpen: off (styled). Click to sharpen."
          }
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            toggleRoiPreviewSharpen();
          }}
          className={`pointer-events-auto whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[13px] font-medium leading-none shadow-sm backdrop-blur-sm hover:brightness-110 ${
            roiPreviewSharpen
              ? "bg-popover/95 text-foreground"
              : "bg-muted/80 text-muted-foreground"
          }`}
          style={{ borderColor: ringColor }}
        >
          {roiPreviewSharpen ? "◈ Sharp" : "◇ Styled"}
        </button>
      </div>
      {/* Row 2: primary name chip, larger + closer to the ROI. */}
      <div className="pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
        <InlineEdit
          ref={renameRef}
          value={rule.name}
          ariaLabel={`Rename ${rule.name}`}
          onCommit={(next) => setRuleName(rule.id, next)}
          disabled={rule.isLocked}
          inputClassName="h-6 rounded-sm border bg-popover px-2 text-[13px] font-semibold leading-none text-foreground shadow-md outline-none focus:ring-2"
          inputStyle={{ borderColor: ringColor, minWidth: 160 }}
        >
          <button
            type="button"
            data-testid="rule-name-chip"
            title="Double-click or F2 to rename"
            aria-label={`Rename ${rule.name}`}
            onDoubleClick={() => renameRef.current?.beginEdit()}
            className="flex h-6 max-w-[280px] items-center gap-1.5 rounded-sm border bg-popover/95 px-2 text-[13px] font-semibold leading-none text-foreground shadow-md backdrop-blur-sm hover:bg-popover"
            style={{ borderColor: ringColor }}
          >
            <span className="font-mono text-[11px] opacity-70">{rule.kind}</span>
            <span className="truncate">{rule.name}</span>
          </button>
        </InlineEdit>
      </div>
    </div>
  );
}

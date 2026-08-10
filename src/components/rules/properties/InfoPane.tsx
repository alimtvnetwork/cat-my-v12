
export enum InfoPaneActionType {
  Lock = "lock",
  Hide = "hide",
  Delete = "delete",
}
// Plan 80 step 19. Info pane wired to live selected ROI from useRulesStore.
// Plan 100 Phase E step 24: multi-select summary. When N > 1 ROIs are
// selected, show a compact aggregate (count, shared kind or "mixed",
// bounding box) so the palette stops going blank on multi-select.
import { PaneShell, Row } from "./paneShell";
import { useSelectedRules } from "@/lib/editor/selection/useSelectedRules";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { logger } from "@/lib/editor/errors";
import { EyeOff, Lock, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PalettePlaceholder } from "../PropertiesPalette";

function fmt(n: number | undefined | null): string {
  if (n == null || Number.isFinite(n) === false) return "-";

  return Math.round(n).toString();
}

export function InfoPane() {
  const selection = useSelectedRules();
  const rule = selection.single;

  const setLocked = useRulesStore((s) => s.setLocked);
  const setHidden = useRulesStore((s) => s.setHidden);
  const deleteRules = useRulesStore((s) => s.deleteRules);

  const runAggregate = (action: InfoPaneActionType) => {
    const ids = [...selection.ids];

    if (ids.length < 2) return;
    logger.info("I_UI_INFO_PANE_AGGREGATE_ACTION", { action, count: ids.length });
    try {
      switch (action) {
        case "lock":
          setLocked(ids, true);
          return;
        case "hide":
          setHidden(ids, true);
          return;
        case "delete":
          deleteRules(ids);
          return;
      }
    } catch (err) {
      logger.error("E_UI_INFO_PANE_AGGREGATE_ACTION_FAILED", {
        action,
        count: ids.length,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Aggregate bounding box for multi-select.
  let bbox: { x: number; y: number; w: number; h: number } | null = null;

  if (selection.mode === "multi") {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const r of selection.rules) {
      if (r.x == null || r.y == null || r.width == null || r.height == null) continue;

      if (r.x < minX) minX = r.x;

      if (r.y < minY) minY = r.y;

      if (r.x + r.width > maxX) maxX = r.x + r.width;

      if (r.y + r.height > maxY) maxY = r.y + r.height;
    }

    if (Number.isFinite(minX) && Number.isFinite(minY)) {
      bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
  }

  return (
    <PaneShell>
      {selection.mode === "single" && rule ? (
        <div className="rounded-sm border border-ca-border/70 bg-ca-panel-2/60 p-hmi-2 space-y-0.5 text-[11px] font-mono tabular-nums">
          <Row label="Name">
            <span className="truncate" title={rule.name}>
              {rule.name}
            </span>
          </Row>
          <Row label="Kind">
            <span>{rule.kind}</span>
          </Row>
          <Row label="X">
            <span>{fmt(rule.x)}</span>
          </Row>
          <Row label="Y">
            <span>{fmt(rule.y)}</span>
          </Row>
          <Row label="W">
            <span>{fmt(rule.width)}</span>
          </Row>
          <Row label="H">
            <span>{fmt(rule.height)}</span>
          </Row>
          <Row label="θ">
            <span>{rule.rotation != null ? `${Math.round(rule.rotation)}°` : "0°"}</span>
          </Row>
        </div>
      ) : selection.mode === "multi" ? (
        <>
          <div
            data-testid="info-pane-multi"
            className="rounded-sm border border-ca-border/70 bg-ca-panel-2/60 p-hmi-2 space-y-0.5 text-[11px] font-mono tabular-nums"
          >
            <Row label="Selected">
              <span>{selection.rules.length}</span>
            </Row>
            <Row label="Kind">
              <span>{selection.sharedKind ?? "mixed"}</span>
            </Row>
            <Row label="X">
              <span>{fmt(bbox?.x)}</span>
            </Row>
            <Row label="Y">
              <span>{fmt(bbox?.y)}</span>
            </Row>
            <Row label="W">
              <span>{fmt(bbox?.w)}</span>
            </Row>
            <Row label="H">
              <span>{fmt(bbox?.h)}</span>
            </Row>
          </div>
          <div
            data-testid="info-pane-multi-actions"
            role="group"
            aria-label="Aggregate ROI actions"
            className="grid grid-cols-2 gap-hmi-1"
          >
            <AggregateButton icon={Lock} label="Lock" onClick={() => runAggregate("lock")} />
            <AggregateButton icon={EyeOff} label="Hide" onClick={() => runAggregate("hide")} />
            <AggregateButton
              icon={Trash2}
              label="Delete"
              onClick={() => runAggregate("delete")}
              destructive
            />
          </div>
        </>
      ) : (
        <PalettePlaceholder hint="Once selected, position, size, and rotation appear here. Badges render directly on the overlay; θ shows above the top-right handle while rotating." />
      )}
      <ul className="space-y-0.5 text-[11px] text-ca-ink-muted">
        <li>
          <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 font-mono">Shift</kbd>{" "}
          lock aspect / snap 15°
        </li>
        <li>
          <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 font-mono">Alt</kbd>{" "}
          resize from center
        </li>
        <li>
          <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 font-mono">⌘/Ctrl</kbd>{" "}
          + drag: duplicate
        </li>
      </ul>
    </PaneShell>
  );
}

interface AggregateButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function AggregateButton({ icon: Icon, label, onClick, destructive }: AggregateButtonProps) {
  return (
    <button
      type="button"
      data-testid={`info-pane-multi-action-${label.toLowerCase()}`}
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-hmi-1 rounded-sm border px-hmi-2 py-[3px] text-[11px] font-medium transition",
        destructive
          ? "border-ca-border text-ca-ng hover:border-ca-ng hover:bg-ca-ng/10"
          : "border-ca-border text-ca-ink hover:border-ca-select hover:bg-ca-panel-2",
      ].join(" ")}
    >
      <Icon size={12} strokeWidth={1.75} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

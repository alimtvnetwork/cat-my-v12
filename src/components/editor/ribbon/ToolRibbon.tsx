import { EditorRuleKindType } from "@/lib/editor/types";
import { Fragment, useEffect } from "react";
import { logger } from "@/lib/editor/errors";
import type { EditorRuleKind } from "@/lib/editor/types";
import { MoreHorizontal, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToolTile } from "@/components/hmi";
import { RibbonChip } from "./RibbonChip";
import { useSeedSlice } from "@/lib/seed";

interface ToolDef {
  kind: EditorRuleKind;
  label: string;
  description: string;
  disabled?: boolean;
}

const tools: (ToolDef & { hotkey: string })[] = [
  {
    kind: EditorRuleKindType.C,
    label: "ROI",
    hotkey: "1",
    description: "Circle region of interest. Drag to place a circular inspection window.",
  },
  {
    kind: EditorRuleKindType.R,
    label: "Rect",
    hotkey: "2",
    description: "Rectangular region. Drag corner to corner to bound a feature.",
  },
  {
    kind: EditorRuleKindType.K,
    label: "OCR",
    hotkey: "3",
    description: "Optical character recognition. Reads printed text inside the box.",
  },
  {
    kind: EditorRuleKindType.S,
    label: "Text",
    hotkey: "4",
    description: "Static text label. Overlays a caption on the reference image.",
  },
  {
    kind: EditorRuleKindType.E,
    label: "Math",
    hotkey: "5",
    description: "Expression rule. Combines other measurements into a computed value.",
  },
];

// Fallback list used when the UI seed facade has not yet loaded, when the
// `toolPresets` slice is empty, or when the ribbon is rendered outside a
// `<SeedProvider>` (isolated unit tests). Keeping the fallback in-source
// guarantees the ribbon is never empty and matches the pre-Plan-72 UX.
const upcomingFallback: ToolDef[] = [
  {
    kind: EditorRuleKindType.R,
    label: "Anchor",
    description:
      "Anchor point. Locks a fiducial so downstream rules track part shift. Coming soon.",
    disabled: true,
  },
  {
    kind: EditorRuleKindType.R,
    label: "Blob",
    description:
      "Connected blob detector. Counts bright or dark clusters above a threshold. Coming soon.",
    disabled: true,
  },
  {
    kind: EditorRuleKindType.R,
    label: "Color",
    description: "Color area. Measures pixel ratio matching a target hue window. Coming soon.",
    disabled: true,
  },
  {
    kind: EditorRuleKindType.R,
    label: "Edge",
    description: "Edge finder. Locates a straight edge and reports position. Coming soon.",
    disabled: true,
  },
  {
    kind: EditorRuleKindType.R,
    label: "Bar",
    description: "1D and 2D barcode reader. Decodes DataMatrix, QR, and Code128. Coming soon.",
    disabled: true,
  },
];

export function ToolRibbon({
  activeKind,
  disabled,
  onKindChange,
  onCreateRule,
}: {
  activeKind: EditorRuleKind;
  disabled: boolean;
  onKindChange: (kind: EditorRuleKind) => void;
  /**
   * Optional. When provided, the ribbon renders a "+" button that creates
   * a new rule of the currently active kind at a caller-chosen location.
   * When omitted, the button is hidden so the ribbon stays a pure picker.
   */
  onCreateRule?: (kind: EditorRuleKind) => void;
}) {
  const commit = (kind: EditorRuleKind) => {
    if (disabled) {
      logger.warn("W_UI_KIND_DISABLED", { kind });

      return;
    }

    onKindChange(kind);
  };
  // Keyboard shortcuts 1-5 select a kind when the operator is not typing.
  useEffect(() => {
    if (disabled) return;
    const isTyping = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;

      if (!el || !el.tagName) return false;
      const tag = el.tagName.toLowerCase();

      return (
        tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      // Shift + <hotkey> creates a fresh rule of that kind (when supported)
      // without converting the current selection.
      if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && onCreateRule) {
        const match = tools.find((t) => t.hotkey === e.key);

        if (!match) return;
        e.preventDefault();
        logger.info("I_UI_KIND_CREATE_HOTKEY", { key: e.key, kind: match.kind });
        onCreateRule(match.kind);

        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const match = tools.find((t) => t.hotkey === e.key);

      if (!match) return;
      e.preventDefault();
      logger.info("I_UI_KIND_HOTKEY", { key: e.key, kind: match.kind });
      onKindChange(match.kind);
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, onKindChange, onCreateRule]);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="editor-tool-ribbon"
        role="radiogroup"
        aria-label="Rule kind"
        data-testid="tool-ribbon"
      >
        {tools.map((t) => {
          // Insert a subtle divider between logical groups:
          // Geometry (ROI, Rect) | Read (OCR, Text) | Compute (Math).
          const showDividerBefore = t.label === "OCR" || t.label === "Math";

          return (
            <Fragment key={t.label}>
              {showDividerBefore ? <hr className="editor-tool-group-divider" aria-hidden /> : null}
              <RibbonChip
                kind={t.kind}
                label={t.label}
                description={t.description}
                active={t.kind === activeKind}
                disabled={disabled}
                onCommit={() => commit(t.kind)}
                size={36}
                compact
                hotkey={t.hotkey}
              />
            </Fragment>
          );
        })}
        <hr className="editor-tool-group-divider" aria-hidden />
        {onCreateRule ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <ToolTile
                icon={<Plus size={16} strokeWidth={2.25} aria-hidden />}
                label="New rule"
                size={36}
                compact
                disabled={disabled}
                aria-label={`Create new ${activeKind} rule`}
                data-testid="tool-ribbon-create"
                onClick={() => {
                  if (disabled) {
                    logger.warn("W_UI_CREATE_DISABLED", { kind: activeKind });

                    return;
                  }

                  logger.info("I_UI_CREATE_CLICK", { kind: activeKind });
                  onCreateRule(activeKind);
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[240px] text-left leading-snug">
              <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                <span>New rule</span>
                <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 py-[1px] text-[10px] font-mono text-ca-ink-muted">
                  Shift+1..5
                </kbd>
              </div>
              <div className="text-[12px] opacity-90">
                Create a rule of the active kind at the image center.
              </div>
            </TooltipContent>
          </Tooltip>
        ) : null}
        <UpcomingTools />
      </div>
    </TooltipProvider>
  );
}

function UpcomingTools() {
  // Read the "upcoming" preview tools from the seed facade so ops can
  // adjust the roadmap teaser by editing `bundle.json` rather than
  // component source. Falls back to the pinned list when the slice is
  // empty / errored / not yet ready, so the popover is never blank.
  const { data: presets, status, error } = useSeedSlice("toolPresets");
  const items: ToolDef[] = (() => {
    if (status === "error") {
      // Seed load failed. Surfaced by SeedProvider already; log the
      // downgrade so the source of the fallback is auditable.
      logger.warn("W_UI_TOOLPRESETS_FALLBACK", {
        reason: "seed-error",
        message: error?.message ?? "unknown",
      });

      return upcomingFallback;
    }

    const list = presets ?? [];
    const seeded = list
      .filter((p) => (p.params as { section?: string } | undefined)?.section === "upcoming")
      .map<ToolDef>((p) => ({
        // ToolDef.kind currently drives icon selection only; upcoming
        // presets are disabled so their kind is cosmetic. Preserve the
        // preset toolId parse when it's `kind:X`, otherwise fall back to R.
        kind: p.toolId.startsWith("kind:")
          ? (p.toolId.slice(5) as EditorRuleKind)
          : EditorRuleKindType.R,
        label: p.label,
        description: p.description ?? "Coming soon.",
        disabled: true,
      }));

    return seeded.length > 0 ? seeded : upcomingFallback;
  })();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <ToolTile
              icon={<MoreHorizontal size={16} strokeWidth={2.25} aria-hidden />}
              label="More tools"
              size={36}
              compact
              aria-label="More tools"
              data-testid="tool-ribbon-more"
            />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[240px] text-left leading-snug">
          <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
            <span>More tools</span>
            <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 py-[1px] text-[10px] font-mono text-ca-ink-muted">
              M
            </kbd>
          </div>
          <div className="text-[12px] opacity-90">
            Upcoming rule kinds: anchor, blob, color, edge, barcode.
          </div>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-56 p-1"
        data-testid="tool-ribbon-more-popover"
      >
        {items.map((t) => (
          <button
            key={t.label}
            type="button"
            disabled
            title={t.description}
            className="editor-tool-more-item"
          >
            <span>{t.label}</span>
            <span aria-hidden>soon</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

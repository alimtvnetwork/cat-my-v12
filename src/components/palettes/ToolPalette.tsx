import { ClientLogger } from "@/lib/observability/client-logger";
import { CommandIdType } from "@/lib/command-bus";
import { EditorRuleKindType } from "@/lib/editor/types";
import { PaletteIdType } from "@/lib/stores/palette-store";
/**
 * Plan 64 step 90: Tool palette listing rule-kind entries.
 *
 * Root cause: the ruleset editor toolbar surfaced a partial subset of kinds
 * and had no single palette listing every authorable rule kind, so keyboard
 * V/R/C/M/T/O/B/F/J hotkeys and the Command Palette action `cmd:add-rule`
 * had no visible target and users could not discover the full set.
 *
 * Coverage: today the editor type union is C/R/K/S/E (5 kinds). Spec 09
 * enumerates 10 kinds (Text/OCR, Barcode, Colour, Shape, Mask, Presence,
 * Measurement, Count, Compare, Custom); the additional five are placeholder
 * entries surfaced as "coming soon" so the palette shell is stable when the
 * type union is extended.
 */
import { MoreHorizontal } from "lucide-react";
import { PaletteFrame } from "@/components/app-shell/PaletteFrame";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KIND_ICON, KIND_COLOR } from "@/lib/editor/kind-icons";
import { editorKindLabel } from "@/lib/editor/tools";
import { emitCommand } from "@/lib/command-bus";
import type { EditorRuleKind } from "@/lib/editor/types";

const ACTIVE_KINDS: EditorRuleKind[] = [
  EditorRuleKindType.C,
  EditorRuleKindType.R,
  EditorRuleKindType.K,
  EditorRuleKindType.S,
  EditorRuleKindType.E,
];

export enum AddRulePresetType {
  R = "R",
  C = "C",
  B = "B",
  F = "F",
  J = "J",
}
export type AddRulePreset = AddRulePresetType;

// Command bus `cmd:add-rule` currently accepts a preset alphabet that
// overlaps EditorRuleKind at C/R only. K/S/E have no preset today so their
// click is a no-op with a console note until the alphabet is extended.
const KIND_PRESET: Partial<Record<EditorRuleKind, AddRulePreset>> = {
  C: AddRulePresetType.C,
  R: AddRulePresetType.R,
};

interface PendingEntry {
  key: string;
  label: string;
}

const PENDING_KINDS: PendingEntry[] = [
  { key: "barcode", label: "Barcode" },
  { key: "colour", label: "Colour" },
  { key: "mask", label: "Mask" },
  { key: "presence", label: "Presence" },
  { key: "count", label: "Count" },
];

export function ToolPalette(): React.JSX.Element | null {
  return (
    <PaletteFrame id={PaletteIdType.Tools} title="Tools">
      {/* Plan 65 step 25: chrome tightened + overflow moved behind "More". */}
      <ul
        aria-label="Rule kinds"
        className="grid grid-cols-2 gap-1 p-2"
        data-testid="tool-palette-primary"
      >
        {ACTIVE_KINDS.map((k) => {
          const Icon = KIND_ICON[k];
          const color = KIND_COLOR[k];

          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => {
                  const preset = KIND_PRESET[k];

                  if (preset) emitCommand(CommandIdType.CmdAddRule, { preset });
                  else ClientLogger.info("[ToolPalette] no preset mapped for kind", k);
                }}
                aria-label={`Add ${editorKindLabel(k)} rule`}
                className="hmi-focus-ring flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-hmi-body text-ca-ink hover:bg-ca-select/30"
              >
                <span
                  aria-hidden
                  className="inline-flex h-6 w-6 items-center justify-center rounded-sm"
                  style={{ color }}
                >
                  <Icon size={16} strokeWidth={2.25} />
                </span>
                <span className="truncate">{editorKindLabel(k)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-ca-border p-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`More rule kinds (${PENDING_KINDS.length} coming soon)`}
              data-testid="tool-palette-more"
              className="hmi-focus-ring flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-hmi-body text-ca-ink-muted hover:bg-ca-select/30"
            >
              <span className="inline-flex items-center gap-2">
                <MoreHorizontal size={16} aria-hidden />
                More
              </span>
              <span aria-hidden className="text-hmi-caption">
                {PENDING_KINDS.length}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            className="w-56 p-1"
            data-testid="tool-palette-more-popover"
          >
            <ul aria-label="Rule kinds, coming soon" className="flex flex-col">
              {PENDING_KINDS.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    disabled
                    aria-label={`${p.label} rule, not yet available`}
                    title="Not yet available"
                    className="flex w-full cursor-not-allowed items-center gap-2 rounded-sm px-2 py-1.5 text-hmi-body text-ca-ink-muted opacity-60"
                  >
                    <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-ca-ink-muted" />
                    </span>
                    <span className="truncate">{p.label}</span>
                    <span aria-hidden className="ml-auto text-hmi-caption">
                      soon
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </PaletteFrame>
  );
}

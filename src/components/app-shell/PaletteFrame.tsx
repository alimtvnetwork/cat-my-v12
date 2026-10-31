import { ClientLogger } from "@/lib/observability/client-logger";
import { PaletteModeType } from "@/lib/stores/palette-store";
/**
 * Plan 64 step 63: chrome for a detachable palette.
 * Wraps arbitrary children with title-bar + min/max/close-to-dock buttons.
 * Double-click title-bar toggles maximize.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Minus, Square, X, Maximize2, RotateCcw } from "lucide-react";
import { usePaletteStore, type PaletteId } from "@/lib/stores/palette-store";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaletteFrameProps {
  id: PaletteId;
  title: string;
  children: ReactNode;
}

export function PaletteFrame({ id, title, children }: PaletteFrameProps): React.JSX.Element | null {
  const state = usePaletteStore((s) => s.states[id]);
  const hydrated = usePaletteStore((s) => s.hydrated);
  const setState = usePaletteStore((s) => s.set);
  const hydrate = usePaletteStore((s) => s.hydrate);
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  // Defect 2 (spec 03 §1.2): hidden used to render nothing, so a hidden
  // palette had no in-panel restore path — recovery depended on the Window
  // menu (the other panel system, which has no palette entries) or Reset
  // Layout. The palette now renders a one-row strip in its own slot with a
  // Show button that docks it again. VISUAL CHANGE, flagged: a hidden
  // palette occupies one header-height row instead of collapsing to
  // nothing; docked / minimized / maximized rendering is untouched.
  if (state.mode === "hidden") {
    return (
      <section
        aria-label={title}
        data-palette-id={id}
        data-palette-mode="hidden"
        className="flex min-h-0 flex-col overflow-hidden rounded-md border border-ca-border bg-ca-panel"
      >
        <header
          className="flex items-center justify-between border-b border-ca-border bg-ca-chrome/60 px-2"
          style={{ height: "var(--menu-item-h)" }}
        >
          <span className="truncate text-hmi-body font-medium text-ca-chrome-ink">{title}</span>
          <button
            type="button"
            aria-label={`Show ${title}`}
            title={`Show ${title}`}
            onClick={() => setState(id, { mode: PaletteModeType.Docked })}
            className="hmi-focus-ring inline-flex h-6 items-center rounded-sm px-2 text-hmi-body text-ca-ink hover:bg-ca-select/40"
          >
            Show
          </button>
        </header>
      </section>
    );
  }

  const toggleMax = () =>
    setState(id, {
      mode:
        state.mode === PaletteModeType.Maximized
          ? PaletteModeType.Docked
          : PaletteModeType.Maximized,
    });

  return (
    <section
      aria-label={title}
      data-palette-id={id}
      data-palette-mode={state.mode}
      className="flex min-h-0 flex-col overflow-hidden rounded-md border border-ca-border bg-ca-panel"
    >
      <header
        className="flex items-center justify-between border-b border-ca-border bg-ca-chrome/60 px-2"
        style={{ height: "var(--menu-item-h)" }}
        onDoubleClick={toggleMax}
      >
        <span className="truncate text-hmi-body font-medium text-ca-chrome-ink">{title}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Minimize"
            title="Minimize"
            onClick={() => setState(id, { mode: PaletteModeType.Minimized })}
            className="hmi-focus-ring inline-flex h-6 w-6 items-center justify-center rounded-sm hover:bg-ca-select/40"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={state.mode === "maximized" ? "Restore" : "Maximize"}
            title={state.mode === "maximized" ? "Restore" : "Maximize"}
            onClick={toggleMax}
            className="hmi-focus-ring inline-flex h-6 w-6 items-center justify-center rounded-sm hover:bg-ca-select/40"
          >
            {state.mode === "maximized" ? (
              <Square className="h-3 w-3" aria-hidden />
            ) : (
              <Maximize2 className="h-3 w-3" aria-hidden />
            )}
          </button>
          <button
            type="button"
            aria-label="Dock"
            title="Close to dock"
            onClick={() => setState(id, { mode: PaletteModeType.Docked })}
            className="hmi-focus-ring inline-flex h-6 w-6 items-center justify-center rounded-sm hover:bg-ca-select/40"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </header>
      {state.mode !== "minimized" ? (
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      ) : null}
    </section>
  );
}

export function ResetLayoutButton(): React.JSX.Element | null {
  const reset = usePaletteStore((s) => s.reset);
  const resetWorkspaceLayout = useWorkspaceLayoutStore((s) => s.resetLayout);
  const [open, setOpen] = useState(false);

  // Plan 65 step 18: guard the destructive Reset Layout action with an
  // AlertDialog confirm so a misclick on the header does not silently
  // wipe a custom dock/float/minimize layout the operator built.
  // Plan 65 step 23: widen scope so "Reset Layout" also restores the
  // workspace-layout store (panel dock slots + dock sizes). Previously the
  // button only cleared `palette.layout.v1`, leaving `workspace-layout:v1`
  // panel positions untouched, which is why the reset felt partial. See
  // .ai-memory/plans/layout-persistence-audit.md.
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hmi-focus-ring inline-flex items-center gap-1 rounded-sm px-2 py-1 text-hmi-body text-ca-ink hover:bg-ca-select/40"
        title="Reset palette layout"
        aria-label="Reset palette layout"
      >
        <RotateCcw aria-hidden className="h-4 w-4" />
        <span className="hidden sm:inline">Reset Layout</span>
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset workspace layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores every panel to its default dock, size, and open state, including
              floating palette positions, minimized state, and dock slot widths. Your current
              arrangement will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset();
                resetWorkspaceLayout();
                ClientLogger.info("[reset-layout] palette + workspace layout reset");
                setOpen(false);
              }}
              data-testid="confirm-reset-layout"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

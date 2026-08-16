import { CommandIdType } from "@/lib/command-bus";
import { PaletteIdType, PaletteModeType } from "@/lib/stores/palette-store";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Titlebar, ModeHeader, ActionBar, StatusBar, type TitlebarProps } from "@/components/hmi";
import { FavoritesBar } from "@/components/nav/FavoritesBar";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { useHotkeys } from "@/hooks/useHotkeys";
import { emitCommand } from "@/lib/command-bus";
import { usePaletteStore } from "@/lib/stores/palette-store";
import { useShortcutsStore } from "@/lib/stores/shortcuts-store";

export interface HmiShellProps {
  program?: TitlebarProps["program"];
  titlebarRight?: TitlebarProps["right"];
  title: string;
  headerActions?: ReactNode;
  actionBarLeft?: ReactNode;
  actionBarRight?: ReactNode;
  statusBarLeft?: ReactNode;
  statusBarRight?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
  hideHeader?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function HmiShell({
  program,
  titlebarRight,
  title,
  headerActions,
  actionBarLeft,
  actionBarRight,
  statusBarLeft,
  statusBarRight,
  children,
  hideNav = false,
  hideHeader = false,
  className,
  style,
}: HmiShellProps) {
  const showActionBar = Boolean(actionBarLeft || actionBarRight);
  const showStatusBar = useUiPrefsStore((s) => s.showStatusBar);
  const navigate = useNavigate();
  const bindings = useShortcutsStore((s) => s.bindings);

  /**
   * Plan 64 step 94: global V/R/C/M/T/O/B/F/J hotkeys.
   *
   * `useHotkeys` already skips events whose target is an INPUT / TEXTAREA /
   * SELECT / contenteditable, so typing in a name field or Monaco does not
   * fire these. Each key emits a bus command so the currently mounted route
   * (typically the ruleset editor) can act on it locally. `T` toggles the
   * Tools palette here as a fallback so it works even outside the editor.
   */
  useHotkeys(
    useMemo(
      () => [
        { combo: bindings["validate"], handler: () => emitCommand(CommandIdType.CmdValidate) },
        {
          combo: bindings["add-rule-rect"],
          handler: () => emitCommand(CommandIdType.CmdAddRule, { preset: "R" }),
        },
        {
          combo: bindings["add-rule-circle"],
          handler: () => emitCommand(CommandIdType.CmdAddRule, { preset: "C" }),
        },
        { combo: bindings["design-mode"], handler: () => emitCommand(CommandIdType.CmdDesignMode) },
        {
          combo: bindings["toggle-tools"],
          handler: () => {
            const store = usePaletteStore.getState();
            const tools = store.states.tools;
            const next =
              tools.mode === PaletteModeType.Hidden
                ? PaletteModeType.Docked
                : PaletteModeType.Hidden;
            store.set(PaletteIdType.Tools, { mode: next });
            emitCommand(CommandIdType.CmdTogglePanel);
          },
        },
        {
          combo: bindings["open-recent"],
          handler: () => {
            emitCommand(CommandIdType.CmdOpenRecent);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigate({ to: "/projects" as any });
          },
        },
        {
          combo: bindings["add-rule-blob"],
          handler: () => emitCommand(CommandIdType.CmdAddRule, { preset: "B" }),
        },
        {
          combo: bindings["add-rule-flaw"],
          handler: () => emitCommand(CommandIdType.CmdAddRule, { preset: "F" }),
        },
        {
          combo: bindings["add-rule-js"],
          handler: () => emitCommand(CommandIdType.CmdAddRule, { preset: "J" }),
        },
      ],
      [bindings, navigate],
    ),
  );

  // Plan 65 SS-04 / issue 22: keep exactly one app header. The global
  // menu now lives inside `Titlebar`, not as a second stacked row.
  const right = titlebarRight;
  /**
   * Plan 88 Step 2: expose the *effective* status-bar height as a CSS var
   * on the shell root so descendant overlays (floating panels, toasts,
   * collapsed rails from Steps 3-8) can reserve space with a single
   * `bottom: var(--status-bar-h-effective)` rule without measuring the
   * DOM. Resolves to 0px when the operator hid the status bar via
   * View -> Toggle Status Bar (Ctrl+/), and back to `--status-bar-h`
   * (2rem) when it is shown. Kept on the shell root (not :root) so a
   * different shell instance in a portal test can override it.
   */
  const shellStyle = {
    "--status-bar-h-effective": showStatusBar ? "var(--status-bar-h)" : "0px",
  } as CSSProperties;

  return (
    <div
      data-testid="hmi-shell"
      style={shellStyle}
      className="flex flex-col h-screen bg-ca-bg text-ca-ink font-hmi antialiased"
    >
      <Titlebar program={program} right={right} showBreadcrumb={!hideNav} />
      {hideHeader ? null : <ModeHeader title={title} actions={headerActions} />}
      {hideNav || hideHeader ? null : <FavoritesBar />}
      <main
        id="app-main"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-ca-border focus:outline-none"
      >
        {children}
      </main>
      {showActionBar ? <ActionBar left={actionBarLeft} right={actionBarRight} /> : null}
      {showStatusBar ? <StatusBar /> : null}
    </div>
  );
}

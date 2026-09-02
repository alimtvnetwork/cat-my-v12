import type { ReactNode } from "react";
import { BugErrorModal } from "@/components/BugErrorModal";
import { ErrorDialogProvider } from "@/components/errors/ErrorDialogProvider";
import { GlobalErrorModal } from "@/components/errors/GlobalErrorModal";
import { IpcErrorBridge } from "@/lib/errors/ipcErrorBridge";
import { ErrorHistoryDrawer } from "@/components/errors/ErrorHistoryDrawer";
import { Toaster } from "@/components/ui/sonner";
import { RunningPill } from "@/components/app-shell/RunningPill";
import { GlobalCliStatusWidget } from "@/components/cli/GlobalCliStatusWidget";
import { AgentLogo } from "@/components/cli/AgentLogo";
import { CliLiveRegionHost } from "@/components/cli/LiveRegion";
import { CommandPalette } from "@/components/nav/CommandPalette";
import { ShortcutsDialog } from "@/components/nav/ShortcutsDialog";
import { LayoutHotkeys } from "@/components/app-shell/LayoutHotkeys";
import { ShortcutProvider } from "@/components/shortcuts/ShortcutProvider";
import { ShortcutCheatSheet } from "@/components/shortcuts/ShortcutCheatSheet";
import { AltMnemonicLayer } from "@/components/shortcuts/AltMnemonicLayer";
import { InputModalityTracker } from "@/hooks/useInputModality";
import { InlineEditNavigationGuard } from "@/components/shell/InlineEditNavigationGuard";
import { LiveAnnouncer } from "@/components/a11y/LiveAnnouncer";
import { GlobalHomeAffordance } from "@/components/nav/GlobalHomeAffordance";
import { AppShellNav } from "@/components/app-shell/nav";
import { AppShellSidebar } from "@/components/app-shell/sidebar";
import { useUiPrefsStore, UiFlavorType } from "@/lib/stores/ui-prefs-store";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";

export function RootShellLayout({ children }: { children: ReactNode }) {
  const uiFlavor = useUiPrefsStore((s) => s.uiFlavor);
  const { mode } = useUiMode();
  const isModern = mode === UiModeType.Modern && uiFlavor === UiFlavorType.Modern;

  return (
    <>
      {children}
      <BugErrorModal />
      <ErrorDialogProvider />
      <GlobalErrorModal />
      <IpcErrorBridge />
      <ErrorHistoryDrawer />
      <Toaster />
      <RunningPill />
      <GlobalCliStatusWidget />
      <AgentLogo />
      <CliLiveRegionHost />
      <CommandPalette />
      <ShortcutsDialog />
      <LayoutHotkeys />
      <ShortcutProvider />
      <ShortcutCheatSheet />
      <AltMnemonicLayer />
      <InputModalityTracker />
      <InlineEditNavigationGuard />
      <LiveAnnouncer />
      {isModern ? (
        <>
          <GlobalHomeAffordance />
          <AppShellNav />
          <AppShellSidebar />
        </>
      ) : null}
    </>
  );
}

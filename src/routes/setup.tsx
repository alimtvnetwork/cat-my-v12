import { RunStatusType } from "@/types/run/RunStatus";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import {
  SetupErrorComponent,
  SetupNotFoundComponent,
} from "@/components/editor/setup/SetupBoundaries";
import { useRunStore } from "@/lib/stores/run-store";
import { HmiShell } from "@/components/hmi";
import { WorkerHealthBanner } from "@/components/editor/validation/WorkerHealthBanner";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";

export const Route = createFileRoute("/setup")({
  beforeLoad: () => {
    if (RunStatusType.isRunning(useRunStore.getState().status)) {
      throw redirect({ to: "/run" });
    }
  },
  component: SetupLayout,
  errorComponent: SetupErrorComponent,
  notFoundComponent: SetupNotFoundComponent,
});

function SetupLayout() {
  const { mode } = useUiMode();

  // In Standard Mode, each /setup subroute provides its own StandardAppShell
  // with the dedicated Standard HMI navigation and breadcrumbs. Bypassing
  // HmiShell prevents duplicate top menus, double headers, and double mode switches.
  if (mode === UiModeType.Standard) {
    return (
      <>
        <Outlet />
        <WorkerHealthBanner testId="setup-worker-health-banner" />
      </>
    );
  }

  // Wrap every /setup subroute in the same shell chrome the Home page uses.
  // Worker health surfaces as a small floating, dismissible card pinned
  // top-right near the breadcrumb/menu, so the chrome stays clean.
  return (
    <HmiShell title="Setup" hideHeader>
      <Outlet />
      <WorkerHealthBanner testId="setup-worker-health-banner" />
    </HmiShell>
  );
}

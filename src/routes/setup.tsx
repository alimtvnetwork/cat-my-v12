import { RunStatusType } from "@/types/run/RunStatus";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import {
  SetupErrorComponent,
  SetupNotFoundComponent,
} from "@/components/editor/setup/SetupBoundaries";
import { useRunStore } from "@/lib/run-store";
import { HmiShell } from "@/components/hmi";
import { WorkerHealthBanner } from "@/components/editor/validation/WorkerHealthBanner";

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

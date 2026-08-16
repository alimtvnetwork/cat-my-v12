import { RunStatusType } from "@/types/run/RunStatus";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useRunStore } from "@/lib/stores/run-store";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    if (RunStatusType.isRunning(useRunStore.getState().status)) {
      throw redirect({ to: "/run" });
    }
  },
  component: SettingsLayout,
});

function SettingsLayout() {
  return <Outlet />;
}

export function SettingsNav() {
  return (
    <nav className="flex gap-hmi-2 text-hmi-body">
      <Link
        to="/settings/camera"
        className="inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border text-ca-ink"
      >
        Camera
      </Link>
      <Link
        to="/settings/trigger"
        className="inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border text-ca-ink"
      >
        Trigger
      </Link>
      <Link
        to="/settings/lighting"
        className="inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border text-ca-ink"
      >
        Lighting
      </Link>
      <Link
        to="/settings/license"
        className="inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border text-ca-ink"
      >
        License
      </Link>
      <Link
        to="/settings/shortcuts"
        className="inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border text-ca-ink"
      >
        Shortcuts
      </Link>
    </nav>
  );
}

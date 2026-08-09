import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Lightbulb, Info } from "lucide-react";
import { HmiShell, CameraPreview } from "@/components/hmi";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { StorageKey } from "@/lib/constants";

export const Route = createFileRoute("/settings/camera")({
  head: () => ({
    meta: [
      { title: "Camera Settings - Control Automation" },
      {
        name: "description",
        content: "Tune exposure, contrast, and enhancement with a live camera preview.",
      },
    ],
  }),
  component: CameraSettings,
});

function CameraSettings() {
  return (
    <HmiShell
      program="Program 01"
      title="Settings - Camera"
      actionBarLeft={
        <Link
          to="/setup"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Back to Setup
        </Link>
      }
    >
      {/*
        Plan 81 step 8: two-column camera settings layout. Preview + its
        internal sliders keep the primary column; a sidecar column carries
        capture tips and a POV-preset reminder so operators are not left
        alone with a wall of sliders. Grid collapses to one column below
        the `lg` breakpoint.
      */}
      <div className="grid gap-hmi-4 p-hmi-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SettingsCard
          Icon={Camera}
          title="Capture tuning"
          description="Tune exposure, contrast, and enhancement. Sliders persist per program."
        >
          <CameraPreview storageKey={StorageKey.CameraControls} heading="Capture tuning" />
        </SettingsCard>
        <div className="flex flex-col gap-hmi-4">
          <SettingsCard
            Icon={Info}
            title="POV presets"
            description="Match the mounted camera POV before tuning sliders. Wrong POV skews every downstream ROI."
          >
            <ul className="space-y-hmi-2 text-hmi-caption text-ca-ink-muted">
              <li>Top-down: label placement, tray inspection.</li>
              <li>Angled: barcode read, seal integrity.</li>
              <li>Front: character verification, print quality.</li>
            </ul>
          </SettingsCard>
          <SettingsCard
            Icon={Lightbulb}
            title="Capture tips"
            description="Read before pushing sliders past defaults."
          >
            <ul className="space-y-hmi-2 text-hmi-caption text-ca-ink-muted">
              <li>Fix lighting first, then exposure.</li>
              <li>Contrast above +30 amplifies sensor noise.</li>
              <li>Enhance is a preview-only filter, not saved to workers.</li>
              <li>Use "Reset to worker defaults" when in doubt.</li>
            </ul>
          </SettingsCard>
        </div>
      </div>
    </HmiShell>
  );
}

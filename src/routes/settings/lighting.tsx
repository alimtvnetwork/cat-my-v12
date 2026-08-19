import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sun, Zap } from "lucide-react";
import { HmiShell, CameraPreview } from "@/components/hmi";
import { SettingsCard } from "@/components/settings/SettingsCard";
import type { CameraSetupControls } from "@/components/hmi/CameraPreview";
import { useLightingStore } from "@/lib/lighting/store";

export const Route = createFileRoute("/settings/lighting")({
  head: () => ({
    meta: [
      { title: "Lighting Settings - Control Automation" },
      {
        name: "description",
        content: "Tune illumination enhancement and darkening against a live preview.",
      },
    ],
  }),
  component: LightingSettings,
});

function LightingSettings() {
  // Plan 67 step 18 (SU-06): mirror lighting-page slider edits into the
  // shared `useLightingStore`. `CameraPreview` remains the source of
  // truth for its own persistence, and this bridge keeps the store in
  // sync with the four fields the store models (exposure, gain,
  // enhance, and a darken proxy derived from negative exposure).
  const hydrate = useLightingStore((s) => s.hydrate);
  const setExposure = useLightingStore((s) => s.setExposure);
  const setGain = useLightingStore((s) => s.setGain);
  const setEnhance = useLightingStore((s) => s.setEnhance);
  const setDarken = useLightingStore((s) => s.setDarken);
  // Flash test overlay state (Plan 81 step 10). A 250 ms full-viewport
  // white flash gives the operator immediate feedback that the LED
  // controller wiring is alive. Overlay lives outside CameraPreview so
  // it never leaks into persisted controls.
  const [flashing, setFlashing] = useState(false);
  const [lastFlashAt, setLastFlashAt] = useState<number | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleControlsChange = useCallback(
    (c: CameraSetupControls) => {
      setExposure(c.exposure);
      setGain(c.gain ?? 0);
      setEnhance(c.enhance);
      // Darken is derived: only negative exposure contributes.
      setDarken(c.exposure < 0 ? -c.exposure : 0);
    },
    [setExposure, setGain, setEnhance, setDarken],
  );

  const runFlashTest = () => {
    if (flashing) return;
    setFlashing(true);
    setLastFlashAt(Date.now());
    window.setTimeout(() => setFlashing(false), 250);
  };

  return (
    <HmiShell
      program="Program 01"
      title="Settings - Lighting"
      actionBarLeft={
        <Link
          to="/setup"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Back to Setup
        </Link>
      }
    >
      <div className="grid gap-hmi-4 p-hmi-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SettingsCard
          Icon={Sun}
          title="Lighting enhancement"
          description="Tune illumination enhancement and darkening. Mirrors into the shared lighting store."
        >
          <div className="relative">
            <CameraPreview
              storageKey="ca.settings.lighting.controls"
              heading="Lighting enhancement"
              onControlsChange={handleControlsChange}
            />
            {flashing ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-white/90 transition-opacity"
                data-testid="lighting-flash-overlay"
              />
            ) : null}
          </div>
        </SettingsCard>
        <SettingsCard
          Icon={Zap}
          title="Flash test"
          description="Fire a 250 ms full-viewport flash to confirm the LED controller responds."
          savedAt={lastFlashAt}
        >
          <button
            type="button"
            onClick={runFlashTest}
            disabled={flashing}
            aria-pressed={flashing}
            className="inline-flex items-center gap-hmi-2 rounded-md bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:opacity-50"
          >
            <Zap size={14} aria-hidden />
            {flashing ? "Flashing..." : "Fire flash"}
          </button>
          <p className="mt-hmi-3 text-hmi-caption text-ca-ink-muted">
            Preview-only. Real deployments trigger the LED controller over the vendor SDK; this
            button is a hardware smoke test surrogate.
          </p>
        </SettingsCard>
      </div>
    </HmiShell>
  );
}

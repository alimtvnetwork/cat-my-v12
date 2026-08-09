import { createFileRoute } from "@tanstack/react-router";
import { SetupTiles } from "@/components/app-shell/SetupTiles";
import { LightingReadout } from "@/components/app-shell/LightingReadout";
import { DataSourceToggle } from "@/components/data-source/DataSourceToggle";

export const Route = createFileRoute("/setup/")({
  head: () => ({
    meta: [
      // Titlebar/head titles across /setup use Home's "Control Automation, X"
      // format so tab titles read consistently between the hub and its subroutes.
      { title: "Control Automation, Setup" },
      {
        name: "description",
        content:
          "Configure inspection tools, regions of interest, and reference frames for the Control Automation program.",
      },
    ],
  }),
  component: SetupIndex,
});

function SetupIndex() {
  // Plan 75 step 12 (Issue 09): full-bleed canvas landing hub. Uses only
  // design tokens (--ca-*) for surfaces, groups content in a single
  // scroll region, and gives the header a subtle bordered chrome so the
  // hierarchy reads "hub header, tiles, lighting readout" instead of a
  // stack of ungrouped sections. `/setup/rules`, `/setup/roi`, and
  // `/setup/reference` remain the full editor surfaces.
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-ca-canvas">
      <div
        role="region"
        aria-labelledby="setup-hub-heading"
        className="border-b border-ca-border bg-ca-panel/60 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                id="setup-hub-heading"
                className="text-xl font-semibold tracking-tight text-ca-ink"
              >
                Setup
              </h1>
              <p className="text-sm text-ca-ink-muted">
                Configure your camera, inspection rules, and lighting.
              </p>
            </div>
            <DataSourceToggle />
          </div>
        </div>
      </div>
      <SetupTiles />
      <section aria-label="Lighting status" className="mx-auto w-full max-w-6xl px-6 pb-10">
        <LightingReadout />
      </section>
    </main>
  );
}

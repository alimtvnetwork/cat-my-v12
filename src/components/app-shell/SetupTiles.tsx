import { Link } from "@tanstack/react-router";
import { Camera, Sliders, Sun } from "lucide-react";

/**
 * Plan 67 step 15: three large animated tiles for `/setup/`.
 * Wired from `src/routes/setup.index.tsx` as the setup landing hub.
 * Uses only design tokens (ca-*) so it themes with the rest of the app.
 */
export enum TileRouteType {
  SetupRules = "/setup/rules",
  SetupReference = "/setup/reference",
  SetupCamera = "/setup/camera",
  SettingsCamera = "/settings/camera",
  SettingsLighting = "/settings/lighting",
}
export type TileRoute = TileRouteType;
interface Tile {
  to: TileRoute;
  title: string;
  blurb: string;
  Icon: typeof Camera;
}

const TILES: readonly Tile[] = [
  {
    to: TileRouteType.SetupCamera,
    title: "Camera Setup",
    blurb: "CameraSetting records: identity, optics, exposure, and acquisition.",
    Icon: Camera,
  },
  {
    to: TileRouteType.SetupRules,
    title: "Rules Setup",
    blurb: "Create inspection rules and open category management from there.",
    Icon: Sliders,
  },
  {
    to: TileRouteType.SettingsLighting,
    title: "Lighting Setup",
    blurb: "Channel selection, intensity, and strobe timing.",
    Icon: Sun,
  },
] as const;

export function SetupTiles() {

  return (
    <section
      aria-label="Setup"
      data-testid="setup-tiles"
      className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-6 py-8 sm:grid-cols-3"
    >
      {TILES.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          search={{} as any}
          params={{} as any}
          data-testid={`setup-tile-${t.to.replace(/[/]/g, "-").slice(1)}`}
          className="hmi-focus-ring group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-ca-border bg-ca-panel p-6 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-ca-primary/60 hover:bg-ca-panel-2 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-ca-primary/0 transition-colors duration-300 group-hover:bg-ca-primary/10"
          />
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-ca-primary/10 text-ca-primary transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none">
            <t.Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-ca-ink">{t.title}</h2>
            <p className="mt-1 text-sm leading-snug text-ca-ink-muted">{t.blurb}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}

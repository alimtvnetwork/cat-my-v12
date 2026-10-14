import { Camera, Cpu, ScanSearch, Sliders, Sun } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * Plan 67 step 15: animated tiles for `/setup/`.
 * Wired from `src/routes/setup.index.tsx` as the setup landing hub.
 * Uses only design tokens (ca-*) so it themes with the rest of the app.
 */
export enum TileRouteType {
  SetupAnalyze = "/analyze",
  SetupDevices = "/setup/devices",
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
    to: TileRouteType.SetupAnalyze,
    title: "Workpiece Analysis",
    blurb: "Inspection hierarchy tree, circuit IC DUT, and live workpiece canvas.",
    Icon: ScanSearch,
  },
  {
    to: TileRouteType.SetupDevices,
    title: "Device Setup",
    blurb: "Target chips, circuit boards, package form factors, and inspection features.",
    Icon: Cpu,
  },
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

export function SetupTiles(): React.JSX.Element | null {
  return (
    <section
      aria-label="Setup"
      data-testid="setup-tiles"
      className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-6 py-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      {TILES.map((t, idx) => (
        <Link
          key={t.to}
          to={t.to}
          search={{} as any}
          params={{} as any}
          data-testid={`setup-tile-${t.to.replace(/[/]/g, "-").slice(1)}`}
          className="hmi-focus-ring group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ca-border/80 bg-gradient-to-b from-ca-panel/95 via-ca-panel/75 to-ca-bg/95 p-6 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_-6px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-ca-primary/60 hover:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.15)] motion-reduce:transform-none motion-reduce:transition-none"
        >
          {/* Hex bolt corner accents */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 h-1.5 w-1.5 rounded-full border border-ca-border/80 bg-ca-panel/90 shadow-sm" aria-hidden="true" />
          <div className="pointer-events-none absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full border border-ca-border/80 bg-ca-panel/90 shadow-sm" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 h-1.5 w-1.5 rounded-full border border-ca-border/80 bg-ca-panel/90 shadow-sm" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-2.5 right-2.5 h-1.5 w-1.5 rounded-full border border-ca-border/80 bg-ca-panel/90 shadow-sm" aria-hidden="true" />

          {/* Station index watermark */}
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 top-3 font-mono text-3xl font-black text-ca-ink-muted/10 select-none transition-colors duration-300 group-hover:text-ca-primary/20"
          >
            0{idx + 1}
          </span>

          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-ca-primary/0 blur-xl transition-all duration-300 group-hover:bg-ca-primary/15"
          />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ca-primary/10 border border-ca-primary/30 text-ca-primary transition-all duration-200 group-hover:scale-105 group-hover:border-ca-primary/60 group-hover:shadow-[0_0_16px_var(--ca-primary)] motion-reduce:transform-none shadow-sm">
                <t.Icon className="h-5 w-5" aria-hidden />
              </span>

              <div className="flex items-center gap-1.5 rounded-full border border-ca-ok/40 bg-ca-ok/10 px-2 py-0.5 text-[9px] font-mono font-bold text-ca-ok tracking-wider shadow-[0_0_6px_color-mix(in_oklab,var(--ca-ok)_20%,transparent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-ca-ok animate-pulse" />
                <span>BUS: OK</span>
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-ca-ink font-display group-hover:text-ca-primary transition-colors">
                {t.title}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ca-ink-muted font-medium">{t.blurb}</p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-ca-border/60 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-ca-ink-muted font-semibold">Config Station</span>
            <span className="text-xs font-bold text-ca-ink-muted group-hover:text-ca-primary group-hover:translate-x-1 transition-all">→</span>
          </div>
        </Link>
      ))}
    </section>
  );
}

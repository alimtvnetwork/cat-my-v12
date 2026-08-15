import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, Activity, Gauge } from "lucide-react";
import { HmiShell } from "@/components/hmi";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { readFacadeJson, writeFacadeJson } from "@/lib/projects/facade-json";
import { TriggerTimingDiagram } from "@/components/settings/TriggerTimingDiagram";

export const Route = createFileRoute("/settings/trigger")({
  head: () => ({
    meta: [
      { title: "Trigger Settings - Control Automation" },
      {
        name: "description",
        content: "Configure trigger source, edge, and debounce for the inspection program.",
      },
    ],
  }),
  component: TriggerSettings,
});
// Plan 81 step 9: diagram-first trigger settings. Persisted through the
// facade JSON helper (same seam used by every other Settings surface) so
// the ratchet test in `facade-single-seam.test.ts` stays green.
const FACADE_KEY = "ca.settings.trigger.config";

export enum TriggerSourceType {
  Software = "software",
  Io = "io",
  Opc = "opc",
  Profinet = "profinet",
}
export type TriggerSource = TriggerSourceType;
export enum TriggerTimingDiagramPropsEdgeType {
  Rising = "rising",
  Falling = "falling",
}
export type TriggerEdge = TriggerTimingDiagramPropsEdgeType;

export interface TriggerConfig {
  source: TriggerSource;
  edge: TriggerEdge;
  debounceMs: number;
}

const DEFAULT_TRIGGER: TriggerConfig = {
  source: TriggerSourceType.Software,
  edge: TriggerTimingDiagramPropsEdgeType.Rising,
  debounceMs: 5,
};

const SOURCES: readonly { id: TriggerSource; label: string }[] = [
  { id: TriggerSourceType.Software, label: "Software" },
  { id: TriggerSourceType.Io, label: "Digital I/O" },
  { id: TriggerSourceType.Opc, label: "OPC UA" },
  { id: TriggerSourceType.Profinet, label: "PROFINET" },
];

function TriggerSettings() {
  const [config, setConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    readFacadeJson<TriggerConfig>(FACADE_KEY)
      .then((v) => {
        if (isCancelled) return;

        if (v) setConfig({ ...DEFAULT_TRIGGER, ...v });
        setHydrated(true);
      })
      .catch((err) => {
        // Surface, do not swallow: readFacadeJson returns null on miss,
        // so any thrown error is a real facade fault worth logging.
        console.error("[settings.trigger] hydrate failed", err);
        setHydrated(true);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const isUnhydrated = !hydrated;

  useEffect(() => {
    if (isUnhydrated) return;
    try {
      writeFacadeJson(FACADE_KEY, config);
      setSavedAt(Date.now());
    } catch (err) {
      console.error("[settings.trigger] persist failed", err);
    }
  }, [config, hydrated]);

  return (
    <HmiShell
      program="Program 01"
      title="Settings - Trigger"
      actionBarLeft={
        <Link
          to="/setup"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Back to Setup
        </Link>
      }
    >
      <div className="grid gap-hmi-4 p-hmi-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SettingsCard
          Icon={Activity}
          title="Timing diagram"
          description="Live preview of edge polarity and debounce window against the selected source."
          savedAt={savedAt}
        >
          <TriggerTimingDiagram
            edge={config.edge}
            debounceMs={config.debounceMs}
            source={config.source}
          />
        </SettingsCard>
        <div className="flex flex-col gap-hmi-4">
          <SettingsCard
            Icon={Zap}
            title="Source"
            description="Where trigger pulses come from. Diagram redraws on change."
          >
            <div role="radiogroup" aria-label="Trigger source" className="flex flex-wrap gap-hmi-2">
              {SOURCES.map((s) => {
                const active = config.source === s.id;

                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setConfig((c) => ({ ...c, source: s.id }))}
                    className={
                      active
                        ? "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 bg-ca-select text-ca-bg text-hmi-body font-semibold"
                        : "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 border border-ca-border bg-ca-panel-2 text-hmi-body text-ca-ink hover:border-ca-select"
                    }
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </SettingsCard>
          <SettingsCard
            Icon={Gauge}
            title="Edge and debounce"
            description="Rising or falling detection with a debounce window (0-100 ms) that suppresses noise."
          >
            <div role="radiogroup" aria-label="Trigger edge" className="flex gap-hmi-2">
              {(
                [
                  TriggerTimingDiagramPropsEdgeType.Rising,
                  TriggerTimingDiagramPropsEdgeType.Falling,
                ] as const
              ).map((e) => {
                const active = config.edge === e;

                return (
                  <button
                    key={e}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setConfig((c) => ({ ...c, edge: e }))}
                    className={
                      active
                        ? "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 bg-ca-select text-ca-bg text-hmi-body font-semibold capitalize"
                        : "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 border border-ca-border bg-ca-panel-2 text-hmi-body text-ca-ink hover:border-ca-select capitalize"
                    }
                  >
                    {e}
                  </button>
                );
              })}
            </div>
            <label className="mt-hmi-3 block text-hmi-caption text-ca-ink-muted">
              Debounce
              <div className="mt-hmi-1 flex items-center gap-hmi-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={config.debounceMs}
                  onChange={(e) => setConfig((c) => ({ ...c, debounceMs: Number(e.target.value) }))}
                  className="flex-1"
                  aria-label="Debounce milliseconds"
                />
                <span className="hmi-tabular w-14 text-right text-ca-ink">
                  {config.debounceMs} ms
                </span>
              </div>
            </label>
          </SettingsCard>
        </div>
      </div>
    </HmiShell>
  );
}

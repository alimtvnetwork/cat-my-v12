// Seed bundle gap-check panel. Renders the latest `SeedGapReport` from
// the telemetry ring so operators can see every dangling reference
// across swatches / categories / rules / rulesets / cameras /
// mic-settings / projects / image-samples in one place, and can rerun
// the check on demand against the current bundle + facade state.
import { useMemo, useState } from "react";
import bundle from "@/lib/seed/data/bundle.json";
import type { CatSeedBundle } from "@/lib/seed/types";
import {
  runSeedGapCheck,
  isInvalid,
  SEEDED_CAMERA_NAMES,
  SEEDED_MIC_SETTINGS_NAMES,
  type SeedGapReport,
} from "@/lib/seed/gap-check";
import { SAMPLE_LIBRARY } from "@/lib/editor/sample-library";
import { DEFAULT_SWATCHES } from "@/lib/swatches/facade";
import { useSeedTelemetryStore } from "@/lib/seed/telemetry-store";

function computeLive(): SeedGapReport {
  return runSeedGapCheck(bundle as unknown as CatSeedBundle, {
    cameraNames: new Set(SEEDED_CAMERA_NAMES),
    micSettingsNames: new Set(SEEDED_MIC_SETTINGS_NAMES),
    sampleLibraryIds: new Set(SAMPLE_LIBRARY.map((s) => s.id)),
    swatches: new Set(DEFAULT_SWATCHES.map((s) => s.toLowerCase())),
  });
}

export function SeedGapCheckSection() {
  const history = useSeedTelemetryStore((s) => s.history);
  const latest = useMemo(() => history.find((r) => r.gaps) ?? null, [history]);
  const [manual, setManual] = useState<SeedGapReport | null>(null);
  const report: SeedGapReport | null = manual ?? latest?.gaps ?? null;
  const isEmpty = report === null;

  return (
    <section
      className="border border-ca-border bg-ca-panel p-hmi-3"
      aria-label="Seed bundle gap check"
      data-testid="diagnostics-seed-gaps"
    >
      <div className="mb-hmi-2 flex items-center justify-between gap-hmi-3">
        <h2 className="text-hmi-body font-bold uppercase tracking-wide">
          Seed gap check
          {report ? (
            <span
              className={
                "ml-hmi-2 rounded-sm border px-hmi-1 py-[1px] text-hmi-caption " +
                (!isInvalid(report) ? "border-ca-ok text-ca-ok" : "border-ca-ng text-ca-ng")
              }
            >
              {!isInvalid(report) ? "all links resolved" : `${report.findings.length} missing`}
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-[2px] text-hmi-caption hover:border-ca-select"
          onClick={() => setManual(computeLive())}
          data-testid="diagnostics-seed-gaps-run"
        >
          Run now
        </button>
      </div>

      {isEmpty ? (
        <p className="text-hmi-caption text-ca-ink-muted">
          No gap report yet. Reseed or click "Run now" to scan every by-name link in the seed bundle
          against the current facade contents.
        </p>
      ) : report && !isInvalid(report) ? (
        <p className="text-hmi-caption text-ca-ink-muted">
          Scanned {report.scanned.projects} projects, {report.scanned.categories} categories,{" "}
          {report.scanned.ruleTemplates} rule templates, {report.scanned.sampleImages} sample
          images, {report.scanned.programs} programs, {report.scanned.swatches} swatches. Every
          camera / mic / category / ruleset / program / sample link resolved.
        </p>
      ) : report ? (
        <div className="grid gap-hmi-1">
          <p className="text-hmi-caption text-ca-ink-muted">
            {report.findings.length} broken link
            {report.findings.length === 1 ? "" : "s"} across the bundle.
          </p>
          <table className="w-full border-collapse text-hmi-caption">
            <thead>
              <tr className="text-left text-ca-ink-muted">
                <th className="border-b border-ca-border/60 py-1 pr-hmi-2">Kind</th>
                <th className="border-b border-ca-border/60 py-1 pr-hmi-2">Owner</th>
                <th className="border-b border-ca-border/60 py-1 pr-hmi-2">Missing ref</th>
                <th className="border-b border-ca-border/60 py-1">Detail</th>
              </tr>
            </thead>
            <tbody>
              {report.findings.map((f, i) => (
                <tr key={`${f.kind}-${f.owner}-${i}`}>
                  <td className="border-b border-ca-border/40 py-1 pr-hmi-2 font-mono">{f.kind}</td>
                  <td className="border-b border-ca-border/40 py-1 pr-hmi-2">{f.owner}</td>
                  <td className="border-b border-ca-border/40 py-1 pr-hmi-2 font-mono">{f.ref}</td>
                  <td className="border-b border-ca-border/40 py-1 text-ca-ink-muted">
                    {f.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
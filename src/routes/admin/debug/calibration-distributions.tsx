import { EditorRuleKindType } from "@/lib/editor/types";
// Admin/debug: per-kind pass/fail score distribution visualization.
//
// Renders the histograms and summary stats from worker/calibration-report.json
// for every rule kind (C, R, K, S, E), plus a "Download report" button that
// exports the bundled JSON so operators can share or archive it. Data flows
// through the same modules the rule editor uses (getCalibrationStats,
// getCalibrationSuggestion), so this page always matches the editor defaults.
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { HmiShell } from "@/components/hmi";
import type { EditorRuleKind } from "@/lib/editor/types";
import { getCalibrationStats } from "@/lib/editor/calibration-stats";
import { getCalibrationSuggestion } from "@/lib/editor/calibration";
import { CalibrationDistributionPlot } from "@/components/editor/rail/CalibrationDistributionPlot";
import { CalibrationStats } from "@/components/editor/rail/CalibrationStats";
import report from "../../../../worker/calibration-report.json";

const KINDS: readonly EditorRuleKind[] = [
  EditorRuleKindType.C,
  EditorRuleKindType.R,
  EditorRuleKindType.K,
  EditorRuleKindType.S,
  EditorRuleKindType.E,
];

const KIND_LABELS: Record<EditorRuleKind, string> = {
  C: "C, Colour",
  R: "R, Reference match",
  K: "K, OCR / edge",
  S: "S, Shape / text pattern",
  E: "E, Emptiness / expression",
};

export const Route = createFileRoute("/admin/debug/calibration-distributions")({
  head: () => ({
    meta: [
      { title: "Calibration distributions, Control Automation" },
      {
        name: "description",
        content:
          "Per-kind pass and fail score distributions and histograms from the latest calibration report.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalibrationDistributionsPage,
});

function CalibrationDistributionsPage() {
  const onDownload = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calibration-report.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <HmiShell title="Calibration distributions">
      <div className="flex flex-col gap-hmi-3 p-hmi-3" data-testid="calibration-distributions-page">
        <header className="flex items-center justify-between gap-hmi-2">
          <p className="text-hmi-body text-ca-ink-muted">
            Pass and fail score histograms per rule kind, sourced from{" "}
            <code className="font-hmi-mono">worker/calibration-report.json</code>. Solid line marks
            the midpoint used as the recommended threshold.
          </p>
          <button
            type="button"
            onClick={onDownload}
            data-testid="download-calibration-report"
            className="inline-flex items-center gap-hmi-2 border border-ca-border bg-ca-panel px-hmi-3 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel-2"
          >
            <Download size={14} aria-hidden />
            Download report
          </button>
        </header>

        <div className="grid grid-cols-1 gap-hmi-3 md:grid-cols-2 xl:grid-cols-3">
          {KINDS.map((kind) => (
            <KindCard key={kind} kind={kind} />
          ))}
        </div>
      </div>
    </HmiShell>
  );
}

function KindCard({ kind }: { kind: EditorRuleKind }) {
  const stats = getCalibrationStats(kind);
  const suggestion = getCalibrationSuggestion(kind);

  if (!stats) {
    return (
      <section
        className="border border-ca-border p-hmi-2 text-hmi-body text-ca-ink-muted"
        data-testid={`calibration-card-${kind}`}
      >
        {KIND_LABELS[kind]}: no data in report.
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-hmi-2 border border-ca-border p-hmi-2"
      data-testid={`calibration-card-${kind}`}
    >
      <header className="flex items-baseline justify-between gap-hmi-2">
        <h2 className="text-hmi-header">{KIND_LABELS[kind]}</h2>
        {suggestion ? (
          <span className="font-hmi-mono text-hmi-caption text-ca-ink-muted tabular-nums">
            thr {suggestion.threshold.toFixed(2)} - f1 {suggestion.f1.toFixed(2)} - n{" "}
            {suggestion.samples}
          </span>
        ) : null}
      </header>
      <CalibrationDistributionPlot
        kind={kind}
        threshold={suggestion?.threshold}
        width={360}
        height={140}
      />
      <CalibrationStats kind={kind} />
    </section>
  );
}

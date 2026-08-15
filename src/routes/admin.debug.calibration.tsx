// Admin/debug: Recalibrate the validation worker.
//
// Triggers `worker/calibrate.py` on the Fly worker, polls its status
// while it runs, then loads the fresh calibration-report.json and
// renders a per-kind summary. Admin-gated server-side (assertAdmin
// inside every server fn); non-admins see the error card.
import { RunStatusType } from "@/types/run/RunStatus";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Play, Loader2, AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import { HmiShell } from "@/components/hmi";
import { EmptyState } from "@/components/common/EmptyState";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import {
  startCalibration,
  getCalibrationJobStatus,
  getCalibrationReport,
  type CalibrationStatus,
  type CalibrationReport,
} from "@/lib/editor/calibration.functions";

export const Route = createFileRoute("/admin/debug/calibration")({
  head: () => ({
    meta: [
      { title: "Recalibrate scorer, Control Automation" },
      {
        name: "description",
        content: "Admin: trigger worker/calibrate.py and view the fresh calibration report.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalibrationAdminPage,
});

function CalibrationAdminPage() {
  const start = useServerFn(startCalibration);
  const poll = useServerFn(getCalibrationJobStatus);
  const fetchReport = useServerFn(getCalibrationReport);
  const [job, setJob] = useState<CalibrationStatus | null>(null);
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const r = await fetchReport();
      setReport(r as CalibrationReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [fetchReport]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const running = RunStatusType.isRunning(job?.state);
  useVisibleInterval(
    async () => {
      if (!running) return;
      try {
        const s = await poll();
        setJob(s);

        if (s.state === "done") {
          setBusy(false);
          await loadReport();
        }

        if (s.state === "error") {
          setBusy(false);
          setError(s.error ?? "calibration failed");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      }
    },
    1500,
    running,
  );

  const onClick = async () => {
    setError(null);
    setBusy(true);
    try {
      setJob(await start());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <HmiShell title="Recalibrate scorer">
      <div className="flex flex-col gap-hmi-3 p-hmi-3">
        <ActionBar onClick={onClick} busy={busy || running} />
        {error ? <ErrorCard message={error} /> : null}
        <JobCard job={job} />
        <ReportCard report={report} />
      </div>
    </HmiShell>
  );
}

function ActionBar({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <div className="flex items-center gap-hmi-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        data-testid="recalibrate-btn"
        className="inline-flex items-center gap-hmi-2 border border-ca-primary bg-ca-primary/10 px-hmi-3 py-hmi-1 text-hmi-body text-ca-primary hover:bg-ca-primary/20 disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {busy ? "Recalibrating..." : "Recalibrate"}
      </button>
      <span className="text-hmi-caption text-ca-ink-muted">
        Runs worker/calibrate.py, then reloads calibration-report.json.
      </span>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-hmi-2 border border-ca-warn bg-ca-warn/10 p-hmi-2 text-hmi-body text-ca-warn"
    >
      <AlertTriangle size={14} className="mt-0.5" aria-hidden />
      <span data-testid="recalibrate-error">{message}</span>
    </div>
  );
}

function JobCard({ job }: { job: CalibrationStatus | null }) {
  if (!job) return null;
  const pct =
    job.progress.total > 0
      ? Math.min(100, Math.round((job.progress.step / job.progress.total) * 100))
      : 0;
  const Icon =
    job.state === "done" ? CheckCircle2 : job.state === "error" ? AlertTriangle : Loader2;
  const tone =
    job.state === "done"
      ? "text-ca-primary"
      : job.state === "error"
        ? "text-ca-warn"
        : "text-ca-ink-muted";
  const spin = RunStatusType.isRunning(job.state) ? "animate-spin" : "";

  return (
    <section
      className="flex flex-col gap-hmi-2 border border-ca-border p-hmi-2"
      data-testid="recalibrate-job"
    >
      <header className={`flex items-center gap-hmi-2 text-hmi-body ${tone}`}>
        <Icon size={14} className={spin} aria-hidden />
        <span>state: {job.state}</span>
        {job.jobId ? <span className="text-ca-ink-muted">({job.jobId})</span> : null}
      </header>
      <div
        className="h-2 w-full bg-ca-panel-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-ca-primary" style={{ width: `${pct}%` }} />
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap border border-ca-border/50 bg-ca-panel p-hmi-1 font-hmi-mono text-hmi-caption text-ca-ink-muted">
        {job.lines.join("\n") || job.progress.message || "waiting for output..."}
      </pre>
    </section>
  );
}

function ReportCard({ report }: { report: CalibrationReport | null }) {
  if (!report) {
    return (
      <EmptyState
        icon={Gauge}
        title="No calibration report yet"
        description="Click Recalibrate to run worker/calibrate.py and generate the first report."
        testId="calibration-report-empty"
      />
    );
  }

  const perKind = report.per_kind ?? {};
  const kinds = Object.keys(perKind).sort();

  return (
    <section
      className="flex flex-col gap-hmi-2 border border-ca-border p-hmi-2"
      data-testid="recalibrate-report"
    >
      <h2 className="text-hmi-header">Latest report</h2>
      <table className="w-full font-hmi-mono text-hmi-caption">
        <thead className="text-ca-ink-muted">
          <tr>
            <th className="text-left">kind</th>
            <th className="text-right">n</th>
            <th className="text-right">thr</th>
            <th className="text-right">f1</th>
            <th className="text-right">margin</th>
            <th className="text-right">separable</th>
          </tr>
        </thead>
        <tbody>
          {kinds.map((k) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const v = perKind[k] as any;
            const sep = v?.separation ?? {};

            return (
              <tr key={k} className="text-ca-ink">
                <td>{k}</td>
                <td className="text-right">{v?.n ?? "-"}</td>
                <td className="text-right">
                  {typeof v?.threshold === "number" ? v.threshold.toFixed(2) : "-"}
                </td>
                <td className="text-right">{typeof v?.f1 === "number" ? v.f1.toFixed(2) : "-"}</td>
                <td className="text-right">
                  {typeof sep?.margin === "number" ? sep.margin.toFixed(2) : "-"}
                </td>
                <td className="text-right">{sep?.separable ? "yes" : "no"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

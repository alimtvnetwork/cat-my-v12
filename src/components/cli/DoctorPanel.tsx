/**
 * DoctorPanel - operator surface for `POST /api/cli/doctor`.
 *
 * Plan 90 Step 122. Renders per-probe status pills (SDK / config /
 * log root / DB tiers) plus BE-provided remediation copy for any
 * unhealthy probe. Mounted into `/cli/settings`.
 *
 * Rendering rules per spec/03-error-manage/ §honesty:
 * - overall banner is emerald only when ALL probes report healthy;
 *   any single unhealthy probe flips the banner to destructive.
 * - each probe row surfaces `Detail` verbatim (never truncated) so an
 *   operator can grep-match against BE JSONL logs.
 * - remediation copy is only shown when `IsHealthy=false`, so healthy
 *   rows stay quiet (no advice noise).
 *
 * Uses design tokens only; no hardcoded colors. Emerald/destructive/amber
 * tone classes are the same set used by `LayerValueTable` in
 * `cli.settings.tsx` for visual consistency across the page.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { AlertTriangle, CheckCircle2, RefreshCw, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDoctorReport, type DoctorReport } from "@/lib/observability/doctor.functions";
import { cn } from "@/lib/utils";

const DOCTOR_QUERY_KEY = ["cli", "doctor"] as const;

export function DoctorPanel() {
  const qc = useQueryClient();
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const mutation = useAppMutation({
    mutationKey: DOCTOR_QUERY_KEY,
    mutationFn: () => getDoctorReport({ data: {} }),
    onSuccess: (data) => {
      setReport(data);
      setError(null);
      setLastRunAt(new Date());
      qc.setQueryData(DOCTOR_QUERY_KEY, data);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : String(err));
      setLastRunAt(new Date());
    },
  });

  // Run once on mount so the panel is not blank on first paint. Explicit
  // (not `useQuery`) so the operator sees a "Run diagnostics" button that
  // matches the destructive-nature of the POST verb per spec/03-error-manage.
  useEffect(() => {
    if (!report && !mutation.isPending && !error) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overallHealthy = report?.IsHealthy ?? false;

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Stethoscope className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
          <div>
            <h2 className="text-sm font-medium">Doctor</h2>
            <p className="text-xs text-muted-foreground">
              Runs <code className="font-mono">POST /api/cli/doctor</code>: SDK reachable, config
              schema valid, log root writable, DB tiers in sync. Same probes as the CLI{" "}
              <code className="font-mono">doctor</code> subcommand (Plan 90 Step 41).
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", mutation.isPending && "animate-spin")} />
          {mutation.isPending ? "Running..." : "Run diagnostics"}
        </Button>
      </header>

      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Doctor request failed</AlertTitle>
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {report && (
        <>
          <div
            className={cn(
              "mb-3 flex items-center justify-between rounded-md border px-3 py-2 text-sm",
              overallHealthy
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            <div className="flex items-center gap-2">
              {overallHealthy ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : (
                <AlertTriangle className="h-4 w-4" aria-hidden />
              )}
              <span className="font-medium">
                {overallHealthy
                  ? "All probes healthy"
                  : `${report.UnhealthyCount} probe(s) unhealthy`}
              </span>
            </div>
            <span className="text-xs opacity-75">
              {report.TotalProbes} probe(s){lastRunAt ? ` · ${lastRunAt.toLocaleTimeString()}` : ""}
            </span>
          </div>

          <ul className="flex flex-col gap-2" aria-label="Doctor probe results">
            {report.Probes.map((probe) => (
              <li key={probe.Tier} className="rounded-md border bg-background/50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase",
                        probe.IsHealthy
                          ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                          : "border-destructive/50 text-destructive",
                      )}
                    >
                      {probe.IsHealthy ? "ok" : "fail"}
                    </Badge>
                    <span className="font-mono text-xs">{probe.Tier}</span>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                  {probe.Detail}
                </p>
                {!probe.IsHealthy && probe.Remediation && (
                  <p className="mt-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-medium">Fix: </span>
                    {probe.Remediation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {!report && !error && mutation.isPending && (
        <p className="text-xs text-muted-foreground">Running probes...</p>
      )}
    </section>
  );
}

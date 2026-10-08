import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { BarChart3, Clock4, PackagePlus, Play, Upload, X, Trash2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import {
  selectProject,
  selectRuleset,
  selectRulesetsForProject,
  useProjectStore,
} from "@/lib/projects/store";
import { runRuleset, type TrialRun } from "@/lib/projects/trials";
import {
  aggregateAiTestingResults,
  selectAiTestingHistoryForRuleset,
  useAiTestingStore,
  type AiTestingAggregateSummary,
  type AiTestingDatasetImage,
} from "@/lib/ai-testing/aggregate";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const MAX_DATASET_IMAGE_BYTES = 4 * 1024 * 1024;

interface DatasetImage extends AiTestingDatasetImage {
  size: number;
  type: string;
}

interface ProgressState {
  done: number;
  total: number;
}

export const Route = createFileRoute("/projects/$projectId/ai-testing")({
  component: AiTestingPage,
  validateSearch: (search: Record<string, unknown>) => ({
    rulesetId: typeof search.rulesetId === "string" ? search.rulesetId : undefined,
  }),
});

function readDatasetFile(file: File): Promise<DatasetImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Unexpected FileReader result"));
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        imageRef: result,
        size: file.size,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  });
}

function AiTestingPage() {
  const { projectId } = Route.useParams();
  const searchRulesetId = Route.useSearch({ select: (s) => s.rulesetId });
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const appendSummary = useAiTestingStore((s) => s.appendSummary);

  if (!project) throw notFound();

  const [rulesetId, setRulesetId] = useState<string>(searchRulesetId ?? rulesets[0]?.id ?? "");
  const [dataset, setDataset] = useState<DatasetImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ done: 0, total: 0 });
  const [lastSummary, setLastSummary] = useState<AiTestingAggregateSummary | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeRuleset = useProjectStore((s) => (rulesetId ? selectRuleset(s, rulesetId) : undefined));
  const history = useAiTestingStore((s) => selectAiTestingHistoryForRuleset(s, rulesetId));

  useEffect(() => {
    if (searchRulesetId && rulesets.some((r) => r.id === searchRulesetId) && searchRulesetId !== rulesetId) {
      setRulesetId(searchRulesetId);
      return;
    }
    if (rulesetId && rulesets.some((ruleset) => ruleset.id === rulesetId)) return;
    setRulesetId(rulesets[0]?.id ?? "");
  }, [rulesetId, rulesets, searchRulesetId]);

  const canRun = useMemo(() => Boolean(activeRuleset) && dataset.length > 0 && !running, [activeRuleset, dataset.length, running]);
  const runDisabledReason = useMemo(() => {
    if (running) return "Run in progress.";
    if (!activeRuleset) return "Select a ruleset first.";
    if (dataset.length === 0) return "Add images to dataset.";
    return null;
  }, [activeRuleset, dataset.length, running]);

  const progressPercent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

  const timelineSummaries = useMemo<AiTestingAggregateSummary[]>(() => {
    const seen = new Set<string>();
    const merged: AiTestingAggregateSummary[] = [];
    if (lastSummary) {
      merged.push(lastSummary);
      seen.add(lastSummary.id);
    }
    for (const item of history) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged.sort((a, b) => a.createdAt - b.createdAt);
  }, [lastSummary, history]);

  const activeSummary = useMemo<AiTestingAggregateSummary | null>(() => {
    if (selectedSummaryId) {
      const match = timelineSummaries.find((s) => s.id === selectedSummaryId);
      if (match) return match;
    }
    return lastSummary ?? history[history.length - 1] ?? null;
  }, [selectedSummaryId, timelineSummaries, lastSummary, history]);

  async function addFiles(files: FileList | File[]) {
    setError(null);
    const accepted: File[] = [];
    const messages: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        messages.push(`${file.name}: not an image file.`);
        continue;
      }
      if (file.size > MAX_DATASET_IMAGE_BYTES) {
        messages.push(`${file.name}: larger than ${MAX_DATASET_IMAGE_BYTES / 1024 / 1024} MB.`);
        continue;
      }
      accepted.push(file);
    }

    try {
      const images = await Promise.all(accepted.map(readDatasetFile));
      if (images.length > 0) {
        setDataset((current) => [...current, ...images]);
      }
      setError(messages.length > 0 ? messages.join(" ") : null);
    } catch (err) {
      setError("Failed to read dataset images.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removeDatasetImage(id: string) {
    setDataset((current) => current.filter((img) => img.id !== id));
  }

  async function handleRunTests() {
    if (!activeRuleset || dataset.length === 0) return;
    try {
      setRunning(true);
      setError(null);
      setProgress({ done: 0, total: dataset.length });
      setSelectedSummaryId(null);
      setLastSummary(null);

      const runs: TrialRun[] = [];
      for (let i = 0; i < dataset.length; i++) {
        const image = dataset[i];
        const result = runRuleset({
          rulesetId: activeRuleset.id,
          rules: activeRuleset.rules,
          imageRef: image.imageRef,
        });
        runs.push(result);
        setProgress({ done: i + 1, total: dataset.length });
      }

      const summary = aggregateAiTestingResults({
        rulesetId: activeRuleset.id,
        rules: activeRuleset.rules,
        images: dataset,
        runs,
      });
      setLastSummary(summary);
      appendSummary(summary);
    } catch (err: any) {
      setError(err.message || "Test batch failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="flex flex-col h-full bg-[#0b0c10] text-ca-ink overflow-hidden font-sans">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel: Configuration & Dataset */}
        <div className="w-[340px] flex flex-col bg-ca-panel border-r border-ca-border shrink-0 z-10">
          <div className="p-4 border-b border-ca-border bg-ca-panel-2">
            <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2 text-ca-ink">
              <PackagePlus className="w-5 h-5 text-ca-primary" /> AI Batch Test
            </h2>
          </div>
          
          <div className="p-4 space-y-4 border-b border-ca-border">
            <div>
              <label className="text-xs font-mono text-ca-ink-muted uppercase block mb-1">Target Ruleset</label>
              <select
                className="w-full rounded-sm border border-ca-border bg-[#0b0c10] p-2 text-sm font-bold uppercase focus:border-ca-primary focus:ring-1 focus:ring-ca-primary outline-none"
                value={rulesetId}
                onChange={(e) => setRulesetId(e.target.value)}
                disabled={running}
              >
                {rulesets.map((rs) => (
                  <option key={rs.id} value={rs.id}>{rs.name} [{rs.id.slice(0,6)}]</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-mono text-ca-ink-muted uppercase block">Dataset ({dataset.length})</label>
                <button
                  onClick={() => setDataset([])}
                  disabled={running || dataset.length === 0}
                  className="text-[10px] text-red-500 hover:text-red-400 font-mono disabled:opacity-50"
                >
                  CLEAR ALL
                </button>
              </div>
              
              <button
                onClick={() => fileInput.current?.click()}
                disabled={running}
                className="w-full py-2 bg-[#0b0c10] hover:bg-ca-panel-2 border border-ca-border rounded-sm text-xs font-bold uppercase transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload size={14} /> Add Images
              </button>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInput} onChange={(e) => addFiles(e.target.files!)} />
            </div>
            
            <button
              onClick={handleRunTests}
              disabled={!canRun}
              title={runDisabledReason || undefined}
              className={`w-full py-3 rounded-sm font-bold uppercase tracking-widest text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                canRun 
                  ? "bg-ca-primary text-ca-bg hover:bg-ca-primary/90" 
                  : "bg-ca-border text-ca-ink-muted cursor-not-allowed"
              }`}
            >
              {running ? (
                <><RefreshCw size={16} className="animate-spin" /> Running ({progressPercent}%)</>
              ) : (
                <><Play size={16} fill="currentColor" /> Execute Batch</>
              )}
            </button>
            {running && (
              <div className="w-full h-1 bg-ca-bg rounded overflow-hidden mt-2">
                <div className="h-full bg-ca-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {dataset.map((img) => (
              <div key={img.id} className="flex items-center gap-3 p-2 bg-[#0b0c10] border border-ca-border rounded-sm group relative">
                <img src={img.imageRef} alt={img.name} className="w-10 h-10 object-cover rounded-sm border border-ca-border/50" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ca-ink truncate">{img.name}</p>
                  <p className="text-[10px] font-mono text-ca-ink-muted">{(img.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => removeDatasetImage(img.id)}
                  disabled={running}
                  className="p-1.5 text-ca-ink-muted hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition disabled:opacity-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Results & History */}
        <div className="flex-1 flex flex-col bg-[#0b0c10] min-w-0">
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSummary ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-ca-border pb-4">
                  <h3 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="text-blue-500" /> Batch Summary
                  </h3>
                  <span className="text-xs font-mono text-ca-ink-muted">
                    {new Date(activeSummary.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBox label="Images Evaluated" value={activeSummary.imageCount} />
                  <StatBox label="Total Checks" value={activeSummary.totalChecks} />
                  <StatBox label="Overall Yield" value={`${(activeSummary.passRate * 100).toFixed(1)}%`} highlight={activeSummary.passRate >= 0.9 ? "good" : "bad"} />
                  <StatBox label="Failed Checks" value={activeSummary.ngChecks} highlight={activeSummary.ngChecks > 0 ? "bad" : "good"} />
                </div>

                <div className="bg-ca-panel border border-ca-border rounded-sm p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ca-ink-muted mb-4">Rule Performance Breakdown</h4>
                  <div className="space-y-4">
                    {activeSummary.perRule.map((stat, i) => (
                      <div key={i} className="flex flex-col border-b border-ca-border/50 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold uppercase font-mono">{stat.ruleName} <span className="text-ca-ink-muted ml-2">[{stat.kind}]</span></span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${stat.okCount === stat.totalChecks ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {stat.okCount} / {stat.totalChecks} PASS
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono text-ca-ink-muted">
                          <span>FAILURES: {stat.ngCount}</span>
                          <span>YIELD: {(stat.passRate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                    {activeSummary.perRule.length === 0 && (
                      <p className="text-xs font-mono text-ca-ink-muted">No tool evaluations recorded in this batch.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-ca-ink-muted opacity-50">
                <BarChart3 size={64} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No Batch Results</p>
                <p className="text-xs font-mono mt-2">Execute a batch run to view performance telemetry.</p>
              </div>
            )}
          </div>
          
          {/* History Timeline */}
          {timelineSummaries.length > 0 && (
            <div className="h-48 shrink-0 bg-ca-panel border-t border-ca-border flex flex-col">
              <div className="p-2 border-b border-ca-border bg-ca-panel-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Clock4 size={14} /> Batch History
                </span>
              </div>
              <div className="flex-1 overflow-x-auto p-4 flex items-center gap-4">
                {timelineSummaries.map((s) => {
                  const isActive = s.id === (activeSummary?.id);
                  const isGood = s.passRate >= 90;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSummaryId(s.id)}
                      className={`flex flex-col min-w-[160px] p-3 rounded border text-left transition ${
                        isActive 
                          ? "bg-ca-panel-2 border-ca-primary shadow-[0_0_0_1px_rgba(164,118,255,1)]" 
                          : "bg-[#0b0c10] border-ca-border hover:border-ca-ink-muted"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-mono text-ca-ink-muted">{new Date(s.createdAt).toLocaleTimeString()}</span>
                        <div className={`w-2 h-2 rounded-full ${isGood ? "bg-green-500" : "bg-red-500"}`} />
                      </div>
                      <span className="text-xl font-bold font-mono">{s.passRate}%</span>
                      <span className="text-[10px] uppercase text-ca-ink-muted mt-1">{s.imageCount} items</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string | number; highlight?: "good" | "bad" }) {
  return (
    <div className="bg-ca-panel border border-ca-border rounded p-4 flex flex-col shadow-sm">
      <span className="text-[10px] font-bold text-ca-ink-muted uppercase tracking-wider mb-2">{label}</span>
      <span className={`text-2xl font-mono font-bold ${
        highlight === "good" ? "text-green-400" : highlight === "bad" ? "text-red-400" : "text-ca-ink"
      }`}>{value}</span>
    </div>
  );
}

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
  const [isRunning, setIsRunning] = useState(false);
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

  const isRunnable = useMemo(
    () => Boolean(activeRuleset) && dataset.length > 0 && !isRunning,
    [activeRuleset, dataset.length, isRunning],
  );
  const runDisabledReason = useMemo(() => {
    if (isRunning) return "Run in progress.";
    if (!activeRuleset) return "Select a ruleset first.";
    if (dataset.length === 0) return "Add images to dataset.";

    return null;
  }, [activeRuleset, dataset.length, isRunning]);

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
      setIsRunning(true);
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
      setIsRunning(false);
    }
  }

  return (
    <section className="flex flex-col h-full bg-[#06080d] text-slate-100 overflow-hidden font-sans">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel: Configuration & Dataset */}
        <div className="w-[340px] flex flex-col bg-[#0a0d14]/90 border-r border-white/[0.08] shrink-0 z-10 backdrop-blur-xl">
          <div className="p-4 border-b border-white/[0.08] bg-white/[0.02]">
            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 text-slate-200 font-mono">
              <PackagePlus className="w-4 h-4 text-cyan-400" /> AI Batch Test Matrix
            </h2>
          </div>
          
          <div className="p-4 space-y-4 border-b border-white/[0.08]">
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Target Ruleset
              </label>
              <select
                className="w-full rounded-xl border border-white/[0.1] bg-[#07090e] p-2.5 text-xs font-semibold uppercase tracking-wider focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 outline-none text-slate-200 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
                value={rulesetId}
                onChange={(e) => setRulesetId(e.target.value)}
                disabled={isRunning}
              >
                {rulesets.map((rs) => (
                  <option key={rs.id} value={rs.id}>{rs.name} [{rs.id.slice(0, 6)}]</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  Dataset ({dataset.length} images)
                </label>
                <button
                  onClick={() => setDataset([])}
                  disabled={isRunning || dataset.length === 0}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-mono font-semibold uppercase disabled:opacity-40 transition-colors"
                >
                  Clear All
                </button>
              </div>
              
              <button
                onClick={() => fileInput.current?.click()}
                disabled={isRunning}
                className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.18] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-slate-200 disabled:opacity-40 shadow-sm"
              >
                <Upload size={14} className="text-cyan-400" /> Add Images
              </button>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInput} onChange={(e) => addFiles(e.target.files!)} />
            </div>
            
            <button
              onClick={handleRunTests}
              disabled={!isRunnable}
              title={runDisabledReason || undefined}
              className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2.5 ${
                isRunnable 
                  ? "border border-cyan-400/40 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-black shadow-[0_0_24px_rgba(6,182,212,0.45),inset_0_1px_0_0_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98]" 
                  : "border border-white/[0.06] bg-white/[0.02] text-slate-500 cursor-not-allowed opacity-50"
              }`}
            >
              {isRunning ? (
                <><RefreshCw size={15} className="animate-spin text-slate-950" /> Running ({progressPercent}%)</>
              ) : (
                <><Play size={15} fill="currentColor" /> Execute Batch</>
              )}
            </button>
            {isRunning && (
              <div className="w-full h-1.5 bg-[#06080d] border border-white/[0.06] rounded-full overflow-hidden mt-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {dataset.map((img) => (
              <div key={img.id} className="flex items-center gap-2.5 p-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.14] rounded-xl group relative transition-colors">
                <img src={img.imageRef} alt={img.name} className="w-10 h-10 object-cover rounded-lg border border-white/[0.1] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{img.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{(img.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => removeDatasetImage(img.id)}
                  disabled={isRunning}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Results & History */}
        <div className="flex-1 flex flex-col bg-[#06080d] min-w-0">
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSummary ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-slate-100 font-mono">
                    <BarChart3 className="text-cyan-400" size={18} /> Batch Summary Telemetry
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {new Date(activeSummary.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBox label="Images Evaluated" value={activeSummary.imageCount} />
                  <StatBox label="Total Checks" value={activeSummary.totalChecks} />
                  <StatBox label="Overall Yield" value={`${(activeSummary.passRate * 100).toFixed(1)}%`} highlight={activeSummary.passRate >= 0.9 ? "good" : "bad"} />
                  <StatBox label="Failed Checks" value={activeSummary.ngChecks} highlight={activeSummary.ngChecks > 0 ? "bad" : "good"} />
                </div>

                <div className="bg-[#0a0d14]/85 border border-white/[0.08] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 font-mono">Rule Performance Breakdown</h4>
                  <div className="space-y-4">
                    {activeSummary.perRule.map((stat, i) => (
                      <div key={i} className="flex flex-col border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase font-mono text-slate-200">{stat.ruleName} <span className="text-slate-400 ml-2 font-normal">[{stat.kind}]</span></span>
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${stat.okCount === stat.totalChecks ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]" : "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]"}`}>
                            {stat.okCount} / {stat.totalChecks} PASS
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-xs font-mono text-slate-400">
                          <span>FAILURES: {stat.ngCount}</span>
                          <span className="font-bold text-slate-200">YIELD: {(stat.passRate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full bg-[#06080d] border border-white/[0.05] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${stat.passRate >= 0.9 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"}`}
                            style={{ width: `${stat.passRate * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {activeSummary.perRule.length === 0 && (
                      <p className="text-xs font-mono text-slate-400">No tool evaluations recorded in this batch.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <BarChart3 size={56} className="mb-4 text-cyan-400/40" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-200 font-mono">No Batch Results</p>
                <p className="text-xs font-mono mt-1 text-slate-400">Execute a batch run to view performance telemetry.</p>
              </div>
            )}
          </div>
          
          {/* History Timeline */}
          {timelineSummaries.length > 0 && (
            <div className="h-44 shrink-0 bg-[#0a0d14]/90 border-t border-white/[0.08] flex flex-col backdrop-blur-xl">
              <div className="px-4 py-2 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-slate-200 font-mono">
                  <Clock4 size={13} className="text-cyan-400" /> Batch History
                </span>
              </div>
              <div className="flex-1 overflow-x-auto p-3.5 flex items-center gap-3">
                {timelineSummaries.map((s) => {
                  const isActive = s.id === (activeSummary?.id);
                  const isGood = s.passRate >= 90;

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSummaryId(s.id)}
                      className={`flex flex-col min-w-[150px] p-3 rounded-xl border text-left transition-all ${
                        isActive 
                          ? "bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_14px_rgba(6,182,212,0.25)]" 
                          : "bg-white/[0.02] border-white/[0.07] hover:border-white/[0.15]"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-mono text-slate-400">{new Date(s.createdAt).toLocaleTimeString()}</span>
                        <div className={`w-2 h-2 rounded-full ${isGood ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" : "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.9)]"}`} />
                      </div>
                      <span className="text-lg font-bold font-mono text-slate-100">{s.passRate}%</span>
                      <span className="text-[10px] uppercase text-slate-400 mt-0.5">{s.imageCount} items</span>
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
  const valueColor = highlight === "good" ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : highlight === "bad" ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" : "text-slate-100";
  const glowBorder = highlight === "good" ? "border-emerald-500/40" : highlight === "bad" ? "border-rose-500/40" : "border-white/[0.08]";

  return (
    <div className={`rounded-2xl border ${glowBorder} bg-gradient-to-b from-[#0e121b]/95 via-[#0a0d14]/85 to-[#06080d]/95 p-5 flex flex-col shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-4px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all`}>
      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</span>
      <span className={`text-2xl font-mono font-black tabular-nums tracking-tight ${valueColor}`}>{value}</span>
    </div>
  );
}

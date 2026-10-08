import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { Play, Upload, X, Camera, AlertCircle, History, Image as ImageIcon } from "lucide-react";
import {
  useProjectStore,
  selectProject,
  selectRulesetsForProject,
  selectRuleset,
} from "@/lib/projects/store";
import {
  runRuleset,
  useTrialStore,
  selectRunsForRuleset,
  type TrialRun,
} from "@/lib/projects/trials";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { toIntParam } from "@/lib/ids/int-alias";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const Route = createFileRoute("/projects/$projectId/trial-run")({
  component: TrialRunPage,
});

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Unexpected FileReader result"));
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

function TrialRunPage() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const appendRun = useTrialStore((s) => s.appendRun);

  if (!project) throw notFound();

  const [rulesetId, setRulesetId] = useState<string>(rulesets[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeRuleset = useProjectStore((s) =>
    rulesetId ? selectRuleset(s, rulesetId) : undefined,
  );
  const runs = useTrialStore((s) => selectRunsForRuleset(s, rulesetId));
  const isNonFile = !file;

  useEffect(() => {
    if (isNonFile) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canRun = useMemo(
    () => Boolean(activeRuleset) && (file !== null || Boolean(activeRuleset?.imageRef)),
    [activeRuleset, file],
  );

  function pickFile(f: File | null) {
    setError(null);
    if (!f) return setFile(null);
    if (f.type.startsWith("image/") === false) {
      setError(`Not an image file (${f.type || "unknown"}).`);
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      setError(`Image too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 4 MB.`);
      return;
    }
    setFile(f);
  }

  async function handleRun() {
    if (!activeRuleset) return;
    try {
      setRunning(true);
      setError(null);
      let runImage = activeRuleset.imageRef;
      if (file) {
        runImage = await readAsDataUrl(file);
      }
      if (!runImage) throw new Error("No image source available");

      const result = await runRuleset(activeRuleset, runImage);
      appendRun(result);
      if (fileInput.current) fileInput.current.value = "";
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Run failed.");
      reportLovableError({
        message: err.message,
        type: "Error",
        source: "trial-run",
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="flex flex-col h-full bg-[#0b0c10] text-ca-ink p-6 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        
        {/* Left Column - Main Interface */}
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between border-b border-ca-border pb-4">
            <h2 className="flex items-center gap-3 text-2xl font-bold font-sans uppercase tracking-wider">
              <Play className="h-6 w-6 text-ca-primary" fill="currentColor" /> 
              Trial Run Console
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-ca-panel border border-ca-border rounded p-4 flex flex-col justify-between">
              <div>
                <label className="text-xs font-mono text-ca-ink-muted uppercase block mb-2">
                  Active Ruleset / Target
                </label>
                <select
                  className="w-full rounded-sm border border-ca-border bg-[#0b0c10] p-2 text-sm font-bold font-sans uppercase focus:border-ca-primary focus:ring-1 focus:ring-ca-primary outline-none transition"
                  value={rulesetId}
                  onChange={(e) => {
                    setRulesetId(e.target.value);
                    setFile(null);
                    setError(null);
                  }}
                >
                  {rulesets.map((rs) => (
                    <option key={rs.id} value={rs.id}>
                      {rs.name} [{rs.id.slice(0,6)}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-ca-panel border border-ca-border rounded p-4 flex flex-col justify-between">
              <div>
                <label className="text-xs font-mono text-ca-ink-muted uppercase block mb-2">
                  Input Source Image
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#0b0c10] hover:bg-ca-panel-2 border border-ca-border rounded-sm text-xs font-bold uppercase transition"
                  >
                    <Upload size={14} /> {file ? "Change Image" : "Upload Override"}
                  </button>
                  {file && (
                    <button
                      onClick={() => setFile(null)}
                      className="px-3 py-2 bg-[#0b0c10] hover:bg-red-900/50 border border-ca-border hover:border-red-500 rounded-sm text-red-500 transition"
                      title="Clear Override"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    ref={fileInput}
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <p className="text-[10px] font-mono text-ca-ink-muted mt-2">
                {file ? file.name : (activeRuleset?.imageRef ? "Using original reference image." : "No reference image available.")}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/50 rounded p-4 text-red-400">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-bold uppercase">Run Error</p>
                <p className="text-xs font-mono mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Live Preview Area */}
          <div className="flex-1 min-h-[400px] border border-ca-border rounded bg-[#0b0c10] relative flex items-center justify-center overflow-hidden">
            {preview || activeRuleset?.imageRef ? (
              <img
                src={preview || activeRuleset?.imageRef}
                alt="Input Preview"
                className="max-w-full max-h-full object-contain opacity-80"
              />
            ) : (
              <div className="text-center text-ca-ink-muted flex flex-col items-center">
                <ImageIcon size={48} className="opacity-20 mb-4" />
                <p className="text-sm font-mono uppercase">Awaiting Image Source</p>
              </div>
            )}
            
            {/* Absolute Execution Button Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <button
                onClick={handleRun}
                disabled={!canRun || running}
                className="flex items-center gap-3 px-8 py-4 rounded font-bold uppercase tracking-widest text-sm transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                  bg-ca-primary text-ca-bg hover:bg-ca-primary/90 hover:scale-105 active:scale-95"
              >
                {running ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-ca-bg border-t-transparent rounded-full animate-spin"/> Executing</span>
                ) : (
                  <><Play size={18} fill="currentColor"/> Execute Trial Run</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Trial History */}
        <div className="flex flex-col bg-ca-panel border border-ca-border rounded overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-ca-panel-2 border-b border-ca-border">
            <History size={16} className="text-ca-ink-muted" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ca-ink">Trial History</h3>
            <span className="ml-auto text-[10px] font-mono bg-[#0b0c10] px-2 py-0.5 rounded text-ca-ink-muted border border-ca-border">
              {runs.length} RUNS
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {runs.length === 0 ? (
              <p className="text-xs font-mono text-ca-ink-muted text-center p-4">No trial runs recorded for this ruleset.</p>
            ) : (
              runs.map((r, i) => (
                <Link
                  key={r.id}
                  to={`/projects/$projectId/trial-run/$runId`}
                  params={{ projectId, runId: toIntParam(r.id, IntAliasNamespaceType.TrialRun) }}
                  className={`block border rounded p-3 transition hover:bg-ca-panel-2 ${
                    r.isPass ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                      r.isPass ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {r.isPass ? "PASS" : "FAIL"}
                    </span>
                    <span className="text-[10px] font-mono text-ca-ink-muted">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-ca-ink-muted mt-2 pt-2 border-t border-ca-border/50">
                    <span>{r.evaluations.length} tools</span>
                    <span>{r.durationMs.toFixed(1)}ms</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

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

  useEffect(() => {
    if (!file) {
      setPreview(null);

      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canRun = useMemo(
    () => Boolean(activeRuleset) && (file !== null || Boolean(activeRuleset?.imageRef)),
    [activeRuleset, file],
  );

  if (!project) {
    if (typeof window === "undefined") {
      return null;
    }

    return (
      <div className="flex flex-1 items-center justify-center p-hmi-6 text-hmi-body text-ca-ink-muted">
        Loading trial run...
      </div>
    );
  }

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

      const result = runRuleset({
        rulesetId: activeRuleset.id,
        rules: activeRuleset.rules,
        imageRef: runImage,
      });
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
    <section className="flex flex-col h-full bg-[#06080d] text-ca-ink p-8 overflow-y-auto font-sans">
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        
        {/* Left Column - Main Interface */}
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
            <h2 className="flex items-center gap-3 text-2xl font-bold font-sans uppercase tracking-wider text-white">
              <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
              Trial Run Console
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <label className="text-xs font-mono text-white/50 uppercase block mb-2">
                  Active Ruleset / Target
                </label>
                <select
                  className="w-full rounded-lg border border-white/15 bg-black/60 p-2.5 text-xs font-mono font-bold uppercase text-white focus:border-ca-primary focus:ring-1 focus:ring-ca-primary outline-none transition shadow-inner"
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

            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <label className="text-xs font-mono text-white/50 uppercase block mb-2">
                  Input Source Image
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black/60 hover:bg-white/10 border border-white/15 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition shadow-sm"
                  >
                    <Upload size={14} /> {file ? "Change Image" : "Upload Override"}
                  </button>
                  {file && (
                    <button
                      onClick={() => setFile(null)}
                      className="px-3 py-2 bg-black/60 hover:bg-rose-900/50 border border-white/15 hover:border-rose-500 rounded-lg text-rose-400 transition"
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
              <p className="text-[10px] font-mono text-white/40 mt-2">
                {file ? file.name : (activeRuleset?.imageRef ? "Using original reference image." : "No reference image available.")}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-300">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-bold uppercase">Run Error</p>
                <p className="text-xs font-mono mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Live Preview Area */}
          <div className="flex-1 min-h-[420px] rounded-2xl border border-white/10 bg-black/60 relative flex items-center justify-center overflow-hidden shadow-inner">
            {preview || activeRuleset?.imageRef ? (
              <img
                src={preview || activeRuleset?.imageRef}
                alt="Input Preview"
                className="max-w-full max-h-full object-contain opacity-85"
              />
            ) : (
              <div className="text-center text-white/40 flex flex-col items-center">
                <ImageIcon size={48} className="opacity-20 mb-4" />
                <p className="text-sm font-mono uppercase">Awaiting Image Source</p>
              </div>
            )}
            
            {/* Absolute Execution Button Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <button
                onClick={handleRun}
                disabled={!canRun || running}
                className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_24px_rgba(16,185,129,0.4)] disabled:opacity-40 disabled:cursor-not-allowed
                  bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:brightness-110 hover:scale-105 active:scale-95"
              >
                {running ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/> Executing</span>
                ) : (
                  <><Play size={16} fill="currentColor"/> Execute Trial Run</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Trial History */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 bg-black/50 border-b border-white/[0.08]">
            <History size={16} className="text-white/60" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Trial History</h3>
            <span className="ml-auto text-[10px] font-mono bg-white/[0.04] px-2.5 py-0.5 rounded-full text-white/60 border border-white/10 shadow-inner">
              {runs.length} RUNS
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {runs.length === 0 ? (
              <p className="text-xs font-mono text-white/40 text-center p-6">No trial runs recorded for this ruleset.</p>
            ) : (
              runs.map((r, i) => {
                const isPass = r.verdict === "OK";
                return (
                  <Link
                    key={r.id}
                    to={`/projects/$projectId/trial-run/$runId`}
                    params={{ projectId, runId: r.id }}
                    className={`block rounded-xl border p-3.5 transition-all hover:scale-[1.01] ${
                      isPass ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50" : "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                        isPass ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}>
                        {isPass ? "PASS" : "FAIL"}
                      </span>
                      <span className="text-[10px] font-mono text-white/50">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-white/40 mt-2 pt-2 border-t border-white/[0.06]">
                      <span>{r.results?.length ?? 0} tools</span>
                      <span>{r.durationMs?.toFixed(1) ?? 0}ms</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

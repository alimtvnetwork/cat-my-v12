import React from "react";
import { ArrowRight, CheckCircle2, GitCommit, Layers, ShieldAlert, Sparkles, XCircle } from "lucide-react";

export function MultiRulePipelineGuide(): React.JSX.Element {
  return (
    <div className="rounded border border-ca-border bg-ca-panel p-3 font-sans select-none text-xs space-y-3">
      {/* Title */}
      <div className="flex items-center gap-1.5 border-b border-ca-border pb-1.5 font-semibold text-ca-ink">
        <Layers className="h-4 w-4 text-cyan-400" />
        <span>Multi-Rule Chaining Architecture</span>
      </div>

      <p className="text-[11px] text-ca-ink-muted leading-relaxed">
        Industrial high-speed inspection chains multiple vision rules sequentially. If any rule fails, downstream rules are <strong>short-circuited (skipped)</strong> to eliminate redundant latency.
      </p>

      {/* Visual Execution Flowchart */}
      <div className="rounded border border-ca-border bg-ca-panel-2 p-2.5 space-y-2">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-ca-ink-muted">
          Active Multi-Rule Inspection Chain
        </div>

        {/* Step 1: Empty Pocket */}
        <div className="flex items-center gap-2 rounded bg-ca-bg p-2 border border-ca-border">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-mono font-bold text-slate-300">
            0
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ca-ink">Pocket Presence Check</div>
            <div className="text-[10px] text-ca-ink-muted">Determines if cavity is Empty or Occupied</div>
          </div>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-300">
            Gate
          </span>
        </div>

        <div className="flex justify-center text-ca-ink-muted">
          <ArrowRight className="h-3.5 w-3.5 rotate-90" />
        </div>

        {/* Step 2: Rule 1 Pin 1 */}
        <div className="flex items-center gap-2 rounded bg-ca-bg p-2 border border-amber-500/40">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-mono font-bold text-amber-300">
            1
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-amber-200">Rule 1: Pin 1 Orientation</div>
            <div className="text-[10px] text-ca-ink-muted">
              Hole datum offset (&plusmn;8px) &amp; angle deviation (0&deg;&ndash;10&deg;)
            </div>
          </div>
          <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-800">
            Short-Circuit
          </span>
        </div>

        <div className="flex justify-center text-ca-ink-muted">
          <ArrowRight className="h-3.5 w-3.5 rotate-90" />
        </div>

        {/* Step 3: Rule 2 Pattern Match */}
        <div className="flex items-center gap-2 rounded bg-ca-bg p-2 border border-emerald-500/40">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-mono font-bold text-emerald-300">
            2
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-emerald-200">Rule 2: Greyscale Pattern Matching</div>
            <div className="text-[10px] text-ca-ink-muted">
              24-box laser print constellation match (&ge;80%)
            </div>
          </div>
          <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300 border border-emerald-800">
            Final Verdict
          </span>
        </div>
      </div>

      {/* Guide: How to Connect More Rules */}
      <div className="rounded border border-cyan-500/30 bg-cyan-950/20 p-2.5 space-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-cyan-300">
          <GitCommit className="h-3.5 w-3.5" />
          <span>How to Connect More Than 2 Rules</span>
        </div>
        <p className="text-ca-ink-muted text-[10px] leading-relaxed">
          In Antigravity Vision, rules are linked into a composite pipeline using either:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-[10px] text-ca-ink-muted">
          <li>
            <strong className="text-ca-ink">DAG Dependencies (<code>appliesBefore: [ruleId]</code>)</strong>: Declares execution order. Rule A executes before Rule B.
          </li>
          <li>
            <strong className="text-ca-ink">Sequential Pipeline Tool (/setup/chain-events)</strong>: Drag-and-drop rule ordering with <code>haltOnFailure: true</code> enabled.
          </li>
          <li>
            <strong className="text-ca-ink">Adding Rule 3 &amp; Beyond</strong>:
            <span className="block text-cyan-200 mt-0.5">
              &bull; Rule 3: Flaw / Surface Defect Matching (Inverted reject)<br />
              &bull; Rule 4: 1D/2D Code Reader (DataMatrix)<br />
              &bull; Rule 5: Edge Width &amp; Pin Pitch
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

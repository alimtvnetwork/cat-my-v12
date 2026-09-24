import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  CHIP_GOOD_DATA_URL,
  CHIP_STM8_DATA_URL,
} from "./chip-assets";
import type { PatternMatchResultCardProps } from "./types";
import {
  POCKET_EMPTY_DATA_URL,
  TOTAL_BATCH_DEVICES,
} from "./useConveyorSimulation";

export function PatternMatchResultCard(props: PatternMatchResultCardProps): React.JSX.Element {
  const isSimulating = props.simulation?.isSimulating ?? false;
  const res = props.matchResult;
  const isPass = res?.isPass ?? false;

  if (isSimulating && props.simulation) {
    const {
      deviceResults,
      capturedFrames,
      capturedCount,
      inspectedCount,
      passedCount,
      failedCount,
      isBatchComplete,
      phase,
      selectedDeviceIndex,
      setSelectedDeviceIndex,
      resetSimulation,
      togglePlaying,
      evaluateAllCapturedPockets,
      isPlaying,
    } = props.simulation;

    const isPhaseCapturing = phase === "capturing";
    const isPhaseCompleted = phase === "completed";

    const emptyDefects = deviceResults.filter((r) => r?.chipType === "empty").length;
    const stm8Defects = deviceResults.filter((r) => r?.chipType === "stm8").length;

    const yieldPercent =
      inspectedCount > 0 ? Math.round((passedCount / inspectedCount) * 1000) / 10 : 100;

    return (
      <div className="flex flex-col h-full rounded border border-ca-border bg-ca-panel shadow-md overflow-hidden">
        {/* Header: Batch Status & Phase */}
        <div className="p-3 border-b border-ca-border bg-ca-panel-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isPhaseCapturing ? (
                <Camera className="h-4 w-4 text-cyan-400 animate-pulse" />
              ) : (
                <Activity className="h-4 w-4 text-emerald-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                {isPhaseCapturing
                  ? "Phase 1: Optical Pocket Capture"
                  : "Phase 2: Greyscale Pattern Evaluation"}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isPhaseCompleted
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  : "bg-cyan-950 text-cyan-300 border border-cyan-700 animate-pulse"
              }`}
            >
              {isPhaseCompleted
                ? "EVALUATION COMPLETE"
                : isPhaseCapturing
                ? `CAPTURING ${capturedCount}/${TOTAL_BATCH_DEVICES}`
                : "ANALYZING..."}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-ca-ink-muted">
              <span>
                {isPhaseCapturing
                  ? `Captured: ${capturedCount} / ${TOTAL_BATCH_DEVICES} Pockets`
                  : `Evaluated: ${inspectedCount} / ${TOTAL_BATCH_DEVICES} Devices`}
              </span>
              <span className="font-bold text-ca-ink">
                {isPhaseCapturing ? `Acquiring...` : `Yield: ${yieldPercent}%`}
              </span>
            </div>
            <div className="w-full bg-ca-bg h-2 rounded-full overflow-hidden border border-ca-border">
              <div
                className={`h-full transition-all duration-300 ${
                  isPhaseCapturing
                    ? "bg-cyan-500"
                    : "bg-gradient-to-r from-cyan-500 to-emerald-500"
                }`}
                style={{
                  width: `${
                    ((isPhaseCapturing ? capturedCount : inspectedCount) /
                      TOTAL_BATCH_DEVICES) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Phase 1 Action: Immediate Capture & Evaluate All */}
          {isPhaseCapturing && (
            <button
              type="button"
              onClick={evaluateAllCapturedPockets}
              className="w-full mt-1 flex items-center justify-center gap-1.5 rounded border border-cyan-500/50 bg-cyan-950/40 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-950/70 hover:border-cyan-400 transition-all shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400" />
              <span>Capture & Evaluate All Pockets Now</span>
            </button>
          )}

          {/* Counters Banner */}
          <div className="grid grid-cols-4 gap-1 pt-1 text-center font-mono text-[10px]">
            <div className="rounded p-1 border border-ca-border bg-ca-bg/60">
              <span className="text-ca-ink-muted block text-[9px]">TOTAL</span>
              <span className="font-extrabold text-ca-ink">{TOTAL_BATCH_DEVICES}</span>
            </div>
            <div className="rounded p-1 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
              <span className="block text-[9px] text-emerald-500/80">PASS</span>
              <span className="font-extrabold">{passedCount}</span>
            </div>
            <div className="rounded p-1 border border-rose-500/30 bg-rose-950/20 text-rose-400">
              <span className="block text-[9px] text-rose-500/80">WRONG PART</span>
              <span className="font-extrabold">{stm8Defects}</span>
            </div>
            <div className="rounded p-1 border border-amber-500/30 bg-amber-950/20 text-amber-400">
              <span className="block text-[9px] text-amber-500/80">EMPTY</span>
              <span className="font-extrabold">{emptyDefects}</span>
            </div>
          </div>
        </div>

        {/* 15-Pocket Scrollable Results List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
          {Array.from({ length: TOTAL_BATCH_DEVICES }, (_, i) => {
            const devResult = deviceResults[i];
            const capturedFrame = capturedFrames[i];
            const pocketTag = `Pocket #${String(i + 1).padStart(2, "0")}`;
            const isSelected = selectedDeviceIndex === i;
            const hasEvaluated = devResult !== null && devResult !== undefined;
            const isCaptured = capturedFrame !== null && capturedFrame !== undefined;

            if (hasEvaluated && devResult) {
              const hasPassed = devResult.isPass;
              const isEmpty = devResult.chipType === "empty";
              const isStm8 = devResult.chipType === "stm8";
              const thumbUrl =
                devResult.thumbnailDataUrl ||
                capturedFrame?.thumbnailDataUrl ||
                (isEmpty
                  ? POCKET_EMPTY_DATA_URL
                  : isStm8
                  ? CHIP_STM8_DATA_URL
                  : CHIP_GOOD_DATA_URL);

              return (
                <button
                  type="button"
                  key={pocketTag}
                  onClick={() => setSelectedDeviceIndex(i)}
                  className={`w-full text-left rounded p-2 border transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? "ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/30"
                      : hasPassed
                      ? "border-emerald-500/40 bg-emerald-950/15 hover:bg-emerald-950/25"
                      : isEmpty
                      ? "border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/30"
                      : "border-rose-500/50 bg-rose-950/20 hover:bg-rose-950/30"
                  }`}
                >
                  {/* Pocket Captured Image Thumbnail */}
                  <img
                    src={thumbUrl}
                    alt={pocketTag}
                    className="h-10 w-10 rounded border border-ca-border/80 bg-black/80 object-contain shrink-0 shadow-inner"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-ca-ink flex items-center gap-1.5 truncate">
                        {hasPassed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isEmpty ? "text-amber-400" : "text-rose-400"
                            }`}
                          />
                        )}
                        {pocketTag}
                        <span className="text-[10px] font-normal text-ca-ink-muted truncate">
                          ({isEmpty ? "Empty Pocket" : isStm8 ? "STM8S208" : "MEGA32U4"})
                        </span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-xs font-black">
                          {devResult.score.toFixed(1)}%
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            hasPassed
                              ? "bg-emerald-600 text-white"
                              : isEmpty
                              ? "bg-amber-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {hasPassed ? "PASS" : isEmpty ? "EMPTY" : "FAIL"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-ca-ink-muted">
                      <span>
                        Matched: {devResult.matchedCount} / {devResult.totalCount} marks
                      </span>
                      <span className="text-cyan-400">{devResult.executionTimeMs}ms</span>
                    </div>

                    {!hasPassed && (
                      <div
                        className={`mt-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded flex items-center justify-between border ${
                          isEmpty
                            ? "text-amber-300 bg-amber-950/40 border-amber-800/40"
                            : "text-rose-300 bg-rose-950/40 border-rose-800/40"
                        }`}
                      >
                        <span>
                          {isEmpty
                            ? "Defect: Empty Pocket (Missing Component)"
                            : "Defect: Wrong Part Model (STM8S208)"}
                        </span>
                        <span>Missing: {devResult.missingBoxNumbers.length} marks</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            }

            // Phase 1 Captured Snapshot (Awaiting evaluation)
            if (isCaptured && capturedFrame) {
              return (
                <div
                  key={pocketTag}
                  className="rounded p-2 border border-cyan-500/40 bg-cyan-950/20 flex items-center gap-2.5 text-ca-ink font-mono text-xs"
                >
                  <img
                    src={capturedFrame.thumbnailDataUrl}
                    alt={pocketTag}
                    className="h-9 w-9 rounded border border-cyan-500/50 bg-black/80 object-contain shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">{pocketTag}</span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700">
                        CAPTURED
                      </span>
                    </div>
                    <div className="text-[10px] text-ca-ink-muted mt-0.5">
                      Snapshot captured • Ready for evaluation
                    </div>
                  </div>
                </div>
              );
            }

            // Pending Pocket in Queue
            const isApproaching = i === capturedCount;

            return (
              <div
                key={pocketTag}
                className={`rounded p-2 border border-ca-border/60 bg-ca-bg/40 flex items-center justify-between text-ca-ink-muted font-mono text-xs ${
                  isApproaching
                    ? "border-cyan-500/40 bg-cyan-950/10 text-cyan-300/80 animate-pulse"
                    : ""
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {pocketTag}
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-ca-panel border border-ca-border">
                  {isApproaching ? "APPROACHING CAMERA..." : "IN QUEUE"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-2.5 border-t border-ca-border bg-ca-panel-2 flex gap-2">
          <button
            type="button"
            onClick={resetSimulation}
            className="flex-1 flex items-center justify-center gap-1.5 rounded border border-ca-border bg-ca-panel px-3 py-1.5 text-xs font-bold text-ca-ink hover:bg-ca-bg transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-ca-ink-muted" />
            <span>Restart Batch</span>
          </button>

          <button
            type="button"
            onClick={togglePlaying}
            className="flex-1 flex items-center justify-center gap-1.5 rounded bg-ca-select px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 active:scale-[0.99] transition-all"
          >
            {isPlaying ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-white" />
            )}
            <span>{isPlaying ? "Pause Conveyor" : "Resume Conveyor"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-ca-border bg-ca-panel p-3.5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-ca-border pb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-ca-ink">
          Pattern Match Inspection
        </span>
        {res ? (
          <span
            className={`px-2 py-0.5 rounded text-xs font-black tracking-wider uppercase shadow-sm ${
              isPass ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            }`}
          >
            {isPass ? "PASS" : "FAIL"}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-xs font-bold tracking-wider uppercase bg-ca-panel-2 text-ca-ink-muted border border-ca-border">
            READY
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-extrabold font-mono text-ca-ink">
            {res ? `${res.score}%` : "--%"}
          </div>
          <div className="text-[11px] text-ca-ink-muted">
            Matched: {res?.matchedCount ?? 0} / {res?.totalCount ?? props.totalBoxes} elements
          </div>
        </div>

        <div className="text-right font-mono text-[11px] text-ca-ink-muted space-y-0.5">
          <div>Offset: {res ? `(${res.offsetX}, ${res.offsetY})px` : "--"}</div>
          <div>Speed: {res ? `${res.executionTimeMs}ms` : "--"}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={props.onMatch}
        disabled={props.isMatching}
        className="w-full flex items-center justify-center gap-2 rounded bg-ca-select px-3 py-2 text-xs font-bold text-white shadow hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
      >
        {props.isMatching ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4 fill-white" />
        )}
        <span>{props.isMatching ? "Matching..." : "Match Pattern"}</span>
      </button>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Ruler, Camera, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  CALIBRATION_TARGET_PITCHES_UM,
  LEGACY_DEFAULT_UM_PER_PX,
  detectGridPitch,
  findActiveCalibration,
  findCalibrationHistory,
  useVisionCalibrationStore,
  type CalibrationTargetPitchUm,
  type GridDetectionResult,
  type VisionCalibration,
} from "@/lib/vision/calibration";
import { loadWorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

interface CalibrationPanelProps {
  projectId: string;
  /** Registered inspection image; used as the default calibration target source. */
  inspectionImageRef?: string | null;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function CalibrationPanel({
  projectId,
  inspectionImageRef,
}: CalibrationPanelProps): React.JSX.Element {
  const [targetPitchUm, setTargetPitchUm] = useState<CalibrationTargetPitchUm>(50);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detection, setDetection] = useState<GridDetectionResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const calibrations = useVisionCalibrationStore((s) => s.calibrations);
  const cameraId = useVisionCalibrationStore((s) => s.selectedCameraId);
  const setSelectedCameraId = useVisionCalibrationStore((s) => s.setSelectedCameraId);
  const addCalibration = useVisionCalibrationStore((s) => s.addCalibration);
  const setActiveCalibration = useVisionCalibrationStore((s) => s.setActiveCalibration);
  const removeCalibration = useVisionCalibrationStore((s) => s.removeCalibration);

  const activeCalibration = useMemo(
    () => findActiveCalibration(calibrations, cameraId, projectId),
    [calibrations, cameraId, projectId],
  );
  const history = useMemo(
    () => findCalibrationHistory(calibrations, cameraId, projectId),
    [calibrations, cameraId, projectId],
  );

  const handleAnalyzeTarget = async () => {
    if (!inspectionImageRef) {
      setErrorText(
        "No inspection image registered. Upload an image of the calibration target first.",
      );

      return;
    }

    setIsAnalyzing(true);
    setErrorText(null);
    setDetection(null);

    try {
      const imgData = await loadWorkpieceImageData(inspectionImageRef);

      if (!imgData) {
        setErrorText("Could not load the target image pixels.");

        return;
      }

      const result = detectGridPitch({
        width: imgData.width,
        height: imgData.height,
        rgba: imgData.rgba,
        knownPitchUm: targetPitchUm,
      });

      if (!result) {
        setErrorText(
          "No grid target detected. Make sure the image shows the cross-line / grid calibration target.",
        );

        return;
      }

      setDetection(result);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Grid detection failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveCalibration = () => {
    if (!detection) {
      return;
    }

    addCalibration({
      cameraId,
      recipeId: projectId,
      umPerPxX: detection.umPerPxX,
      umPerPxY: detection.umPerPxY,
      targetPitchUm,
      targetType: "cross-line-grid",
    });
    setDetection(null);
  };

  const renderCalibrationRow = (record: VisionCalibration) => (
    <div
      key={record.id}
      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${
        record.isActive
          ? "border-emerald-400/40 bg-emerald-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="min-w-0">
        <div className="font-mono text-[11px] font-bold text-white">
          {record.umPerPxX.toFixed(3)} µm/px (X) · {record.umPerPxY.toFixed(3)} µm/px (Y)
        </div>
        <div className="truncate font-sans text-[10px] text-white/50">
          {formatDateTime(record.createdAt)} · {record.targetPitchUm}µm {record.targetType}
          {record.isActive ? " · active" : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!record.isActive && (
          <button
            type="button"
            onClick={() => setActiveCalibration(record.id)}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-white/70 transition hover:border-emerald-400/50 hover:text-emerald-200"
          >
            Activate
          </button>
        )}
        <button
          type="button"
          onClick={() => removeCalibration(record.id)}
          aria-label="Delete calibration"
          className="rounded-md border border-white/10 bg-white/5 p-1.5 text-white/50 transition hover:border-rose-400/50 hover:text-rose-300"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/30 p-3 shadow-inner">
        <div className="flex items-center gap-2">
          <Ruler size={14} className="text-amber-300" />
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-white/90">
            Vision Calibration
          </h2>
        </div>
        <p className="font-sans text-[10px] leading-relaxed text-white/50">
          Convert pixels to microns with a known-pitch grid target. The active calibration drives
          pin pitch, device size and every micron measurement.
        </p>

        <div className="space-y-1">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Camera
          </span>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/50 px-2 py-1.5">
            <Camera size={12} className="shrink-0 text-white/40" />
            <input
              value={cameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              placeholder="default-camera"
              className="w-full bg-transparent font-mono text-[11px] text-white outline-none placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="space-y-1">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Target pitch
          </span>
          <div className="grid grid-cols-3 gap-1">
            {CALIBRATION_TARGET_PITCHES_UM.map((pitch) => (
              <button
                key={pitch}
                type="button"
                onClick={() => setTargetPitchUm(pitch)}
                className={`rounded-md border px-2 py-1.5 font-mono text-[11px] font-bold transition ${
                  targetPitchUm === pitch
                    ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                    : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                }`}
              >
                {pitch}µm
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleAnalyzeTarget()}
          disabled={isAnalyzing || !inspectionImageRef}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-black transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Ruler size={13} />
          {isAnalyzing ? "Detecting grid…" : "Detect grid on current image"}
        </button>

        {errorText && (
          <div className="flex items-start gap-1.5 rounded-lg border border-rose-400/30 bg-rose-950/40 px-2.5 py-2 font-sans text-[10px] text-rose-200">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {errorText}
          </div>
        )}

        {detection && (
          <div className="flex flex-col gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2.5">
            <div className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              <CheckCircle2 size={12} />
              Grid detected
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-white">
              <div className="rounded bg-black/40 px-2 py-1">
                <div className="text-[9px] uppercase text-white/40">µm/px X</div>
                <div className="font-bold text-emerald-300">{detection.umPerPxX.toFixed(3)}</div>
              </div>
              <div className="rounded bg-black/40 px-2 py-1">
                <div className="text-[9px] uppercase text-white/40">µm/px Y</div>
                <div className="font-bold text-emerald-300">{detection.umPerPxY.toFixed(3)}</div>
              </div>
            </div>
            <div className="font-sans text-[10px] text-white/50">{detection.message}</div>
            <button
              type="button"
              onClick={handleSaveCalibration}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-black transition hover:brightness-110 active:scale-95"
            >
              <CheckCircle2 size={13} />
              Save calibration
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/30 p-3 shadow-inner">
        <h3 className="font-sans text-[10px] font-bold uppercase tracking-wider text-white/60">
          Active calibration
        </h3>
        {activeCalibration ? (
          renderCalibrationRow(activeCalibration)
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 px-2.5 py-3 text-center font-sans text-[10px] text-white/40">
            None stored — measurements use the legacy estimate ({LEGACY_DEFAULT_UM_PER_PX} µm/px).
          </div>
        )}
      </section>

      {history.length > 1 && (
        <section className="flex flex-col gap-2 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/30 p-3 shadow-inner">
          <h3 className="font-sans text-[10px] font-bold uppercase tracking-wider text-white/60">
            History
          </h3>
          <div className="flex flex-col gap-1.5">
            {history.filter((c) => !c.isActive).map((record) => renderCalibrationRow(record))}
          </div>
        </section>
      )}
    </div>
  );
}

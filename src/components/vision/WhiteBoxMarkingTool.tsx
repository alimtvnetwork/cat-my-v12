import { useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { BoxReviewPanel } from "./white-box/BoxReviewPanel";
import { StandardImageToolbar } from "./standard/StandardImageToolbar";
import { CameraCaptureModal } from "./white-box/CameraCaptureModal";
import { PatternCanvas } from "./white-box/PatternCanvas";
import type { WhiteBoxToolProps } from "./white-box/types";
import { useWhiteBoxMarking } from "./white-box/useWhiteBoxMarking";
import { resolveMatcherSettings } from "@/domain/vision/pattern-search";

export function WhiteBoxMarkingTool(props: WhiteBoxToolProps = {}): React.JSX.Element {
  const model = useWhiteBoxMarking(props);
  // Matcher tuning (pattern tool only): values resolve from settings via
  // the single matcher intake; writes go to detection.* through the same
  // settings dispatcher the formulated-pattern effect uses. Surfaces
  // without settings/a dispatcher pass nothing and the panel hides the card.
  const matcherSettings = props.settings ? resolveMatcherSettings(props.settings) : null;
  const handleMatcherChange =
    (key: "lumaTolerance" | "searchMarginPx" | "searchStepPx") => (val: number) => {
      props.onSettingsChange?.((prev: any) => ({
        ...prev,
        detection: {
          ...((prev as any)?.detection ?? {}),
          [key]: val,
        },
      }));
    };
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  // Toolbar view modes (local to this tool, like StandardPatternSearch's):
  // regions/results gate the canvas layers, grid gates the container grid.
  // Defaults preserve today's drawing (all on, grid included).
  const [viewModes, setViewModes] = useState({ regions: true, results: true, grid: true });
  const buttonLabel = props.actionButtonLabel ?? (props.settings ? "Apply Pattern" : "Save Pattern");
  const activeRegion =
    model.regionEditMode === "mask" && model.selectedMaskIndex !== null
      ? model.maskRegions[model.selectedMaskIndex] ?? null
      : model.regionEditMode === "pattern"
        ? model.patternRegion
        : model.searchRegion;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080b0f] text-white font-sans select-none">
      <div className="flex h-full min-h-0 min-w-[1024px] flex-col">
        {/* Image toolbar (only when the tool runs with rule settings):
            same gating as the Matcher Tuning card — surfaces without a
            settings dispatcher see no change. Source/Rendering write the
            shared settings.view state exactly as in Standard; only zoom
            and viewModes have white-box canvas consumers in this pass.
            Refresh is intentionally unwired: the toolbar then resets zoom
            to 100 (its built-in fallback) instead of faking a re-run. */}
        {props.settings && props.onSettingsChange ? (
          <StandardImageToolbar
            settings={props.settings}
            setSettings={props.onSettingsChange}
            viewModes={viewModes}
            setViewModes={setViewModes}
          />
        ) : null}
        {/* Main Workspace (Left Canvas + Right Panel) */}
        <div className="flex min-h-0 flex-1 gap-2 p-2 pb-0">
          {/* Left: Canvas */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-[#2a3138] bg-[#0b0f14] shadow-sm">
            <PatternCanvas
              source={model.source}
              result={model.result}
              searchRegion={model.searchRegion}
              patternRegion={model.patternRegion}
              greyscaleLevel={model.greyscaleLevel}
              detectedBoxes={model.detectedBoxes}
              excludedNumbers={model.excludedNumbers}
              formulatedPattern={model.formulatedPattern}
              dragState={model.dragState}
              activeRegion={activeRegion}
              maskRegions={model.maskRegions}
              regionEditMode={model.regionEditMode}
              selectedMaskIndex={model.selectedMaskIndex}
              onSearchRegionChange={model.changeActiveCanvasRegion}
              onDragStateChange={model.setDragState}
              viewZoom={props.settings?.view?.zoom}
              viewModes={viewModes}
              regionShape={model.regionShape}
              onRegionShapeChange={model.changeRegionShape}
            />
          </div>
          
          {/* Right: Settings Panel */}
          <div className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded border border-[#2a3138] bg-[#11161b] shadow-sm">
            <BoxReviewPanel
              greyscaleLevel={model.greyscaleLevel}
              marginPx={model.marginPx}
              detectedBoxes={model.detectedBoxes}
              excludedNumbers={model.excludedNumbers}
              formulatedPattern={model.formulatedPattern}
              searchRegion={model.searchRegion}
              patternRegion={model.patternRegion}
              maskRegions={model.maskRegions}
              regionEditMode={model.regionEditMode}
              selectedMaskIndex={model.selectedMaskIndex}
              isSaving={model.isSaving}
              saveMessage={model.saveMessage}
              onGreyscaleChange={model.changeGreyscaleLevel}
              onMarginChange={model.changeMarginPx}
              lumaTolerance={matcherSettings?.lumaTolerance}
              searchMarginPx={matcherSettings?.searchMarginPx}
              searchStepPx={matcherSettings?.searchStepPx}
              onLumaToleranceChange={props.onSettingsChange ? handleMatcherChange("lumaTolerance") : undefined}
              onSearchMarginPxChange={props.onSettingsChange ? handleMatcherChange("searchMarginPx") : undefined}
              onSearchStepPxChange={props.onSettingsChange ? handleMatcherChange("searchStepPx") : undefined}
              onRegionEditModeChange={model.changeRegionEditMode}
              onAddMaskRegion={model.addMaskRegion}
              onAddPatternRegion={model.addPatternRegion}
              onSelectMaskRegion={model.selectMaskRegion}
              onDeleteMaskRegion={model.deleteMaskRegion}
              onMoveMaskRegion={model.moveMaskRegion}
              onRemoveBox={model.removeBox}
              onRestoreBox={model.restoreBox}
              onToggleBox={model.toggleBox}
              onIncludeAll={model.includeAllBoxes}
              onExcludeAll={model.excludeAllBoxes}
              onInvert={model.invertExclusions}
              onApplyPattern={model.applyPatternGeometry}
              actionButtonLabel={buttonLabel}
              onCancel={props.onCancel}
            />
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="m-2 flex h-12 shrink-0 items-center justify-between rounded border border-[#2a3138] bg-[#171b20] px-3 shadow-sm">
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded border border-[#3c4650] bg-[#20262d] px-4 py-1.5 text-xs font-bold uppercase text-white transition-colors hover:border-ca-select hover:bg-[#2a3138]">
              <Upload size={14} />
              Register Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (!file) return;

                  if (props.onImageRegistered) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = typeof reader.result === "string" ? reader.result : "";

                      if (dataUrl) props.onImageRegistered?.(dataUrl);
                    };
                    reader.readAsDataURL(file);
                  }

                  void model.loadFile(file);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="flex items-center gap-2 rounded border border-[#3c4650] bg-[#20262d] px-4 py-1.5 text-xs font-bold uppercase text-white transition-colors hover:border-cyan-400 hover:bg-cyan-950/20"
            >
              <Camera size={14} />
              Live Camera
            </button>
            <button
              type="button"
              onClick={() => {
                if (model.source) {
                  const targetRegion = model.searchRegion ?? {
                    x: 0,
                    y: 0,
                    width: model.source.width,
                    height: model.source.height,
                  };
                  void model.processRegion(model.source, targetRegion);
                }
              }}
              disabled={model.source === null || model.isProcessing}
              className="flex items-center gap-2 rounded bg-[#00ff9d] px-4 py-1.5 text-xs font-bold uppercase text-black shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              <RefreshCw size={14} className={model.isProcessing ? "animate-spin" : ""} />
              {model.isProcessing ? "Processing" : "Run"}
            </button>
          </div>
          
          <span className="font-mono text-xs text-ca-ink-muted">{model.message}</span>
        </div>
      </div>

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={model.loadCapturedFrame}
      />
    </section>
  );
}

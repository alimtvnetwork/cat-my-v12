import React, { useMemo, useState } from "react";
import {
  Binary,
  Camera,
  Circle,
  Disc,
  Ratio,
  RefreshCw,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { CameraCaptureModal } from "@/components/vision/white-box/CameraCaptureModal";
import { LayersPanel } from "@/components/vision/white-box/LayersPanel";
import type { CanvasLayer } from "@/components/vision/white-box/types";
import { Pin1Canvas, movePin1Layer } from "./Pin1Canvas";
import { Pin1ReviewPanel } from "./Pin1ReviewPanel";
import type { Pin1MarkingToolProps } from "./types";
import { usePin1Rule } from "./usePin1Rule";

export function Pin1MarkingTool(props: Pin1MarkingToolProps = {}): React.JSX.Element {
  const model = usePin1Rule(props as any);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  // Pin1 canvas layer state, lifted here so the LayersPanel lock and
  // reorder buttons drive the same state the canvas enforces (spec 54
  // §22 follow-up; previously the panel offered no lock/reorder at all).
  const [isSearchLocked, setIsSearchLocked] = useState(true);
  const [layerOrder, setLayerOrder] = useState<readonly ("search" | "package")[]>([
    "search",
    "package",
  ]);
  const buttonLabel = props.actionButtonLabel ?? "Save as Pin 1 Rule";
  const activeRegion =
    model.regionEditMode === "package"
      ? model.packageRegion
      : model.regionEditMode === "pin"
        ? null
        : model.searchRegion;

  // Layer stack, bottom to top: ROI, package region, numbered detected
  // holes. The panel displays them top-first. Lock and reorder are wired
  // to the Pin1Canvas state (spec 54 §22 follow-up): the ROI lock toggle
  // and the search/package chevrons drive the canvas enforcement, and
  // the panel reflects the live lock/order values.
  const layers = useMemo<CanvasLayer[]>(() => {
    const stack: CanvasLayer[] = [];

    if (model.searchRegion !== null) {
      stack.push({
        id: "roi",
        kind: "roi",
        label: "ROI — Search Region",
        isLocked: isSearchLocked,
        isVisible: true,
        rotationDeg: 0,
        zOrder: layerOrder.indexOf("search"),
      });
    }

    if (model.packageRegion !== null) {
      stack.push({
        id: "package",
        kind: "pattern",
        label: "Package Region",
        isLocked: false,
        isVisible: true,
        rotationDeg: 0,
        zOrder: layerOrder.indexOf("package"),
      });
    }

    for (const hole of model.detectedHoles) {
      stack.push({
        id: `hole-${hole.id}`,
        kind: "box",
        label: `#${hole.id}`,
        number: hole.id,
        isLocked: false,
        isVisible: hole.isKept,
        rotationDeg: 0,
        zOrder: 100 + hole.id,
      });
    }

    return [...stack].sort((a, b) => b.zOrder - a.zOrder);
  }, [model.searchRegion, model.packageRegion, model.detectedHoles, isSearchLocked, layerOrder]);

  const selectedLayerId =
    model.registeredPin1 !== null && model.registeredPin1 !== undefined
      ? `hole-${model.registeredPin1.id}`
      : model.regionEditMode === "package"
        ? "package"
        : "roi";

  function handleSelectLayer(id: string): void {
    if (id.startsWith("hole-")) {
      const hole = model.detectedHoles.find((item) => `hole-${item.id}` === id);

      if (hole !== undefined) {
        model.setPrimaryPin1Hole(hole.id);
      }

      return;
    }

    if (id === "package") {
      model.setRegionEditMode("package");
    } else {
      model.setRegionEditMode("search");
    }
  }

  function handleToggleLayerVisibility(id: string): void {
    if (id.startsWith("hole-")) {
      const hole = model.detectedHoles.find((item) => `hole-${item.id}` === id);

      if (hole !== undefined) {
        model.toggleKeepHole(hole.id);
      }
    }
  }

  function handleToggleLayerLock(id: string): void {
    // The panel only renders the lock button for kind === "roi" rows,
    // so this fires for the ROI only; package and holes have no lock
    // model in Pin1Canvas.
    if (id === "roi") {
      setIsSearchLocked((prev) => !prev);
    }
  }

  function handleBringLayerForward(id: string): void {
    const layerId = id === "roi" ? "search" : id === "package" ? "package" : null;

    if (layerId !== null) {
      movePin1Layer(layerId, 1, layerOrder, setLayerOrder);
    }
  }

  function handleSendLayerBackward(id: string): void {
    const layerId = id === "roi" ? "search" : id === "package" ? "package" : null;

    if (layerId !== null) {
      movePin1Layer(layerId, -1, layerOrder, setLayerOrder);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-black text-white font-sans select-none">
      <div className="flex h-full min-h-0 min-w-[1024px] flex-col">
        {/* Main Workspace */}
        <div className="flex min-h-0 flex-1">
          {/* Left: Canvas */}
          <div
            data-ui-id="ui-pin1-canvas-wrap"
            className="relative flex min-h-0 flex-1 flex-col border-r border-[#333]"
          >
            {/* Top-left absolute toolbar (Old HMI style over canvas) */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
              <div className="flex rounded border border-[#444] bg-[#222]/80 p-0.5 shadow">
                <button
                  type="button"
                  data-automation-id="pin1-shape-rectangle"
                  title="Rectangle Shape Tool"
                  onClick={() => model.setShapeType("rectangle")}
                  className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors ${
                    model.shapeType === "rectangle"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>Rect</span>
                </button>
                <button
                  type="button"
                  data-automation-id="pin1-shape-circle"
                  title="Circle Shape Tool"
                  onClick={() => model.setShapeType("circle")}
                  className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors ${
                    model.shapeType === "circle"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <Circle className="h-3.5 w-3.5" />
                  <span>Circle</span>
                </button>
                <button
                  type="button"
                  data-automation-id="pin1-shape-ring"
                  title="Ring Shape Tool"
                  onClick={() => model.setShapeType("ring")}
                  className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors ${
                    model.shapeType === "ring"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <Disc className="h-3.5 w-3.5" />
                  <span>Ring</span>
                </button>
                <button
                  type="button"
                  data-automation-id="pin1-shape-square"
                  title="Square Shape Tool"
                  onClick={() => model.setShapeType("square")}
                  className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors ${
                    model.shapeType === "square"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <Ratio className="h-3.5 w-3.5" />
                  <span>Square</span>
                </button>
              </div>
              <button
                type="button"
                onClick={model.toggleGreyscalePreview}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded shadow border ${
                  model.hasGreyscalePreview
                    ? "bg-[#00ff9d]/20 border-[#00ff9d] text-[#00ff9d]"
                    : "bg-[#222]/80 border-[#444] text-white hover:bg-[#333]"
                }`}
              >
                {model.hasGreyscalePreview ? "FILTERED (Binarized)" : "RAW (RGB)"}
              </button>
              <button
                type="button"
                onClick={model.clearCanvas}
                className="px-3 py-1.5 text-xs font-bold uppercase rounded shadow border border-[#444] bg-[#222]/80 text-white hover:bg-[#333]"
              >
                Clear
              </button>
            </div>

            <Pin1Canvas
              shapeType={model.shapeType}
              source={model.source}
              searchRegion={model.searchRegion}
              packageRegion={model.packageRegion}
              activeRegion={activeRegion}
              regionEditMode={model.regionEditMode}
              detectedHoles={model.detectedHoles}
              registeredPin1={model.registeredPin1}
              matchResult={model.matchResult}
              hasOverlays={props.hasCanvasOverlays ?? true}
              hasGreyscalePreview={model.hasGreyscalePreview}
              thresholdLuma={model.thresholdLuma}
              polarity={model.polarity}
              greyscaleMode={model.greyscaleMode}
              dragState={model.dragState}
              isSearchLocked={isSearchLocked}
              onSearchLockChange={setIsSearchLocked}
              layerOrder={layerOrder}
              onLayerOrderChange={setLayerOrder}
              onSearchRegionChange={model.handleActiveRegionChange}
              onDragStateChange={model.setDragState}
              onSelectHole={model.setPrimaryPin1Hole}
              onRegisterPoint={model.registerPin1AtPoint}
            />
          </div>

          {/* Right: Settings Panel */}
          <div
            data-tour="rule-config-controls"
            className="flex w-[380px] shrink-0 flex-col bg-[#1e1e1e]"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Pin1ReviewPanel
                thresholdLuma={model.thresholdLuma}
                polarity={model.polarity}
                minCircularity={model.minCircularity}
                minRadiusPx={model.minRadiusPx}
                maxRadiusPx={model.maxRadiusPx}
                tolerancePx={model.tolerancePx}
                searchRegion={model.searchRegion}
                packageRegion={model.packageRegion}
                regionEditMode={model.regionEditMode}
                detectedHoles={model.detectedHoles}
                registeredPin1={model.registeredPin1}
                matchResult={model.matchResult}
                isSaving={model.isSaving}
                saveMessage={model.saveMessage}
                actionButtonLabel={buttonLabel}
                shapeType={model.shapeType}
                onShapeTypeChange={model.setShapeType}
                greyscaleMode={model.greyscaleMode}
                onGreyscaleModeChange={model.changeGreyscaleMode}
                onThresholdChange={model.handleThresholdChange}
                onPolarityChange={model.handlePolarityChange}
                onCircularityChange={model.setMinCircularity}
                onRadiusRangeChange={(minR, maxR) => {
                  model.setMinRadiusPx(minR);
                  model.setMaxRadiusPx(maxR);
                }}
                onToleranceChange={model.setTolerancePx}
                onRegionEditModeChange={model.setRegionEditMode}
                onAddPackageRegion={model.addPackageRegion}
                onToggleKeepHole={model.toggleKeepHole}
                onSelectPrimaryPin1={model.setPrimaryPin1Hole}
                onIncludeAll={model.includeAllHoles}
                onExcludeAll={model.excludeAllHoles}
                onSaveRule={model.savePin1Rule}
                onCancel={props.onCancel}
              />
            </div>
            <div className="h-[240px] shrink-0">
              <LayersPanel
                layers={layers}
                selectedLayerId={selectedLayerId}
                panelId="ui-pin1-layers-panel"
                onSelectLayer={handleSelectLayer}
                onToggleLayerVisibility={handleToggleLayerVisibility}
                onToggleLayerLock={handleToggleLayerLock}
                onBringLayerForward={handleBringLayerForward}
                onSendLayerBackward={handleSendLayerBackward}
                isLayerReorderable={(layer) => layer.id === "roi" || layer.id === "package"}
              />
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="h-12 bg-[#2d2d2d] flex items-center justify-between px-4 shrink-0 border-t border-[#444]">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer px-4 py-1.5 bg-[#444] hover:bg-[#555] text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2">
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
              className="px-4 py-1.5 bg-[#444] hover:bg-[#555] text-white text-xs font-bold uppercase rounded transition-colors flex items-center gap-2"
            >
              <Camera size={14} />
              Live Camera
            </button>
            <button
              type="button"
              className="px-4 py-1.5 bg-[#00ff9d] text-black text-xs font-bold uppercase rounded transition-colors flex items-center gap-2 disabled:opacity-50"
              onClick={model.runDetection}
              disabled={model.source === null || model.isDetecting}
            >
              <RefreshCw size={14} className={model.isDetecting ? "animate-spin" : ""} />
              {model.isDetecting ? "Detecting..." : "Run"}
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

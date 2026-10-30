import { useMemo, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { BoxReviewPanel } from "./white-box/BoxReviewPanel";
import { CameraCaptureModal } from "./white-box/CameraCaptureModal";
import { LayersPanel } from "./white-box/LayersPanel";
import { PatternCanvas } from "./white-box/PatternCanvas";
import type { CanvasLayer, WhiteBoxToolProps } from "./white-box/types";
import { useWhiteBoxMarking } from "./white-box/useWhiteBoxMarking";

export function WhiteBoxMarkingTool(props: WhiteBoxToolProps = {}): React.JSX.Element {
  const model = useWhiteBoxMarking(props);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lockedLayerIds, setLockedLayerIds] = useState<ReadonlySet<string>>(new Set(["roi"]));
  const [hiddenLayerIds, setHiddenLayerIds] = useState<ReadonlySet<string>>(new Set());
  const [regionOrder, setRegionOrder] = useState<readonly string[] | null>(null);
  const [layerRotations, setLayerRotations] = useState<Readonly<Record<string, number>>>({});
  const [selectedBoxLayerId, setSelectedBoxLayerId] = useState<string | null>(null);
  const buttonLabel = props.actionButtonLabel ?? (props.settings ? "Apply Pattern" : "Save Pattern");
  const activeRegion =
    model.regionEditMode === "mask" && model.selectedMaskIndex !== null
      ? model.maskRegions[model.selectedMaskIndex] ?? null
      : model.regionEditMode === "pattern"
        ? model.patternRegion
        : model.searchRegion;

  // Layer stack, bottom to top: ROI, pattern region, masks, numbered
  // pattern boxes. The panel displays them top-first.
  const layers = useMemo<CanvasLayer[]>(() => {
    const stack: CanvasLayer[] = [];

    if (model.searchRegion !== null) {
      stack.push({
        id: "roi",
        kind: "roi",
        label: "ROI — Search Region",
        isLocked: lockedLayerIds.has("roi"),
        isVisible: hiddenLayerIds.has("roi") === false,
        rotationDeg: layerRotations["roi"] ?? 0,
        zOrder: 0,
      });
    }

    if (model.patternRegion !== null) {
      stack.push({
        id: "pattern",
        kind: "pattern",
        label: "Pattern Region",
        isLocked: false,
        isVisible: hiddenLayerIds.has("pattern") === false,
        rotationDeg: layerRotations["pattern"] ?? 0,
        zOrder: 1,
      });
    }

    for (let index = 0; index < model.maskRegions.length; index += 1) {
      stack.push({
        id: `mask-${index}`,
        kind: "mask",
        label: `Mask ${index + 1}`,
        isLocked: false,
        isVisible: hiddenLayerIds.has(`mask-${index}`) === false,
        rotationDeg: layerRotations[`mask-${index}`] ?? 0,
        zOrder: 2 + index,
      });
    }

    for (const box of model.detectedBoxes) {
      stack.push({
        id: `box-${box.number}`,
        kind: "box",
        label: `#${String(box.number).padStart(2, "0")}`,
        number: box.number,
        isLocked: false,
        isVisible:
          model.excludedNumbers.has(box.number) === false &&
          hiddenLayerIds.has(`box-${box.number}`) === false,
        rotationDeg: 0,
        zOrder: 100 + box.number,
      });
    }

    return [...stack].sort((a, b) => b.zOrder - a.zOrder);
  }, [
    model.searchRegion,
    model.patternRegion,
    model.maskRegions,
    model.detectedBoxes,
    model.excludedNumbers,
    lockedLayerIds,
    hiddenLayerIds,
    layerRotations,
  ]);

  const defaultRegionOrder = useMemo(() => {
    const order = ["roi", "pattern"];

    for (let index = 0; index < model.maskRegions.length; index += 1) {
      order.push(`mask-${index}`);
    }

    return order.filter((id) => layers.some((layer) => layer.id === id));
  }, [model.maskRegions.length, layers]);

  const effectiveRegionOrder = regionOrder ?? defaultRegionOrder;

  const selectedLayerId =
    selectedBoxLayerId !== null &&
    model.detectedBoxes.some((box) => `box-${box.number}` === selectedBoxLayerId)
      ? selectedBoxLayerId
      : model.regionEditMode === "mask" && model.selectedMaskIndex !== null
        ? `mask-${model.selectedMaskIndex}`
        : model.regionEditMode === "pattern"
          ? "pattern"
          : "roi";

  function toggleInSet(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
    const next = new Set(set);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    return next;
  }

  function moveRegionLayer(id: string, direction: 1 | -1): void {
    const order = [...effectiveRegionOrder];
    const index = order.indexOf(id);

    if (index === -1) {
      return;
    }

    const target = index + direction;

    if (target < 0 || target >= order.length) {
      return;
    }

    order[index] = order[target];
    order[target] = id;
    setRegionOrder(order);
  }

  function handleSelectLayer(id: string): void {
    if (id.startsWith("box-")) {
      setSelectedBoxLayerId(id);

      return;
    }

    setSelectedBoxLayerId(null);

    if (id.startsWith("mask-")) {
      model.selectMaskRegion(Number(id.slice("mask-".length)));
    } else if (id === "pattern") {
      model.changeRegionEditMode("pattern");
    } else {
      model.changeRegionEditMode("search");
    }
  }

  function handleToggleLayerVisibility(id: string): void {
    if (id.startsWith("box-")) {
      model.toggleBox(Number(id.slice("box-".length)));

      return;
    }

    setHiddenLayerIds((prev) => toggleInSet(prev, id));
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080b0f] text-white font-sans select-none">
      <div className="flex h-full min-h-0 min-w-[1024px] flex-col">
        {/* Main Workspace (Left Canvas + Right Panel) */}
        <div className="flex min-h-0 flex-1 gap-2 p-2 pb-0">
          {/* Left: Canvas */}
          <div
            data-ui-id="ui-whitebox-canvas"
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-[#2a3138] bg-[#0b0f14] shadow-sm"
          >
            <PatternCanvas
              source={model.source}
              result={model.result}
              searchRegion={model.searchRegion}
              patternRegion={model.patternRegion}
              greyscaleLevel={model.greyscaleLevel}
              greyscaleMode={model.greyscaleMode}
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
              hasOverlays={props.hasCanvasOverlays ?? true}
              isSearchRegionLocked={lockedLayerIds.has("roi")}
              onSearchRegionLockChange={(isLocked) =>
                setLockedLayerIds((prev) => {
                  const next = new Set(prev);

                  if (isLocked) {
                    next.add("roi");
                  } else {
                    next.delete("roi");
                  }

                  return next;
                })
              }
              hiddenLayerIds={hiddenLayerIds}
              layerOrder={effectiveRegionOrder}
              layerRotations={layerRotations}
              onRegionRotationChange={(layerId, degrees) =>
                setLayerRotations((prev) => ({ ...prev, [layerId]: degrees }))
              }
              onBringLayerForward={(id) => moveRegionLayer(id, 1)}
              onSendLayerBackward={(id) => moveRegionLayer(id, -1)}
              onToggleLayerLock={(id) => setLockedLayerIds((prev) => toggleInSet(prev, id))}
              onToggleLayerVisibility={handleToggleLayerVisibility}
            />
          </div>

          {/* Right: Settings Panel */}
          <div
            data-tour="rule-config-controls"
            className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded border border-[#2a3138] bg-[#11161b] shadow-sm"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
            <BoxReviewPanel
              greyscaleLevel={model.greyscaleLevel}
              greyscaleMode={model.greyscaleMode}
              onGreyscaleModeChange={model.changeGreyscaleMode}
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
              onRegionEditModeChange={model.changeRegionEditMode}
              onAddMaskRegion={model.addMaskRegion}
              onAddPatternRegion={model.addPatternRegion}
              onSelectMaskRegion={model.selectMaskRegion}
              onDeleteMaskRegion={model.deleteMaskRegion}
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
            <div className="h-[240px] shrink-0">
              <LayersPanel
                layers={layers}
                selectedLayerId={selectedLayerId}
                panelId="ui-whitebox-layers-panel"
                onSelectLayer={handleSelectLayer}
                onToggleLayerVisibility={handleToggleLayerVisibility}
                onBringLayerForward={(id) => moveRegionLayer(id, 1)}
                onSendLayerBackward={(id) => moveRegionLayer(id, -1)}
                onToggleLayerLock={(id) => setLockedLayerIds((prev) => toggleInSet(prev, id))}
              />
            </div>
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

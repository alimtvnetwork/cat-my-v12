import React from "react";
import { ShapeType } from "@/domain/vision/shapes";
import { PatternShapes, MaskShapes, DetectionColorType } from "@/domain/vision/pattern-search";

export interface InspectionRegionGeometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  angle?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  points?: Array<{ x: number; y: number }>;
}

export interface InspectionRegionData {
  shape: ShapeType;
  geometry: InspectionRegionGeometry;
}

export interface MaskRegionData {
  shape: ShapeType;
  geometry: InspectionRegionGeometry;
}

export interface ImageRegionData {
  enabled: boolean;
  referenceTool: string | null;
  detectionColor: DetectionColorType;
}

export interface InspectionRegionTabProps {
  inspectionRegion?: InspectionRegionData;
  masks?: MaskRegionData[];
  imageRegion?: ImageRegionData;
  onChangeInspectionRegion?: (region: InspectionRegionData) => void;
  onChangeMasks?: (masks: MaskRegionData[]) => void;
  onChangeImageRegion?: (imageRegion: ImageRegionData) => void;
  onCancel?: () => void;
  onOk?: () => void;
  onPreview?: () => void;
}

const defaultRegion: InspectionRegionData = {
  shape: ShapeType.Rectangle,
  geometry: { x: 50, y: 50, width: 200, height: 150 },
};

export function InspectionRegionTab({
  inspectionRegion = defaultRegion,
  masks = [],
  imageRegion,
  onChangeInspectionRegion,
  onChangeMasks,
  onChangeImageRegion,
  onCancel,
  onOk,
  onPreview,
}: InspectionRegionTabProps): React.JSX.Element {
  const [internalRegion, setInternalRegion] =
    React.useState<InspectionRegionData>(inspectionRegion);
  const [internalMasks, setInternalMasks] = React.useState<MaskRegionData[]>(masks);
  const activeRegion = inspectionRegion || internalRegion;
  const activeMasks = masks || internalMasks;

  const handleRegionChange = (reg: InspectionRegionData) => {
    setInternalRegion(reg);
    onChangeInspectionRegion?.(reg);
  };

  const handleMasksChange = (m: MaskRegionData[]) => {
    setInternalMasks(m);
    onChangeMasks?.(m);
  };

  const [isRegionExpanded, setIsRegionExpanded] = React.useState(true);

  return (
    <div className="flex flex-col h-full text-ca-ink font-sans">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Section 1: Inspection Region */}
        <div className="flex flex-col border-b border-ca-border">
          <div className="flex items-center justify-between bg-ca-panel-2 px-3 py-1.5 border-b border-ca-border">
            <h3 className="font-semibold text-xs uppercase tracking-wide text-ca-ink">
              Inspection Region
            </h3>
            <button
              type="button"
              aria-label="Toggle inspection region panel"
              onClick={() => setIsRegionExpanded((prev) => !prev)}
              className="text-ca-ink-muted hover:text-ca-ink px-1.5 border border-ca-border bg-ca-panel rounded text-xs leading-none h-5 shadow-sm"
            >
              {isRegionExpanded ? "<<" : ">>"}
            </button>
          </div>

          {isRegionExpanded && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-ca-ink-muted">Region Shape</span>
                <select
                  value={activeRegion.shape}
                  onChange={(e) => {
                    const newShapeType = e.target.value as ShapeType;
                    const newShape =
                      PatternShapes.find((m) => m.id === newShapeType) || PatternShapes[0];
                    handleRegionChange({
                      shape: newShapeType,
                      geometry:
                        newShapeType !== activeRegion.shape
                          ? (newShape.defaultGeometry as InspectionRegionGeometry)
                          : activeRegion.geometry,
                    });
                  }}
                  className="w-36 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs text-ca-ink"
                >
                  {PatternShapes.map((shape) => (
                    <option key={shape.id} value={shape.id}>
                      {shape.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="flex flex-col">
                  <label className="text-[10px] text-ca-ink-muted font-mono">X</label>
                  <input
                    type="number"
                    value={Math.round(activeRegion.geometry.x || 0)}
                    onChange={(e) =>
                      handleRegionChange({
                        ...activeRegion,
                        geometry: { ...activeRegion.geometry, x: Number(e.target.value) },
                      })
                    }
                    className="bg-ca-bg border border-ca-border rounded px-1.5 py-1 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] text-ca-ink-muted font-mono">Y</label>
                  <input
                    type="number"
                    value={Math.round(activeRegion.geometry.y || 0)}
                    onChange={(e) =>
                      handleRegionChange({
                        ...activeRegion,
                        geometry: { ...activeRegion.geometry, y: Number(e.target.value) },
                      })
                    }
                    className="bg-ca-bg border border-ca-border rounded px-1.5 py-1 text-xs font-mono"
                  />
                </div>
                {activeRegion.shape !== ShapeType.Circle ? (
                  <>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-ca-ink-muted font-mono">Width</label>
                      <input
                        type="number"
                        value={Math.round(activeRegion.geometry.width || 0)}
                        onChange={(e) =>
                          handleRegionChange({
                            ...activeRegion,
                            geometry: { ...activeRegion.geometry, width: Number(e.target.value) },
                          })
                        }
                        className="bg-ca-bg border border-ca-border rounded px-1.5 py-1 text-xs font-mono"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-ca-ink-muted font-mono">Height</label>
                      <input
                        type="number"
                        value={Math.round(activeRegion.geometry.height || 0)}
                        onChange={(e) =>
                          handleRegionChange({
                            ...activeRegion,
                            geometry: { ...activeRegion.geometry, height: Number(e.target.value) },
                          })
                        }
                        className="bg-ca-bg border border-ca-border rounded px-1.5 py-1 text-xs font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col">
                    <label className="text-[10px] text-ca-ink-muted font-mono">Radius</label>
                    <input
                      type="number"
                      value={Math.round(activeRegion.geometry.radius || 0)}
                      onChange={(e) =>
                        handleRegionChange({
                          ...activeRegion,
                          geometry: { ...activeRegion.geometry, radius: Number(e.target.value) },
                        })
                      }
                      className="bg-ca-bg border border-ca-border rounded px-1.5 py-1 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Mask Regions */}
        <div className="flex flex-col border-b border-ca-border">
          <div className="bg-ca-panel-2 px-3 py-1.5 border-b border-ca-border">
            <h3 className="font-semibold text-xs uppercase tracking-wide text-ca-ink">
              Mask Regions (Max 4)
            </h3>
          </div>

          <div className="p-3 flex flex-col gap-2">
            {[0, 1, 2, 3].map((maskIndex) => {
              const mask = activeMasks[maskIndex];
              const isMaskEnabled = !!mask;

              return (
                <div
                  key={maskIndex}
                  className="flex items-center justify-between text-xs p-1.5 bg-ca-panel border border-ca-border rounded"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMaskEnabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newMasks = [...activeMasks];
                          newMasks[maskIndex] = {
                            shape: ShapeType.Rectangle,
                            geometry: { x: 60 + maskIndex * 20, y: 60, width: 40, height: 40 },
                          };
                          handleMasksChange(newMasks);
                        } else {
                          const newMasks = activeMasks.filter((_, idx) => idx !== maskIndex);
                          handleMasksChange(newMasks);
                        }
                      }}
                      className="accent-ca-select rounded"
                    />
                    <span className="font-medium text-ca-ink">Mask {maskIndex + 1}</span>
                  </label>

                  {isMaskEnabled && (
                    <select
                      value={mask.shape}
                      onChange={(e) => {
                        const newShapeType = e.target.value as ShapeType;
                        const newShape =
                          MaskShapes.find((m) => m.id === newShapeType) || MaskShapes[0];
                        const newMasks = [...activeMasks];
                        newMasks[maskIndex] = {
                          shape: newShapeType,
                          geometry:
                            newShapeType !== mask.shape
                              ? (newShape.defaultGeometry as InspectionRegionGeometry)
                              : mask.geometry,
                        };
                        handleMasksChange(newMasks);
                      }}
                      className="bg-ca-bg border border-ca-border rounded px-1.5 py-0.5 text-xs text-ca-ink"
                    >
                      {MaskShapes.map((shape) => (
                        <option key={shape.id} value={shape.id}>
                          {shape.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Standard Action Buttons */}
      {(onCancel || onOk || onPreview) && (
        <div className="flex items-center justify-between p-3 border-t border-ca-border bg-ca-panel-2">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="px-3 py-1.5 border border-ca-border bg-ca-panel rounded text-xs font-semibold hover:bg-ca-panel-2 text-ca-ink"
            >
              Test Preview
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 border border-ca-border bg-ca-panel rounded text-xs font-semibold hover:bg-ca-panel-2 text-ca-ink"
              >
                Cancel
              </button>
            )}
            {onOk && (
              <button
                type="button"
                onClick={onOk}
                className="px-4 py-1.5 bg-ca-select text-ca-bg rounded text-xs font-bold hover:opacity-90 shadow-sm"
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

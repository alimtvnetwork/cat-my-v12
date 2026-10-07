import React, { useState, useMemo, useRef } from "react";
import { X, Search, Plus, Camera, Upload } from "lucide-react";
import {
  VISION_TOOL_CATALOG,
  InspectionCategoryType,
  getVisionToolsByCategory,
  findVisionTool,
  type VisionToolDefinition,
} from "@/lib/vision/tool-catalog";
import type { EditorRule } from "@/lib/editor/types";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";
import { createDefaultPatternSearchSettings } from "@/domain/vision/pattern-search";
import { ShapeType } from "@/domain/vision/shapes";

export interface AddRuleFromToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRule: (rule: EditorRule, overrideImageRef?: string) => void;
  existingRules: EditorRule[];
}

function generateRuleId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AddRuleFromToolModal({
  isOpen,
  onClose,
  onAddRule,
  existingRules,
}: AddRuleFromToolModalProps): React.JSX.Element | null {
  const [selectedCategory, setSelectedCategory] = useState<InspectionCategoryType | "All">("All");
  const [selectedTool, setSelectedTool] = useState<VisionToolDefinition | null>(null);
  const [showImageChoice, setShowImageChoice] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTools = useMemo(() => {
    return selectedCategory === "All"
      ? [...VISION_TOOL_CATALOG]
      : getVisionToolsByCategory(selectedCategory);
  }, [selectedCategory]);

  if (!isOpen) return null;

  const handleImageChoice = (choice: "current" | "upload") => {
    if (choice === "current") {
      commitRule(undefined);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        commitRule(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const commitRule = (imageRef?: string) => {
    if (!selectedTool) return;
    
    const ruleCount = existingRules.length;
    const ruleId = generateRuleId();
    const effectiveName = `Rule ${ruleCount + 1}: ${selectedTool.name.replace(/ \(.*\)/, "")}`;
    
    let initialRoiVal = { x: 180, y: 120, width: 220, height: 220 };
    if (selectedTool.code === "T102" || selectedTool.code === "T116" || selectedTool.name.toLowerCase().includes("pattern")) {
      initialRoiVal = { x: 340, y: 175, width: 350, height: 180 };
    } else if (selectedTool.code === "T105" || selectedTool.code === "T117" || selectedTool.name.toLowerCase().includes("pin 1")) {
      initialRoiVal = { x: 200, y: 215, width: 100, height: 100 };
    } else if (selectedTool.code === "T118" || selectedTool.name.toLowerCase().includes("defect") || selectedTool.name.toLowerCase().includes("flaw")) {
      initialRoiVal = { x: 200, y: 360, width: 480, height: 160 };
    } else if (selectedTool.code === "T110" || selectedTool.name.toLowerCase().includes("caliper")) {
      initialRoiVal = { x: 180, y: 200, width: 280, height: 120 };
    }

    const defaultThresh = selectedTool.defaultParamValues?.threshold ?? selectedTool.defaultParamValues?.greyscaleLevel ?? 170;
    const defaultTol = selectedTool.defaultParamValues?.tolerancePx ?? 8;

    const newRule: EditorRule = {
      id: ruleId,
      name: effectiveName,
      kind: selectedTool.kind ?? EditorRuleKindType.R,
      family: selectedTool.family ?? EditorToolFamilyType.Rect,
      categoryName: selectedTool.category,
      isHidden: false,
      isLocked: false,
      x: initialRoiVal.x,
      y: initialRoiVal.y,
      width: initialRoiVal.width,
      height: initialRoiVal.height,
      params: {
        toolCode: selectedTool.code,
        category: selectedTool.category,
        x: initialRoiVal.x,
        y: initialRoiVal.y,
        width: initialRoiVal.width,
        height: initialRoiVal.height,
        threshold: Number(defaultThresh),
        marginPx: Number(defaultTol),
        tolerancePx: Number(defaultTol),
        activeBoxCount: 0,
        totalBoxCount: 0,
        constellationJson: "[]",
      },
      cameraSettings: {
        exposureUs: Math.round(selectedTool.defaultExposureMs * 1000),
        gainDb: selectedTool.defaultGainDb,
      },
      lightSettings: {
        intensity: selectedTool.defaultLightPct,
        channel: selectedTool.defaultChannels[0] || 1,
        strobeDurationUs: selectedTool.defaultStrobeUs,
        hasStrobe: true,
      },
    };

    onAddRule(newRule, imageRef);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-hmi-4">
      <div className="flex h-[80vh] w-[90vw] max-w-6xl flex-col bg-ca-panel shadow-2xl border border-ca-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ca-border bg-[#1c1c1c] px-4 py-2">
          <h2 className="text-sm font-bold text-ca-ink">Tool Catalog / Add Rule</h2>
          <button onClick={onClose} className="text-ca-ink-muted hover:text-ca-ink">
            <X size={20} />
          </button>
        </div>

        {showImageChoice && selectedTool ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-black">
            <h3 className="text-lg font-bold text-ca-ink mb-2">Select Image Source</h3>
            <p className="text-sm text-ca-ink-muted mb-8 max-w-md">
              Choose the reference image for tuning <strong>{selectedTool.name}</strong>.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => handleImageChoice("current")}
                className="flex flex-col items-center justify-center w-48 h-48 border-2 border-ca-border bg-ca-panel hover:border-amber-500 hover:bg-amber-950/20 transition-colors rounded-lg group"
              >
                <Camera size={48} className="mb-4 text-ca-ink-muted group-hover:text-amber-500" />
                <span className="font-bold text-ca-ink group-hover:text-amber-400">Current Image</span>
                <span className="text-[10px] text-ca-ink-muted mt-2">Use active camera feed</span>
              </button>
              
              <button 
                onClick={() => handleImageChoice("upload")}
                className="flex flex-col items-center justify-center w-48 h-48 border-2 border-ca-border bg-ca-panel hover:border-amber-500 hover:bg-amber-950/20 transition-colors rounded-lg group"
              >
                <Upload size={48} className="mb-4 text-ca-ink-muted group-hover:text-amber-500" />
                <span className="font-bold text-ca-ink group-hover:text-amber-400">Upload Image</span>
                <span className="text-[10px] text-ca-ink-muted mt-2">Browse for image file</span>
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            
            <button 
              onClick={() => setShowImageChoice(false)}
              className="mt-8 text-xs text-ca-ink-muted hover:text-ca-ink underline"
            >
              Cancel and back to catalog
            </button>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 bg-black">
            {/* Left: Categories & Grid */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-ca-border">
              {/* Top area: category tiles */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 p-2 bg-[#18181b] border-b border-ca-border">
                {(["All", ...Object.values(InspectionCategoryType)] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center justify-center h-10 px-2 text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                      selectedCategory === cat
                        ? "bg-amber-500/20 border-amber-500 text-amber-500"
                        : "bg-ca-panel border-ca-border text-ca-ink-muted hover:border-ca-select/50 hover:text-ca-ink"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Middle/lower area: preferred tools grid */}
              <div className="flex-1 overflow-y-auto p-2 bg-[#0a0a0a]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool)}
                      className={`flex flex-col items-center justify-center p-3 h-28 border-2 transition-colors ${
                        selectedTool?.id === tool.id
                          ? "border-amber-500 bg-amber-950/30"
                          : "border-ca-border bg-ca-panel hover:border-ca-select/50"
                      }`}
                    >
                      <div className="text-[10px] font-mono text-ca-ink-muted bg-ca-bg px-1 rounded mb-2">
                        {tool.code}
                      </div>
                      <div className="text-xs font-bold text-ca-ink text-center leading-snug">
                        {tool.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: dark explanation panel */}
            <div className="w-80 flex flex-col bg-ca-panel">
              {selectedTool ? (
                <>
                  <div className="p-4 border-b border-ca-border flex-1">
                    <div className="text-sm font-bold text-amber-500 font-mono mb-2">
                      {selectedTool.code}
                    </div>
                    <h2 className="text-lg font-bold text-ca-ink mb-4 leading-tight">
                      {selectedTool.name}
                    </h2>
                    <p className="text-xs text-ca-ink-muted leading-relaxed mb-4">
                      {selectedTool.description}
                    </p>
                    <div className="bg-ca-bg border border-ca-border p-2 rounded text-[10px] font-mono text-ca-ink-muted">
                      Target: {selectedTool.targetFeature}
                      <br/>Category: {selectedTool.category}
                    </div>
                  </div>
                  <div className="p-4 border-t border-ca-border bg-ca-panel-2 flex justify-end">
                    <button
                      onClick={() => setShowImageChoice(true)}
                      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black font-bold px-6 py-2 rounded-sm uppercase tracking-wider text-sm transition-colors"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-ca-ink-muted text-sm">
                  Select a tool from the catalog to view details and add it to the project.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

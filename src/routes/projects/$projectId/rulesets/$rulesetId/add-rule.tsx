import React, { useState, useMemo, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Camera, Upload, Settings, Archive, Search, ChevronRight, Check } from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import {
  VISION_TOOL_CATALOG,
  InspectionCategoryType,
  getVisionToolsByCategory,
  type VisionToolDefinition,
} from "@/lib/vision/tool-catalog";
import type { EditorRule } from "@/lib/editor/types";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";

export const Route = createFileRoute("/projects/$projectId/rulesets/$rulesetId/add-rule")({
  component: AddRuleWizard,
});

function generateRuleId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function AddRuleWizard() {
  const { projectId, rulesetId } = Route.useParams();
  const navigate = useNavigate();

  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const ruleset = useMemo(() => rulesets.find((r: any) => r.id === rulesetId), [rulesets, rulesetId]);
  
  // State for wizard
  const [step, setStep] = useState<"source" | "catalog" | "tuning">("source");
  const [imageRef, setImageRef] = useState<string | undefined>(undefined);
  
  // Catalog State
  const [selectedCategory, setSelectedCategory] = useState<InspectionCategoryType | "All">("All");
  const [selectedTool, setSelectedTool] = useState<VisionToolDefinition | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!project || !ruleset) {
    return <div className="p-8 text-ca-ink">Project or ruleset not found.</div>;
  }

  const handleImageChoice = (choice: "current" | "upload") => {
    if (choice === "current") {
      setImageRef(undefined); // use whatever current camera source is
      setStep("catalog");
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
        setImageRef(dataUrl);
        setStep("catalog");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const filteredTools = useMemo(() => {
    return selectedCategory === "All"
      ? [...VISION_TOOL_CATALOG]
      : getVisionToolsByCategory(selectedCategory);
  }, [selectedCategory]);

  const commitRule = async () => {
    if (!selectedTool) return;
    
    const ruleCount = ruleset.rules.length;
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
    };

    useProjectStore.getState().updateRulesetRules(rulesetId, [...ruleset.rules, newRule]);
    if (imageRef) {
      useProjectStore.getState().updateRulesetImageRef(rulesetId, imageRef);
    }

    await navigate({
      to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
      params: { projectId, rulesetId, ruleId: newRule.id },
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0c10] text-ca-ink font-hmi antialiased">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-[#22252a] bg-[#111318] px-4">
        <div className="flex items-center gap-3">
          <Link to="/projects/$projectId" params={{ projectId }} className="text-ca-ink-muted hover:text-ca-primary transition-colors">
             <span className="text-[10px] font-bold uppercase tracking-wider">{project.name}</span>
          </Link>
          <span className="text-[#333]"><ChevronRight size={14} /></span>
          <span className="text-[10px] font-bold text-ca-ink-muted uppercase tracking-wider">{ruleset.name}</span>
          <span className="text-[#333]"><ChevronRight size={14} /></span>
          <h1 className="text-sm font-bold text-ca-ink tracking-wide">ADD RULE</h1>
        </div>
      </header>

      {/* Main Wizard Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        
        {step === "source" && (
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <h2 className="mb-2 text-xl font-bold uppercase tracking-wide text-ca-ink">Choose Image Source</h2>
            <p className="mb-10 text-sm text-ca-ink-muted">Select an image to use for rule setup.</p>
            
            <div className="flex w-full max-w-2xl gap-6">
              {/* Current Camera Image */}
              <button 
                onClick={() => handleImageChoice("current")}
                className="group flex flex-1 flex-col items-center justify-center gap-4 rounded border border-[#22252a] bg-[#111318] p-8 text-center transition-colors hover:border-ca-primary hover:bg-[#1a1c23]"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ca-primary/10 text-ca-primary transition-transform group-hover:scale-110">
                  <Camera size={32} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-ca-ink">Current camera image</h3>
                  <p className="text-xs text-ca-ink-muted">Use the latest frame from this project camera</p>
                </div>
              </button>
              
              {/* Upload Image */}
              <button 
                onClick={() => handleImageChoice("upload")}
                className="group flex flex-1 flex-col items-center justify-center gap-4 rounded border border-[#22252a] bg-[#111318] p-8 text-center transition-colors hover:border-ca-primary hover:bg-[#1a1c23]"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ca-primary/10 text-ca-primary transition-transform group-hover:scale-110">
                  <Upload size={32} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-ca-ink">Upload image</h3>
                  <p className="text-xs text-ca-ink-muted">Use an image file for rule setup</p>
                </div>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </div>
        )}

        {step === "catalog" && (
          <div className="flex flex-1 flex-col h-full bg-[#0b0c10]">
            <div className="flex items-center gap-3 border-b border-[#22252a] bg-[#111318] p-4">
              <button 
                onClick={() => setStep("source")}
                className="flex items-center gap-2 text-xs font-bold uppercase text-ca-ink-muted hover:text-ca-ink"
              >
                <ChevronRight size={14} className="rotate-180" /> Back to Source
              </button>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[10px] font-bold text-ca-ink-muted uppercase">Image Selected</span>
                {imageRef ? (
                  <img src={imageRef} className="h-8 w-12 rounded object-cover border border-[#333]" alt="Selected" />
                ) : (
                  <div className="flex h-8 w-12 items-center justify-center rounded border border-[#333] bg-[#1a1c23]">
                    <Camera size={14} className="text-ca-ink-muted" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Category Sidebar */}
              <div className="w-64 border-r border-[#22252a] bg-[#111318] flex flex-col">
                <div className="p-3 border-b border-[#22252a]">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-ca-ink-muted">Categories</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  {(["All", "Presence/Absence", "Flaw Detection", "Alignment", "Count", "ID & OCR/OCV", "Graphic Display", "Mathematical Operations", "Function List", "Position Adjustment"] as (InspectionCategoryType | "All")[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-left px-3 py-2 text-xs font-bold uppercase tracking-wide rounded transition-colors ${
                        selectedCategory === cat 
                          ? "bg-ca-primary text-[#000]" 
                          : "text-ca-ink-muted hover:bg-[#1a1c23] hover:text-ca-ink"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools Grid */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#0b0c10]">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-ca-ink-muted">Preferred Tools</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredTools.map((tool) => (
                    <button
                      key={tool.code}
                      onClick={() => setSelectedTool(tool)}
                      className={`flex flex-col gap-2 rounded border p-4 text-left transition-colors ${
                        selectedTool?.code === tool.code
                          ? "border-ca-primary bg-[#1a1c23]"
                          : "border-[#22252a] bg-[#111318] hover:border-[#444]"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-ca-ink">{tool.name.replace(/ \(.*\)/, "")}</span>
                        <span className="rounded bg-[#22252a] px-1.5 py-0.5 text-[9px] font-mono font-bold text-ca-ink-muted">
                          {tool.code}
                        </span>
                      </div>
                      <span className="text-[10px] text-ca-ink-muted line-clamp-2">{tool.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right panel: Tool Details */}
              <div className="w-80 border-l border-[#22252a] bg-[#111318] flex flex-col">
                {selectedTool ? (
                  <>
                    <div className="p-6 border-b border-[#22252a] flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded bg-[#22252a] px-2 py-1 text-[10px] font-mono font-bold text-ca-ink-muted">
                          {selectedTool.code}
                        </span>
                      </div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ca-ink">
                        {selectedTool.name}
                      </h3>
                      <p className="text-xs text-ca-ink-muted leading-relaxed">
                        {selectedTool.description}
                      </p>
                    </div>
                    <div className="p-4 border-t border-[#22252a] bg-[#0b0c10]">
                      <button
                        onClick={commitRule}
                        className="flex w-full items-center justify-center gap-2 rounded bg-ca-primary py-3 text-xs font-bold uppercase tracking-wider text-[#000] hover:brightness-110 transition-colors"
                      >
                        <Settings size={16} className="fill-current" />
                        Add / Configure
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-ca-ink-muted">
                    <Settings size={32} className="mb-4 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Tool Selected</p>
                    <p className="mt-2 text-[10px]">Select a tool from the catalog to configure it.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

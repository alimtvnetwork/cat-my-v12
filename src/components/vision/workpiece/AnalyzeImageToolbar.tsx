import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  FileImage,
  Plus,
  Sparkles,
  Upload,
  AlertTriangle,
  X,
  Tag,
} from "lucide-react";
import {
  SAMPLE_IMAGE_POCKET_1_FILLED,
  SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED,
  SAMPLE_IMAGE_POCKET_5_PARTIAL,
} from "@/lib/vision/sample-images";
import type { RecentImageSource } from "./image-source-recents-store";

export interface PresetImageOption {
  id: string;
  label: string;
  alias: string;
  imageRef: string;
  badge?: string;
}

export const PRESET_INSPECTION_IMAGES: PresetImageOption[] = [
  {
    id: "pocket-1-filled",
    label: "Pocket 1",
    alias: "Pocket 1 [Filled IC]",
    imageRef: SAMPLE_IMAGE_POCKET_1_FILLED,
    badge: "Golden",
  },
  {
    id: "pocket-2-empty",
    label: "Pocket 2",
    alias: "Pocket 2 [Empty Defect]",
    imageRef: SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED,
    badge: "Defect",
  },
  {
    id: "pocket-5-strip",
    label: "Pocket 5",
    alias: "Pocket 5 [Strip]",
    imageRef: SAMPLE_IMAGE_POCKET_5_PARTIAL,
    badge: "Carrier Tape",
  },
];

export interface AnalyzeImageToolbarProps {
  currentImageRef?: string;
  isLiveCameraMode: boolean;
  isLiveCameraReady: boolean;
  onSelectLiveCamera: () => void;
  onSelectImage: (imageRef: string, label: string) => void;
  onUploadImage: (file: File, alias: string) => void;
  recents: RecentImageSource[];
  onRemoveRecent?: (id: string) => void;
  calibratedWidth?: number;
  calibratedHeight?: number;
  /** Saved pattern-box state for the active rule (spec 55: never a
   *  silent empty rule). "taught" = boxes persisted at teach;
   *  "derived" = boxes derived from the region because teach saved
   *  none; "none" = no boxes at all. When absent, no badge renders
   *  (the parent has not wired the active rule through yet). */
  savedPatternBoxCount?: number | null;
  savedPatternBoxSource?: "taught" | "derived" | "none";
}

interface ImageDimensionState {
  width: number;
  height: number;
  isLoaded: boolean;
}

export function AnalyzeImageToolbar({
  currentImageRef,
  isLiveCameraMode,
  isLiveCameraReady,
  onSelectLiveCamera,
  onSelectImage,
  onUploadImage,
  recents,
  onRemoveRecent,
  calibratedWidth = 960,
  calibratedHeight = 540,
  savedPatternBoxCount = null,
  savedPatternBoxSource,
}: AnalyzeImageToolbarProps): React.JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadAlias, setUploadAlias] = useState("");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensionState>({
    width: 0,
    height: 0,
    isLoaded: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inspect natural dimensions of current image
  useEffect(() => {
    if (!currentImageRef || isLiveCameraMode) {
      setDimensions({ width: 0, height: 0, isLoaded: false });

      return;
    }

    const img = new Image();
    img.src = currentImageRef;

    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
        isLoaded: true,
      });
    };

    img.onerror = () => {
      setDimensions({ width: 0, height: 0, isLoaded: false });
    };
  }, [currentImageRef, isLiveCameraMode]);

  const hasResolutionMismatch = useMemo(() => {
    if (!dimensions.isLoaded || isLiveCameraMode) return false;

    return dimensions.width !== calibratedWidth || dimensions.height !== calibratedHeight;
  }, [dimensions, calibratedWidth, calibratedHeight, isLiveCameraMode]);

  // Determine current active label
  const activeLabel = useMemo(() => {
    if (isLiveCameraMode) return "Live Camera Feed";

    const matchedPreset = PRESET_INSPECTION_IMAGES.find((p) => p.imageRef === currentImageRef);

    if (matchedPreset) return matchedPreset.alias;

    const matchedRecent = recents.find((r) => r.dataUrl === currentImageRef);

    if (matchedRecent) return matchedRecent.label;

    return currentImageRef ? "Custom Registered Image" : "No Image Selected";
  }, [isLiveCameraMode, currentImageRef, recents]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setStagedFile(file);
    const defaultAlias = file.name.replace(/\.[^/.]+$/, "");
    setUploadAlias(defaultAlias);
    setIsUploadModalOpen(true);
    setIsDropdownOpen(false);
    e.target.value = "";
  }, []);

  const handleConfirmUpload = useCallback(() => {
    if (!stagedFile) return;

    const finalAlias = uploadAlias.trim() || stagedFile.name;
    onUploadImage(stagedFile, finalAlias);
    setStagedFile(null);
    setUploadAlias("");
    setIsUploadModalOpen(false);
  }, [stagedFile, uploadAlias, onUploadImage]);

  const handleCancelUpload = useCallback(() => {
    setStagedFile(null);
    setUploadAlias("");
    setIsUploadModalOpen(false);
  }, []);

  return (
    <div className="relative z-30 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-black/60 px-3 py-2 backdrop-blur-md">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Left: Source Selector Dropdown with Radix Portal to prevent container clipping */}
      <div className="flex items-center gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-white/50">
          Source:
        </span>

        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              id="btn-camera-source-dropdown"
              data-automation-id="btn-camera-source-dropdown"
              data-automation-name="Camera Source Dropdown"
              data-automation-xpath="//button[@id='btn-camera-source-dropdown']"
              data-tour="project-image-selector-dropdown"
              className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-sans text-xs font-semibold text-white shadow-sm transition hover:border-cyan-400/40 hover:bg-white/10 active:scale-95"
            >
              {isLiveCameraMode ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isLiveCameraReady
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                        : "bg-amber-400 animate-pulse"
                    }`}
                  />
                  <Camera size={13} />
                  <span>Live Camera</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-cyan-200">
                  <FileImage size={13} className="text-cyan-400" />
                  <span className="max-w-[200px] truncate">{activeLabel}</span>
                </span>
              )}

              <ChevronDown
                size={13}
                className={`text-white/50 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="z-[9999] w-80 rounded-xl border border-white/15 bg-[#0b0e14] p-1.5 shadow-2xl backdrop-blur-2xl text-white"
          >
            {/* Live Camera Option */}
            <div className="border-b border-white/[0.08] pb-1 mb-1">
              <button
                type="button"
                onClick={() => {
                  onSelectLiveCamera();
                  setIsDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-sans text-xs font-semibold transition ${
                  isLiveCameraMode
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Camera size={14} className="text-emerald-400" />
                  <span>Live Camera Feed</span>
                </div>
                {isLiveCameraMode ? <CheckCircle2 size={13} className="text-emerald-400" /> : null}
              </button>
            </div>

            {/* Presets Header */}
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
              Standard Presets
            </div>

            {PRESET_INSPECTION_IMAGES.map((preset) => {
              const isSelected = !isLiveCameraMode && currentImageRef === preset.imageRef;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelectImage(preset.imageRef, preset.alias);
                    setIsDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-sans text-xs font-medium transition ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-200"
                      : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileImage size={13} className="shrink-0 text-cyan-400" />
                    <span className="truncate">{preset.alias}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {preset.badge ? (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/60">
                        {preset.badge}
                      </span>
                    ) : null}
                    {isSelected ? <CheckCircle2 size={13} className="text-cyan-400" /> : null}
                  </div>
                </button>
              );
            })}

            {/* Custom Registered / Recents */}
            {recents.length > 0 ? (
              <div className="border-t border-white/[0.08] mt-1.5 pt-1.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Registered Custom Images
                </div>

                {recents.map((recent) => {
                  const isSelected = !isLiveCameraMode && currentImageRef === recent.dataUrl;

                  return (
                    <div
                      key={recent.id}
                      className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-sans text-xs transition ${
                        isSelected
                          ? "bg-purple-500/20 text-purple-200"
                          : "text-white/75 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectImage(recent.dataUrl, recent.label);
                          setIsDropdownOpen(false);
                        }}
                        className="flex flex-1 items-center gap-2 min-w-0 text-left"
                      >
                        <Tag size={12} className="shrink-0 text-purple-400" />
                        <span className="truncate">{recent.label}</span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {isSelected ? <CheckCircle2 size={13} className="text-purple-400" /> : null}
                        {onRemoveRecent ? (
                          <button
                            type="button"
                            title="Remove image"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveRecent(recent.id);
                            }}
                            className="hidden text-white/40 hover:text-rose-400 group-hover:block"
                          >
                            <X size={12} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Upload Action */}
            <div className="border-t border-white/[0.08] mt-1.5 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 bg-white/[0.02] py-2 font-sans text-xs font-semibold text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/10 active:scale-95"
              >
                <Plus size={13} />
                <span>Upload New Image with Alias</span>
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Presets Inline Buttons (hidden when Live Camera is active) */}
      {!isLiveCameraMode ? (
        <div className="hidden sm:flex items-center gap-1 ml-1">
          {PRESET_INSPECTION_IMAGES.map((preset) => {
            const isSelected = !isLiveCameraMode && currentImageRef === preset.imageRef;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectImage(preset.imageRef, preset.alias)}
                title={preset.alias}
                className={`rounded-md px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wider transition ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload inspection image"
            className="flex items-center gap-1 rounded-md border border-dashed border-white/20 bg-white/5 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-white/60 hover:border-cyan-400/40 hover:text-cyan-200"
          >
            <Upload size={10} />
            Upload
          </button>
        </div>
      ) : null}

      {/* Right: Resolution Readout & Advisory Warning Badge */}
      <div className="flex items-center gap-2">
        {savedPatternBoxSource !== undefined ? (
          savedPatternBoxSource === "taught" ? (
            <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 font-sans text-[10px] font-semibold text-emerald-300">
              <CheckCircle2 size={11} className="text-emerald-400" />
              <span>Pattern boxes: {savedPatternBoxCount ?? 0} saved</span>
            </div>
          ) : savedPatternBoxSource === "derived" ? (
            <div
              title="Teach saved no pattern boxes, so Test This Rule derives boxes from the region. Re-teach to lock the boxes the canvas shows."
              className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-950/50 px-2 py-1 font-sans text-[10px] font-bold text-amber-200 shadow-sm"
            >
              <AlertTriangle size={12} className="text-amber-400 shrink-0" />
              <span>Pattern boxes: {savedPatternBoxCount ?? 0} derived (not taught)</span>
            </div>
          ) : (
            <div
              title="The active rule has no pattern boxes. Test This Rule will fail as unconfigured until boxes are taught."
              className="flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-950/50 px-2 py-1 font-sans text-[10px] font-bold text-rose-200 shadow-sm"
            >
              <AlertTriangle size={12} className="text-rose-400 shrink-0" />
              <span>No saved pattern boxes</span>
            </div>
          )
        ) : null}
        {isLiveCameraMode ? (
          <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Stream (Auto-Calibrated)
          </div>
        ) : dimensions.isLoaded ? (
          <div className="flex items-center gap-2">
            {hasResolutionMismatch ? (
              <div
                title={`Image resolution (${dimensions.width}×${dimensions.height}) does not match calibrated baseline (${calibratedWidth}×${calibratedHeight}). Feature thresholds and micron measurements may scale unexpectedly.`}
                className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-950/50 px-2.5 py-1 font-sans text-[10px] font-bold text-amber-200 shadow-sm"
              >
                <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                <span>
                  Res Mismatch: {dimensions.width}×{dimensions.height}{" "}
                  <span className="text-amber-300/60 font-normal">
                    (Calibrated: {calibratedWidth}×{calibratedHeight})
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 font-sans text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 size={11} className="text-emerald-400" />
                <span>
                  {dimensions.width}×{dimensions.height} (Calibrated)
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Upload with Alias Modal */}
      {isUploadModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0e131d] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Tag size={16} className="text-cyan-400" />
                <h3 className="font-sans text-sm font-bold uppercase tracking-wider">
                  Register Inspection Image
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelUpload}
                className="text-white/50 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-sans">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  Selected File
                </label>
                <div className="mt-1 truncate rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80">
                  {stagedFile?.name} ({stagedFile ? Math.round(stagedFile.size / 1024) : 0} KB)
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  Alias Name (How to refer to this image)
                </label>
                <input
                  type="text"
                  value={uploadAlias}
                  onChange={(e) => setUploadAlias(e.target.value)}
                  placeholder="e.g. Pocket 3 [Defective IC]"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmUpload();
                    }
                  }}
                />
              </div>

              <p className="text-[11px] text-white/40">
                Calibrated camera baseline is {calibratedWidth}×{calibratedHeight} px. Images
                matching this size yield optimal pattern matching accuracy.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelUpload}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                className="rounded-lg bg-cyan-400 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-cyan-400/20 hover:brightness-110 active:scale-95"
              >
                Register Image
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

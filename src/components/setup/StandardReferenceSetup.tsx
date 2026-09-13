import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Check,
  X,
  Image as ImageIcon,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
} from "lucide-react";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export interface ReferenceSlot {
  id: number;
  name: string;
  imageSrc: string;
  capturedAt: string;
  width: number;
  height: number;
  exposureUs: number;
  gainDb: number;
  isRegistered: boolean;
}

const DEFAULT_SLOTS: ReferenceSlot[] = [
  {
    id: 0,
    name: "Master Reference (Slot 0)",
    imageSrc: "/images/placeholders/sample_grid.png",
    capturedAt: "2026-08-31 04:12:09",
    width: 2592,
    height: 1944,
    exposureUs: 15000,
    gainDb: 6.0,
    isRegistered: true,
  },
  {
    id: 1,
    name: "Alternative Golden Part (Slot 1)",
    imageSrc: "/images/placeholders/sample_grid.png",
    capturedAt: "2026-08-30 18:45:22",
    width: 2592,
    height: 1944,
    exposureUs: 14500,
    gainDb: 5.5,
    isRegistered: true,
  },
  {
    id: 2,
    name: "Slot 2 (Empty)",
    imageSrc: "",
    capturedAt: "-",
    width: 0,
    height: 0,
    exposureUs: 0,
    gainDb: 0,
    isRegistered: false,
  },
  {
    id: 3,
    name: "Slot 3 (Empty)",
    imageSrc: "",
    capturedAt: "-",
    width: 0,
    height: 0,
    exposureUs: 0,
    gainDb: 0,
    isRegistered: false,
  },
];

export function StandardReferenceSetup(): React.JSX.Element {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [slots, setSlots] = useState<ReferenceSlot[]>(DEFAULT_SLOTS);
  const [activeSlotId, setActiveSlotId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"calibration" | "enhancement" | "registration">(
    "calibration",
  );

  // Adjustment Controls
  const [zoom, setZoom] = useState<number>(100);
  const [exposureUs, setExposureUs] = useState<number>(15000);
  const [gainDb, setGainDb] = useState<number>(6.0);
  const [gamma, setGamma] = useState<number>(1.0);
  const [contrast, setContrast] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(0);
  const [binarize, setBinarize] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(128);
  const [invert, setInvert] = useState<boolean>(false);

  const currentSlot = slots.find((s) => s.id === activeSlotId) || slots[0];

  const handleCaptureLive = () => {
    toast.info("Acquiring single frame from live camera...", { duration: 1500 });
    setTimeout(() => {
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      setSlots((prev) =>
        prev.map((s) =>
          s.id === activeSlotId
            ? {
                ...s,
                capturedAt: now,
                width: 2592,
                height: 1944,
                exposureUs,
                gainDb,
                isRegistered: true,
                imageSrc: s.imageSrc || "/images/placeholders/sample_grid.png",
              }
            : s,
        ),
      );
      toast.success(`Reference Image captured into Slot ${activeSlotId}`);
    }, 600);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      setSlots((prev) =>
        prev.map((s) =>
          s.id === activeSlotId
            ? {
                ...s,
                name: file.name.replace(/\.[^/.]+$/, ""),
                imageSrc: src,
                capturedAt: now,
                width: 2048,
                height: 1536,
                isRegistered: true,
              }
            : s,
        ),
      );
      toast.success(`Loaded ${file.name} into Slot ${activeSlotId}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRegisterSlot = () => {
    setSlots((prev) => prev.map((s) => (s.id === activeSlotId ? { ...s, isRegistered: true } : s)));
    toast.success(`Registered Slot ${activeSlotId} as active master reference.`);
  };

  const handleClearSlot = () => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === activeSlotId
          ? {
              ...s,
              name: `Slot ${s.id} (Empty)`,
              imageSrc: "",
              capturedAt: "-",
              width: 0,
              height: 0,
              isRegistered: false,
            }
          : s,
      ),
    );
    toast.info(`Cleared Reference Slot ${activeSlotId}`);
  };

  const handleApply = () => {
    toast.success("Applied Reference configuration to current inspection recipe.");
  };

  const handleOk = () => {
    toast.success("Saved Reference Image settings.");
    void navigate({ to: "/setup" });
  };

  const handleCancel = () => {
    void navigate({ to: "/setup" });
  };

  const actionButtons = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCaptureLive}
        className="px-3 py-1.5 bg-ca-ink text-ca-bg font-semibold rounded text-xs flex items-center gap-1.5 hover:opacity-90 shadow-sm"
      >
        <Camera size={13} />
        Live Grab
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1.5 bg-ca-panel border border-ca-border text-ca-ink font-medium rounded text-xs flex items-center gap-1.5 hover:bg-ca-panel-2 shadow-sm"
      >
        <Upload size={13} />
        Import File
      </button>
      <button
        type="button"
        onClick={handleApply}
        className="px-3 py-1.5 bg-ca-panel border border-ca-border text-ca-ink font-medium rounded text-xs flex items-center gap-1.5 hover:bg-ca-panel-2 shadow-sm"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={handleOk}
        className="px-3.5 py-1.5 bg-ca-ink text-ca-bg font-bold rounded text-xs flex items-center gap-1 hover:opacity-90 shadow-sm"
      >
        <Check size={13} />
        OK
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="px-3 py-1.5 bg-ca-panel border border-ca-border text-ca-ink rounded text-xs flex items-center gap-1 hover:bg-ca-panel-2"
      >
        <X size={13} />
        Cancel
      </button>
    </div>
  );

  return (
    <StandardAppShell
      activeNav="setup"
      title="Reference Image Setup"
      subtitle={`Master Template & Multi-Slot Reference Manager · Slot [${activeSlotId}] ${currentSlot.name}`}
      actions={actionButtons}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/bmp,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden bg-ca-canvas">
        {/* Left Interactive Viewport & Slots Bar */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-ca-border bg-ca-bg">
          {/* Canvas Top Toolbar */}
          <div className="h-10 px-3 border-b border-ca-border bg-ca-panel flex items-center justify-between text-xs text-ca-ink">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ca-ink">Slot #{activeSlotId}:</span>
              <span className="text-ca-ink-muted">{currentSlot.name}</span>
              {currentSlot.isRegistered ? (
                <span className="px-1.5 py-0.5 bg-ca-ok/15 text-ca-ok border border-ca-ok/40 rounded text-[10px] font-bold uppercase tracking-wide">
                  Registered Master
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-ca-ink-muted/15 text-ca-ink-muted border border-ca-border rounded text-[10px] uppercase">
                  Unregistered
                </span>
              )}
            </div>

            {/* Zoom and Display Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(25, z - 25))}
                className="p-1.5 border border-ca-border rounded bg-ca-panel-2 hover:bg-ca-panel text-ca-ink"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="w-12 text-center font-mono text-[11px] font-semibold text-ca-ink">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(400, z + 25))}
                className="p-1.5 border border-ca-border rounded bg-ca-panel-2 hover:bg-ca-panel text-ca-ink"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="p-1.5 border border-ca-border rounded bg-ca-panel-2 hover:bg-ca-panel text-ca-ink ml-1"
                title="Reset Zoom 100%"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* Canvas Surface */}
          <div className="flex-1 min-h-0 relative overflow-auto p-4 flex items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(128,128,128,0.04)_0_8px,transparent_8px_16px)]">
            {currentSlot.imageSrc ? (
              <div
                className="relative border border-ca-border shadow-md transition-transform duration-100"
                style={{
                  transform: `scale(${zoom / 100})`,
                  filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%) ${
                    binarize ? "grayscale(100%)" : ""
                  } ${invert ? "invert(100%)" : ""}`,
                }}
              >
                {/* Crosshairs & Reference Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-4 grid-rows-4 border border-white/20">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                </div>

                {/* Center Reticle */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-8 h-8 rounded-full border border-white/60" />
                  <div className="w-12 h-[1px] bg-white/60 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                  <div className="h-12 w-[1px] bg-white/60 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>

                <img
                  src={currentSlot.imageSrc}
                  alt={currentSlot.name}
                  className="max-h-[62vh] object-contain select-none pointer-events-none"
                  style={{ minWidth: 400 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'><rect width='640' height='480' fill='%231e293b'/><circle cx='320' cy='240' r='120' fill='%23334155' stroke='%2338bdf8' stroke-width='4'/><rect x='220' y='180' width='200' height='120' fill='%23475569' stroke='%2338bdf8' stroke-width='2'/><text x='320' y='245' font-family='sans-serif' font-size='16' fill='%23f8fafc' text-anchor='middle'>CAT iVision Master Reference Frame</text></svg>";
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-ca-border rounded-lg text-ca-ink-muted">
                <ImageIcon size={48} className="mb-3 opacity-40" />
                <p className="text-sm font-semibold text-ca-ink">Slot #{activeSlotId} is Empty</p>
                <p className="text-xs text-ca-ink-muted mt-1 max-w-sm text-center">
                  Grab a frame from the live camera or import a high-resolution reference image to
                  configure this slot.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleCaptureLive}
                    className="px-3 py-1.5 bg-ca-ink text-ca-bg font-semibold rounded text-xs flex items-center gap-1.5 hover:opacity-90 shadow-sm"
                  >
                    <Camera size={13} />
                    Live Grab
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-ca-panel border border-ca-border text-ca-ink font-medium rounded text-xs flex items-center gap-1.5 hover:bg-ca-panel-2"
                  >
                    <Upload size={13} />
                    Import File
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Reference Slots Selector Carousel */}
          <div className="border-t border-ca-border bg-ca-panel p-2">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ca-ink-muted flex items-center gap-1">
                <Layers size={12} />
                Registered Reference Slots
              </span>
              <span className="text-[10px] text-ca-ink-muted">Click slot to view/edit</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => {
                const isSelected = slot.id === activeSlotId;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setActiveSlotId(slot.id)}
                    className={`p-2 rounded border text-left flex items-center gap-2 transition-colors ${
                      isSelected
                        ? "bg-ca-panel border-ca-ink text-ca-ink ring-1 ring-ca-ink font-semibold shadow-sm"
                        : "bg-ca-panel-2 border-ca-border text-ca-ink hover:bg-ca-panel"
                    }`}
                  >
                    <div className="w-9 h-9 shrink-0 bg-ca-bg border border-ca-border rounded flex items-center justify-center font-mono text-xs font-bold">
                      #{slot.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{slot.name}</div>
                      <div className="text-[10px] text-ca-ink-muted truncate">
                        {slot.isRegistered ? `${slot.width}x${slot.height}` : "Empty"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Tabbed Configuration Panel */}
        <div className="w-80 flex flex-col shrink-0 bg-ca-panel border-l border-ca-border text-xs text-ca-ink">
          {/* Tab Headers */}
          <div className="flex border-b border-ca-border bg-ca-panel-2">
            <button
              type="button"
              onClick={() => setActiveTab("calibration")}
              className={`flex-1 py-2.5 px-2 text-center font-medium border-b-2 transition-colors ${
                activeTab === "calibration"
                  ? "border-ca-ink text-ca-ink bg-ca-panel font-bold"
                  : "border-transparent text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              Optics / Sensor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("enhancement")}
              className={`flex-1 py-2.5 px-2 text-center font-medium border-b-2 transition-colors ${
                activeTab === "enhancement"
                  ? "border-ca-ink text-ca-ink bg-ca-panel font-bold"
                  : "border-transparent text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              Enhancement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("registration")}
              className={`flex-1 py-2.5 px-2 text-center font-medium border-b-2 transition-colors ${
                activeTab === "registration"
                  ? "border-ca-ink text-ca-ink bg-ca-panel font-bold"
                  : "border-transparent text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              Slot Info
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {activeTab === "calibration" && (
              <div className="space-y-4">
                <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
                  <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-[11px]">
                    Acquisition Parameters
                  </div>

                  <div>
                    <div className="flex justify-between text-ca-ink-muted mb-1">
                      <span>Exposure Time (µs)</span>
                      <span className="font-mono text-ca-ink">{exposureUs.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={100000}
                      step={100}
                      value={exposureUs}
                      onChange={(e) => setExposureUs(Number(e.target.value))}
                      className="w-full accent-ca-select"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-ca-ink-muted mb-1">
                      <span>Analog Gain (dB)</span>
                      <span className="font-mono text-ca-ink">{gainDb.toFixed(1)} dB</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={0.1}
                      value={gainDb}
                      onChange={(e) => setGainDb(Number(e.target.value))}
                      className="w-full accent-ca-select"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-ca-ink-muted mb-1">
                      <span>Gamma Correction</span>
                      <span className="font-mono text-ca-ink">{gamma.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.05}
                      value={gamma}
                      onChange={(e) => setGamma(Number(e.target.value))}
                      className="w-full accent-ca-select"
                    />
                  </div>
                </div>

                <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-2">
                  <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-[11px]">
                    Sensor Physical Geometry
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-ca-ink-muted block">Resolution</span>
                      <span className="font-mono font-semibold text-ca-ink">
                        {currentSlot.width || 2592} x {currentSlot.height || 1944}
                      </span>
                    </div>
                    <div>
                      <span className="text-ca-ink-muted block">Pixel Pitch</span>
                      <span className="font-mono font-semibold text-ca-ink">2.4 µm</span>
                    </div>
                    <div>
                      <span className="text-ca-ink-muted block">Color Space</span>
                      <span className="font-mono font-semibold text-ca-ink">Mono8 / Raw</span>
                    </div>
                    <div>
                      <span className="text-ca-ink-muted block">Aspect Ratio</span>
                      <span className="font-mono font-semibold text-ca-ink">4 : 3</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "enhancement" && (
              <div className="space-y-4">
                <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
                  <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-[11px]">
                    Pre-Processing Filters
                  </div>

                  <div>
                    <div className="flex justify-between text-ca-ink-muted mb-1">
                      <span>Contrast Adjustment</span>
                      <span className="font-mono text-ca-ink">
                        {contrast > 0 ? `+${contrast}` : contrast}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-ca-select"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-ca-ink-muted mb-1">
                      <span>Brightness Offset</span>
                      <span className="font-mono text-ca-ink">
                        {brightness > 0 ? `+${brightness}` : brightness}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-ca-select"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-ca-border">
                    <input
                      type="checkbox"
                      checked={binarize}
                      onChange={(e) => setBinarize(e.target.checked)}
                      className="rounded border-ca-border accent-ca-select"
                    />
                    <span className="font-medium text-ca-ink">Preview Binarized Segmentation</span>
                  </label>

                  {binarize && (
                    <div className="pl-5 pt-1 space-y-1">
                      <div className="flex justify-between text-ca-ink-muted">
                        <span>Threshold Level</span>
                        <span className="font-mono text-ca-ink">{threshold}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={255}
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-full accent-ca-select"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={invert}
                      onChange={(e) => setInvert(e.target.checked)}
                      className="rounded border-ca-border accent-ca-select"
                    />
                    <span className="font-medium text-ca-ink">Invert Grayscale Polarity</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "registration" && (
              <div className="space-y-4">
                <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
                  <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-[11px]">
                    Reference Slot #{activeSlotId} Metadata
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-ca-ink-muted block mb-1">Slot Label</label>
                      <input
                        type="text"
                        value={currentSlot.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSlots((prev) =>
                            prev.map((s) => (s.id === activeSlotId ? { ...s, name: val } : s)),
                          );
                        }}
                        className="w-full bg-ca-bg border border-ca-border px-2 py-1 rounded text-ca-ink font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-ca-ink-muted block">Timestamp</span>
                        <span className="font-mono text-ca-ink">{currentSlot.capturedAt}</span>
                      </div>
                      <div>
                        <span className="text-ca-ink-muted block">Status</span>
                        <span className="font-semibold text-ca-ink">
                          {currentSlot.isRegistered ? "Registered" : "Empty"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-ca-border flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleRegisterSlot}
                      className="w-full py-1.5 bg-ca-ink text-ca-bg font-semibold rounded text-xs flex items-center justify-center gap-1 hover:opacity-90 shadow-sm"
                    >
                      <Check size={13} />
                      Set as Primary Master
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSlot}
                      disabled={!currentSlot.isRegistered}
                      className="w-full py-1.5 bg-ca-panel border border-ca-border text-ca-danger font-medium rounded text-xs flex items-center justify-center gap-1 hover:bg-ca-panel-2 disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                      Clear Slot Data
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StandardAppShell>
  );
}

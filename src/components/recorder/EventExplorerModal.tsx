import React, { useMemo, useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Film,
  Layers,
  ListTree,
  Maximize2,
  MousePointer,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import {
  type AnalysisStepTelemetry,
  type CapturedScreenshot,
  type EventExplorerCategoryType,
  type RecorderEvent,
  RecorderEventType,
} from "@/lib/recorder/types";

export interface EventExplorerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialCategory?: EventExplorerCategoryType;
}

const CATEGORY_COLORS: Record<EventExplorerCategoryType, { active: string; idle: string; badge: string }> = {
  all: {
    active: "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]",
    idle: "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-cyan-300 hover:border-cyan-500/40",
    badge: "bg-cyan-950/80 text-cyan-400 border-cyan-800/60",
  },
  error: {
    active: "bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
    idle: "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-rose-300 hover:border-rose-500/40",
    badge: "bg-rose-950/80 text-rose-400 border-rose-800/60",
  },
  analysis: {
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
    idle: "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-emerald-300 hover:border-emerald-500/40",
    badge: "bg-emerald-950/80 text-emerald-400 border-emerald-800/60",
  },
  recording: {
    active: "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
    idle: "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-amber-300 hover:border-amber-500/40",
    badge: "bg-amber-950/80 text-amber-400 border-amber-800/60",
  },
  simulation: {
    active: "bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]",
    idle: "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-purple-300 hover:border-purple-500/40",
    badge: "bg-purple-950/80 text-purple-400 border-purple-800/60",
  },
  interaction: {
    active: "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-[0_0_12px_rgba(56,189,248,0.3)]",
    idle: "bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-sky-300 hover:border-sky-500/40",
    badge: "bg-sky-950/80 text-sky-400 border-sky-800/60",
  },
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function classifyEventCategory(event: RecorderEvent): EventExplorerCategoryType {
  const type = event.eventType;
  const desc = (event.description || "").toLowerCase();
  const target = (event.targetComponent || "").toLowerCase();
  const selector = (event.selector || "").toLowerCase();

  if (
    type === RecorderEventType.AnalysisStep ||
    type === RecorderEventType.Inspection ||
    event.details?.analysisStep
  ) {
    return "analysis";
  }

  if (
    desc.includes("error") ||
    desc.includes("e_be_") ||
    desc.includes("e_app_") ||
    event.details?.isError ||
    target.includes("error")
  ) {
    return "error";
  }

  if (
    selector === "simulation" ||
    target.includes("conveyor") ||
    target.includes("simulation") ||
    desc.includes("carrier tape") ||
    desc.includes("feed") ||
    desc.includes("simulation tick")
  ) {
    return "simulation";
  }

  if (
    type === RecorderEventType.Screenshot ||
    type === RecorderEventType.UserNote ||
    target.includes("snapshot") ||
    desc.includes("user note")
  ) {
    return "recording";
  }

  if (
    type === RecorderEventType.Click ||
    type === RecorderEventType.Hover ||
    type === RecorderEventType.RoiDrag ||
    type === RecorderEventType.Input
  ) {
    return "interaction";
  }

  return "recording";
}

export function EventExplorerModal({
  isOpen: propIsOpen,
  onClose: propOnClose,
  initialCategory = "all",
}: EventExplorerModalProps): React.JSX.Element | null {
  const storeIsOpen = useRecorderStore((s) => s.isEventExplorerOpen);
  const closeStoreExplorer = useRecorderStore((s) => s.closeEventExplorer);
  const session = useRecorderStore((s) => s.session);

  const isOpen = propIsOpen ?? storeIsOpen;
  const handleClose = propOnClose ?? closeStoreExplorer;

  const [activeCategory, setActiveCategory] = useState<EventExplorerCategoryType>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [expandedScreenshot, setExpandedScreenshot] = useState<CapturedScreenshot | null>(null);

  const events = useMemo(() => session?.events ?? [], [session?.events]);
  const screenshots = useMemo(() => session?.screenshots ?? [], [session?.screenshots]);

  const screenshotMap = useMemo(() => {
    const map = new Map<string, CapturedScreenshot>();

    for (const snap of screenshots) {
      map.set(snap.id, snap);
    }

    return map;
  }, [screenshots]);

  const categoryCounts = useMemo(() => {
    const counts: Record<EventExplorerCategoryType, number> = {
      all: events.length,
      error: 0,
      analysis: 0,
      recording: 0,
      simulation: 0,
      interaction: 0,
    };

    for (const evt of events) {
      const cat = classifyEventCategory(evt);
      counts[cat] = (counts[cat] || 0) + 1;
    }

    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return events.filter((evt) => {
      const cat = classifyEventCategory(evt);

      if (activeCategory !== "all" && cat !== activeCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const matchDesc = evt.description?.toLowerCase().includes(query);
      const matchComp = evt.targetComponent?.toLowerCase().includes(query);
      const matchSelector = evt.selector?.toLowerCase().includes(query);
      const matchRoute = evt.route?.toLowerCase().includes(query);
      const matchXpath = evt.xpath?.toLowerCase().includes(query);

      return Boolean(matchDesc || matchComp || matchSelector || matchRoute || matchXpath);
    });
  }, [events, activeCategory, searchQuery]);

  useEffect(() => {
    if (filteredEvents.length > 0 && !filteredEvents.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedEventId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expandedScreenshot) {
          setExpandedScreenshot(null);
        } else {
          handleClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, expandedScreenshot, handleClose]);

  if (!isOpen) {
    return null;
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId) || filteredEvents[0] || null;

  const associatedScreenshot = selectedEvent?.screenshotId
    ? screenshotMap.get(selectedEvent.screenshotId)
    : null;

  const analysisData = selectedEvent?.details?.analysisStep as AnalysisStepTelemetry | undefined;

  const handleCopyJson = async () => {
    if (!selectedEvent) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy event JSON to clipboard:", err);
    }
  };

  const categories: Array<{ id: EventExplorerCategoryType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "all", label: "All", icon: ListTree },
    { id: "error", label: "Error", icon: AlertCircle },
    { id: "analysis", label: "Analysis", icon: Activity },
    { id: "recording", label: "Recording", icon: Camera },
    { id: "simulation", label: "Simulation", icon: Film },
    { id: "interaction", label: "Interaction", icon: MousePointer },
  ];

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] w-full max-w-7xl flex-col rounded-2xl border border-cyan-500/30 bg-[#0c1017] text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 bg-[#111622]/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/60 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <ListTree className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wider text-cyan-300 uppercase">
                  Event Explorer
                </h2>
                <span className="rounded bg-cyan-950 px-2 py-0.5 font-mono text-[11px] text-cyan-400 border border-cyan-800/50">
                  SESSION: {session?.id || "N/A"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {events.length} total activity frames · {screenshots.length} visual snapshots
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Event Explorer"
            className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-2 text-slate-400 transition-colors hover:border-rose-500/50 hover:bg-rose-950/40 hover:text-rose-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar: Category Chips & Search Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-[#0d121c]/90 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map(({ id, label, icon: Icon }) => {
              const isActive = activeCategory === id;
              const count = categoryCounts[id] || 0;
              const style = CATEGORY_COLORS[id];

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveCategory(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive ? style.active : style.idle
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  <span className={`ml-1 rounded px-1.5 py-0.2 font-mono text-[10px] ${style.badge}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search descriptions, selectors, xpaths..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 pl-9 pr-8 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Master-Detail Split Pane */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Pane: Chronological Timeline Stream (42%) */}
          <div className="w-full sm:w-[44%] border-r border-slate-800 bg-[#0a0e16]/60 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-2 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <span>Timeline Stream ({filteredEvents.length})</span>
              <span>Elapsed</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <ListTree className="h-8 w-8 mb-2 stroke-1 opacity-50" />
                  <p className="text-xs font-mono">No events matching filter</p>
                  <p className="text-[11px] text-slate-600 mt-1">Try selecting 'All' or clearing search</p>
                </div>
              ) : (
                filteredEvents.map((evt, idx) => {
                  const isSelected = evt.id === selectedEvent?.id;
                  const cat = classifyEventCategory(evt);
                  const hasSnap = Boolean(evt.hasScreenshot || evt.screenshotId);
                  const springNum = evt.details?.stepSequenceNumber as number | undefined;

                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => setSelectedEventId(evt.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-cyan-500/80 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50"
                          : "border-slate-800/80 bg-[#111622]/60 hover:border-slate-700 hover:bg-[#141b2a]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-500">
                            #{String(idx + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider border ${CATEGORY_COLORS[cat].badge}`}
                          >
                            {cat}
                          </span>
                          {springNum && (
                            <span className="rounded bg-sky-950 px-1 py-0.2 font-mono text-[10px] text-sky-300 border border-sky-800/60 font-bold">
                              #{springNum}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                          {hasSnap && <Camera className="h-3 w-3 text-cyan-400" />}
                          <span>{formatElapsed(evt.elapsedMs)}</span>
                        </div>
                      </div>

                      <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span className="truncate max-w-[200px]">{evt.targetComponent}</span>
                        <span className="truncate max-w-[120px] text-cyan-400/70">{evt.route}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Selected Event Details Inspector (56%) */}
          <div className="hidden sm:flex sm:w-[56%] flex-col min-h-0 bg-[#0c1017] overflow-y-auto">
            {selectedEvent ? (
              <div className="p-6 space-y-6">
                {/* Event Header Banner */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-cyan-400 font-bold">
                        {selectedEvent.id}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300 uppercase">
                        {selectedEvent.actor}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300 uppercase">
                        {selectedEvent.eventType}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                      {selectedEvent.description}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                      {selectedEvent.timestamp} ({formatElapsed(selectedEvent.elapsedMs)} elapsed)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:bg-slate-700 transition-all shrink-0"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Visual Evidence (Screenshot Preview) - Strict Anti-Asset Invariant */}
                {associatedScreenshot?.dataUrl && (
                  <div className="rounded-xl border border-cyan-500/30 bg-[#111622] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-cyan-400" />
                        <span className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                          Visual Evidence (Snapshot)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedScreenshot(associatedScreenshot)}
                        className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-mono text-cyan-300 hover:bg-slate-700"
                      >
                        <Maximize2 className="h-3 w-3" />
                        <span>Expand</span>
                      </button>
                    </div>

                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-black/60">
                      <img
                        src={associatedScreenshot.dataUrl}
                        alt={associatedScreenshot.title || "Event snapshot"}
                        className="h-full w-full object-contain cursor-pointer"
                        onClick={() => setExpandedScreenshot(associatedScreenshot)}
                      />
                    </div>
                    <p className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                      {associatedScreenshot.title} · {associatedScreenshot.source}
                    </p>
                  </div>
                )}

                {/* Analysis Step Telemetry */}
                {analysisData && (
                  <div className="rounded-xl border border-emerald-500/30 bg-[#0d1717] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300 tracking-wider uppercase font-mono">
                          Inspection Phase {analysisData.phaseIndex}/5: {analysisData.phase}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysisData.isPassed ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-950 px-2 py-0.5 text-xs font-mono font-bold text-rose-400 border border-rose-800">
                            <XCircle className="h-3.5 w-3.5" /> FAIL
                          </span>
                        )}
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                          {analysisData.confidenceScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {analysisData.metrics && analysisData.metrics.length > 0 && (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-emerald-900/40 text-[10px] text-emerald-400 uppercase">
                              <th className="pb-1.5">Metric</th>
                              <th className="pb-1.5">Value</th>
                              <th className="pb-1.5">Threshold</th>
                              <th className="pb-1.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-950/60">
                            {analysisData.metrics.map((m, mIdx) => (
                              <tr key={mIdx} className="text-slate-300">
                                <td className="py-1.5 font-medium text-slate-200">{m.metricName}</td>
                                <td className="py-1.5">
                                  {m.metricValue} {m.unit}
                                </td>
                                <td className="py-1.5 text-slate-400">{m.threshold}</td>
                                <td className="py-1.5">
                                  {m.isPassed ? (
                                    <span className="text-emerald-400">PASS</span>
                                  ) : (
                                    <span className="text-rose-400">FAIL</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* CSS Box Metrics & DOM Geometry */}
                {selectedEvent.uiTelemetry && (
                  <div className="rounded-xl border border-slate-800 bg-[#111622] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                        DOM Geometry & CSS Box Model
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Dimensions</div>
                        <div className="text-slate-200 font-bold mt-0.5">
                          {selectedEvent.uiTelemetry.geometry.width} × {selectedEvent.uiTelemetry.geometry.height} px
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Position (X, Y)</div>
                        <div className="text-slate-200 font-bold mt-0.5">
                          [{selectedEvent.uiTelemetry.geometry.x}, {selectedEvent.uiTelemetry.geometry.y}]
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Tag / Role</div>
                        <div className="text-cyan-300 font-bold mt-0.5 truncate">
                          &lt;{selectedEvent.uiTelemetry.tagName}&gt;
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Interactive</div>
                        <div className="text-emerald-400 font-bold mt-0.5">
                          {selectedEvent.uiTelemetry.isInteractive ? "YES" : "NO"}
                        </div>
                      </div>
                    </div>

                    {selectedEvent.xpath && (
                      <div className="mt-3 rounded-lg bg-slate-900/90 p-2.5 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">
                          XPath Locator ({selectedEvent.uiTelemetry.xpathInfo.strategy})
                        </div>
                        <div className="text-xs font-mono text-cyan-300 break-all select-all">
                          {selectedEvent.xpath}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Raw Telemetry JSON Payload */}
                <div className="rounded-xl border border-slate-800 bg-[#090d14] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">
                      Raw Telemetry Payload
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">application/json</span>
                  </div>

                  <pre className="max-h-72 overflow-y-auto rounded-lg bg-black/60 p-3 font-mono text-xs text-cyan-300/90 leading-relaxed border border-slate-800/80">
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <ListTree className="h-10 w-10 mb-2 stroke-1 opacity-40" />
                <p className="text-sm font-mono">Select an event from the timeline stream</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0d121c] px-6 py-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <span>Route: {selectedEvent?.route || session?.finalRoute || "/run"}</span>
            <span>·</span>
            <span>Duration: {session ? `${Math.round(session.durationMs / 1000)}s` : "0s"}</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close (Esc)
          </button>
        </div>
      </div>

      {/* Expanded Screenshot Modal */}
      {expandedScreenshot && (
        <div
          className="fixed inset-0 z-[10070] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpandedScreenshot(null)}
        >
          <div className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl border border-cyan-500/50 bg-[#0c1017] p-2">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 text-xs font-mono text-slate-200">
              <span className="truncate">{expandedScreenshot.title}</span>
              <button
                type="button"
                onClick={() => setExpandedScreenshot(null)}
                className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={expandedScreenshot.dataUrl}
              alt={expandedScreenshot.title}
              className="max-h-[80vh] w-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

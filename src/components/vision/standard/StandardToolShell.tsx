import React, { useState, type ReactNode } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { StandardHeaderReadouts } from "./StandardHeaderReadouts";
import { StandardImageToolbar } from "./StandardImageToolbar";
import { StandardCanvas } from "./StandardCanvas";
import { StandardActionBar } from "./StandardActionBar";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface ToolTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface StandardToolShellProps {
  toolName: string;
  toolKindId?: string;
  tabs: ToolTabItem[];
  defaultTabId?: string;
  settings: PatternSearchSettings;
  onChangeSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  onSettings?: () => void;
  onRegisterImage?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRefresh?: () => void;
}

export function StandardToolShell({
  toolName,
  toolKindId = "T100",
  tabs,
  defaultTabId,
  settings,
  onChangeSettings,
  onEvaluate,
  onCancel,
  onOk,
  onSettings,
  onRegisterImage,
  onOriginPoint,
  onDisplay,
  onRefresh,
}: StandardToolShellProps): React.JSX.Element {
  const [activeTabId, setActiveTabId] = useState<string>(defaultTabId || tabs[0]?.id || "region");
  const [viewModes, setViewModes] = useState({ regions: true, results: true, grid: false });

  const activeTabContent = tabs.find((t) => t.id === activeTabId)?.content || tabs[0]?.content;

  const handleCancel = onCancel ?? (() => {
    if (typeof window !== "undefined" && window.location) {
      window.location.href = "/setup/rules";
    }
  });

  const handleOk = onOk ?? (() => {
    if (typeof window !== "undefined" && window.location) {
      window.location.href = "/setup/rules";
    }
  });

  const handleSettings = onSettings ?? (() => {
    if (typeof window !== "undefined" && window.location) {
      window.location.href = "/settings";
    }
  });

  const handleRegisterImage = onRegisterImage ?? (() => {
    onChangeSettings((s) => ({
      ...s,
      referenceImage: {
        ...s.referenceImage,
        index: (s.referenceImage?.index || 0) + 1,
      },
    }));
  });

  const handleOriginPoint = onOriginPoint ?? (() => {
    onChangeSettings((s) => ({
      ...s,
      view: { ...s.view, zoom: 100 },
      searchRegion: {
        ...s.searchRegion,
        geometry: { ...s.searchRegion.geometry, x: 0, y: 0 },
      },
    }));
  });

  const handleDisplay = onDisplay ?? (() => {
    setViewModes((prev) => ({
      regions: !prev.regions,
      results: !prev.results,
      grid: !prev.grid,
    }));
  });

  const handleRefresh = onRefresh ?? (() => {
    onChangeSettings((s) => ({
      ...s,
      view: { ...s.view, zoom: 100 },
    }));
    onEvaluate?.();
  });

  return (
    <div className="flex flex-col h-full bg-std-chrome overflow-x-auto text-std-text font-sans select-none">
      <div className="flex flex-col min-w-[1024px] min-h-[720px] h-full relative">
        <ResizablePanelGroup orientation="horizontal" className="flex flex-1 min-h-0">
          {/* Left Canvas Panel */}
          <ResizablePanel
            defaultSize="62%"
            minSize="45%"
            className="flex flex-col relative bg-std-chrome min-w-0"
          >
            <StandardImageToolbar
              settings={settings}
              setSettings={onChangeSettings}
              viewModes={viewModes}
              setViewModes={setViewModes}
              onRefresh={handleRefresh}
            />
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div className="absolute top-3 left-3 z-10 pointer-events-auto">
                <StandardHeaderReadouts />
              </div>
              <StandardCanvas
                settings={settings}
                setSettings={onChangeSettings}
                viewModes={viewModes}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle aria-label="Resize tool panels" />

          {/* Right Configuration Tool Panel */}
          <ResizablePanel
            defaultSize="38%"
            minSize="28%"
            maxSize="55%"
            className="border-l border-ca-border flex flex-col bg-ca-panel text-ca-ink relative z-20"
          >
            {/* Tool Title Bar */}
            <div className="flex items-center justify-between border-b border-ca-border bg-ca-panel-2 px-3 py-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-ca-select text-ca-bg px-1.5 py-0.5 rounded shadow-sm">
                  {toolKindId}
                </span>
                <span className="font-bold text-xs uppercase tracking-wide text-ca-ink">
                  {toolName}
                </span>
              </div>
              <span className="text-[11px] font-mono text-ca-ink-muted">
                {tabs.find((t) => t.id === activeTabId)?.label}
              </span>
            </div>

            {/* Tool Tab Buttons */}
            <div className="flex items-center gap-1 border-b border-ca-border bg-ca-bg/70 px-2 py-1 overflow-x-auto shrink-0">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-ca-panel text-ca-ink border border-ca-border shadow-sm font-semibold"
                        : "text-ca-ink-muted hover:bg-ca-panel/60 hover:text-ca-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Active Tab Panel Body */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-ca-panel">
              {activeTabContent}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Global Tool Action Bar */}
        <StandardActionBar
          onEvaluate={onEvaluate}
          onCancel={handleCancel}
          onOk={handleOk}
          onSettings={handleSettings}
          onRegisterImage={handleRegisterImage}
          onOriginPoint={handleOriginPoint}
          onDisplay={handleDisplay}
        />
      </div>
    </div>
  );
}

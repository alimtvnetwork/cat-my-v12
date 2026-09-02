import React from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { StandardHeaderReadouts } from "./StandardHeaderReadouts";
import { StandardImageToolbar } from "./StandardImageToolbar";
import { StandardCanvas } from "./StandardCanvas";
import { StandardToolPanel } from "./StandardToolPanel";
import { StandardActionBar } from "./StandardActionBar";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardPatternSearchProps {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  onSettings?: () => void;
  onRegisterImage?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRefresh?: () => void;
  onPreview?: () => void;
}

export function StandardPatternSearch({
  settings,
  onChange,
  onEvaluate,
  onCancel,
  onOk,
  onSettings,
  onRegisterImage,
  onOriginPoint,
  onDisplay,
  onRefresh,
  onPreview,
}: StandardPatternSearchProps): React.JSX.Element | null {
  const [viewModes, setViewModes] = React.useState({ regions: true, results: true, grid: false });

  const handleCancel =
    onCancel ??
    (() => {
      if (typeof window !== "undefined" && window.location) {
        window.location.href = "/setup/rules";
      }
    });

  const handleOk =
    onOk ??
    (() => {
      if (typeof window !== "undefined" && window.location) {
        window.location.href = "/setup/rules";
      }
    });

  const handleSettings =
    onSettings ??
    (() => {
      if (typeof window !== "undefined" && window.location) {
        window.location.href = "/settings";
      }
    });

  const handleRegisterImage =
    onRegisterImage ??
    (() => {
      onChange((s) => ({
        ...s,
        referenceImage: {
          ...s.referenceImage,
          index: s.referenceImage.index + 1,
        },
      }));
    });

  const handleOriginPoint =
    onOriginPoint ??
    (() => {
      onChange((s) => ({
        ...s,
        view: { ...s.view, zoom: 100 },
        searchRegion: {
          ...s.searchRegion,
          geometry: { ...s.searchRegion.geometry, x: 0, y: 0 },
        },
      }));
    });

  const handleDisplay =
    onDisplay ??
    (() => {
      setViewModes((prev) => ({
        regions: !prev.regions,
        results: !prev.results,
        grid: !prev.grid,
      }));
    });

  const handleRefresh =
    onRefresh ??
    (() => {
      onChange((s) => ({
        ...s,
        view: { ...s.view, zoom: 100 },
      }));
      onEvaluate?.();
    });

  const handlePreview = onPreview ?? onEvaluate;

  return (
    <div className="flex flex-col h-full bg-std-chrome overflow-x-auto text-std-text font-sans">
      <div className="flex flex-col min-w-[1024px] min-h-[768px] h-full relative">
        <ResizablePanelGroup orientation="horizontal" className="flex flex-1 min-h-0">
          <ResizablePanel
            defaultSize="62%"
            minSize="45%"
            className="flex flex-col relative bg-std-chrome min-w-0"
          >
            <StandardImageToolbar
              settings={settings}
              setSettings={onChange}
              viewModes={viewModes}
              setViewModes={setViewModes}
              onRefresh={handleRefresh}
            />
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div className="absolute top-3 left-3 z-10 pointer-events-auto">
                <StandardHeaderReadouts />
              </div>
              <StandardCanvas settings={settings} setSettings={onChange} viewModes={viewModes} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle aria-label="Resize panels" />
          <ResizablePanel
            defaultSize="38%"
            minSize="25%"
            maxSize="55%"
            className="border-l border-std-accent-active flex flex-col bg-std-panel text-std-text relative z-20"
          >
            <StandardToolPanel
              settings={settings}
              setSettings={onChange}
              onPreview={handlePreview}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
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

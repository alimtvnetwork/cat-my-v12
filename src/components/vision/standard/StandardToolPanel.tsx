import React, { useState, useMemo } from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { ShapeType } from "@/domain/vision/shapes";
import { PatternRegionTab } from "./tabs/PatternRegionTab";
import { SearchRegionTab } from "./tabs/SearchRegionTab";
import { PlaceholderTabs } from "./tabs/PlaceholderTabs";
import { ToolTitleBar } from "./ToolTitleBar";
import { ToolTabs } from "./ToolTabs";
import { PhotoshopLayersPanel } from "@/components/vision/layers/PhotoshopLayersPanel";
import type { VisionLayerItem } from "@/components/vision/layers/types";

export interface StandardToolPanelProps {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onCancel?: () => void;
  onOk?: () => void;
  onPreview?: () => void;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
}

export function StandardToolPanel({
  settings,
  setSettings,
  onCancel,
  onOk,
  onPreview,
  selectedLayerId,
  onSelectLayer,
}: StandardToolPanelProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState("Pattern Region");
  const [internalSelectedLayerId, setInternalSelectedLayerId] = useState<string>("layer-1-roi");
  const [isRoiLocked, setIsRoiLocked] = useState(false);
  const [isPatternLocked, setIsPatternLocked] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(true);
  const [isRoiVisible, setIsRoiVisible] = useState(true);
  const [isPatternVisible, setIsPatternVisible] = useState(true);

  const activeSelectedLayerId = selectedLayerId ?? internalSelectedLayerId;

  const handleSelectLayer = (id: string) => {
    setInternalSelectedLayerId(id);
    onSelectLayer?.(id);
  };

  const layers: VisionLayerItem[] = useMemo(() => {
    const list: VisionLayerItem[] = [
      {
        id: "layer-0-image",
        name: "Reference Image",
        type: "image",
        isVisible: isImageVisible,
        isLocked: true,
        colorTag: "#64748b",
        zIndex: 0,
        details: settings.imageRef ? "Registered Image" : "Default Sample",
      },
      {
        id: "layer-1-roi",
        name: "Search ROI",
        type: "roi",
        isVisible: isRoiVisible,
        isLocked: isRoiLocked,
        colorTag: "#00e5ff",
        zIndex: 10,
        details: `[${Math.round(settings.searchRegion.geometry.width || 0)}×${Math.round(
          settings.searchRegion.geometry.height || 0,
        )}]`,
      },
      {
        id: "layer-2-pattern",
        name: "Pattern Template",
        type: "pattern",
        isVisible: isPatternVisible,
        isLocked: isPatternLocked,
        colorTag: "#10b981",
        zIndex: 20,
        details: `[${Math.round(settings.patternRegion.geometry.width || 0)}×${Math.round(
          settings.patternRegion.geometry.height || 0,
        )}]`,
      },
    ];

    settings.masks.forEach((mask, idx) => {
      if (mask.shape !== ShapeType.None) {
        list.push({
          id: `layer-3-mask-${idx}`,
          name: `Mask Overlay #${idx + 1}`,
          type: "mask",
          isVisible: true,
          isLocked: false,
          colorTag: "#f59e0b",
          zIndex: 30 + idx,
          details: `${mask.shape}`,
        });
      }
    });

    return list;
  }, [
    isImageVisible,
    isPatternLocked,
    isPatternVisible,
    isRoiLocked,
    isRoiVisible,
    settings.imageRef,
    settings.masks,
    settings.patternRegion.geometry.height,
    settings.patternRegion.geometry.width,
    settings.searchRegion.geometry.height,
    settings.searchRegion.geometry.width,
  ]);

  const handleToggleVisibility = (id: string) => {
    if (id === "layer-0-image") {
      setIsImageVisible((v) => !v);
    } else if (id === "layer-1-roi") {
      setIsRoiVisible((v) => !v);
    } else if (id === "layer-2-pattern") {
      setIsPatternVisible((v) => !v);
    }
  };

  const handleToggleLocked = (id: string) => {
    if (id === "layer-1-roi") {
      setIsRoiLocked((l) => !l);
    } else if (id === "layer-2-pattern") {
      setIsPatternLocked((l) => !l);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-ca-panel">
      <ToolTitleBar settings={settings} setSettings={setSettings} activeTab={activeTab} />
      <ToolTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 overflow-y-auto">
        {activeTab === "Pattern Region" && (
          <PatternRegionTab
            settings={settings}
            setSettings={setSettings}
            onCancel={onCancel}
            onOk={onOk}
          />
        )}
        {activeTab === "Search Region" && (
          <SearchRegionTab
            settings={settings}
            setSettings={setSettings}
            onCancel={onCancel}
            onOk={onOk}
            onPreview={onPreview}
          />
        )}
        {activeTab === "Layers" && (
          <div className="h-full flex flex-col p-2 bg-slate-950 text-slate-100">
            <PhotoshopLayersPanel
              layers={layers}
              selectedLayerId={activeSelectedLayerId}
              onSelectLayer={handleSelectLayer}
              onToggleVisibility={handleToggleVisibility}
              onToggleLocked={handleToggleLocked}
              onBringToFront={() => {}}
              onSendToBack={() => {}}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
            />
          </div>
        )}
        {(activeTab === "Extract Colors" || activeTab === "Image Enhance") && (
          <PlaceholderTabs name={activeTab} />
        )}
      </div>
    </div>
  );
}

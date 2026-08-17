import React, { useEffect, useRef } from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { RecipeEditor } from "./../RecipeEditor";
import { useVisionStore } from "@/lib/vision/store";
import { ShapeType } from "@/domain/vision/shapes";

export function ModernPatternSearch({
  settings,
  onChange,
}: {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}): React.JSX.Element | null {
  const store = useVisionStore();
  const hasInitialized = useRef(false);

  // Sync settings -> store ONCE when switching to Modern UI
  useEffect(() => {
    if (!hasInitialized.current) {
      if (store.segments.length > 0) {
        const segId = store.segments[0].visionSettings!.id;
        store.setActiveSegment(segId);
        
        // Map settings.masks to store masks
        store.setRoi(segId, {
          x: settings.searchRegion.geometry.x || 0,
          y: settings.searchRegion.geometry.y || 0,
          width: settings.searchRegion.geometry.width || 100,
          height: settings.searchRegion.geometry.height || 100,
          masks: settings.masks.map((m, i) => ({
            id: `mask-${i}`,
            type: m.shape,
            geometry: m.geometry,
          })),
        });
      }
      hasInitialized.current = true;
    }
  }, [settings, store]);

  // Sync store -> settings when store changes (e.g. from Modern UI editing)
  useEffect(() => {
    if (!hasInitialized.current) return;
    
    const activeSeg = store.segments.find(s => s.visionSettings?.id === store.activeSegmentId);
    if (!activeSeg || !activeSeg.visionSettings?.roi) return;
    
    const roi = activeSeg.visionSettings.roi;
    
    onChange(prev => {
      // Create new masks array based on what's in the store
      const newMasks = (roi.masks || []).map(m => ({
        shape: m.type,
        geometry: m.geometry,
      }));
      
      // Ensure at least 4 slots for Standard UI, exactly as required
      while (newMasks.length < 4) {
        newMasks.push({ shape: ShapeType.None, geometry: {} });
      }
      
      return {
        ...prev,
        searchRegion: {
          ...prev.searchRegion,
          geometry: { ...prev.searchRegion.geometry, x: roi.x, y: roi.y, width: roi.width, height: roi.height }
        },
        masks: newMasks
      };
    });
  }, [store.segments, store.activeSegmentId, onChange]);

  return <RecipeEditor />;
}

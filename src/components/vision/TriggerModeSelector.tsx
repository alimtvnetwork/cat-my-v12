import React from "react";
import { useVisionStore } from "@/lib/vision/store";
import { Label } from "@/components/ui/label";
import { useUpdateTriggerMode } from "@/hooks/use-vision-api";

export function TriggerModeSelector() {
  const { segments, activeSegmentId, setCameraSettings } = useVisionStore();
  const activeSegment = segments.find((s) => s.visionSettings?.id === activeSegmentId);

  if (!activeSegment || !activeSegmentId) return null;

  const cameraSettings = activeSegment.visionSettings?.cameraSettings ||
    activeSegment.visionSettings?.camera || {};

  const currentMode = cameraSettings.triggerMode || "Software";

  const { mutateAsync: updateTriggerMode } = useUpdateTriggerMode();

  const handleModeChange = async (mode: string) => {
    setCameraSettings(activeSegmentId, { triggerMode: mode });
    
    try {
      const cameraId = cameraSettings.id || "default-camera";
      await updateTriggerMode({ cameraId, mode });
    } catch (e) {
      console.error("Failed to update trigger mode on facade", e);
    }
  };

  return (
    <div className="mb-4">
      <Label className="block mb-2">Trigger Mode</Label>
      <div className="flex p-1 space-x-1 bg-gray-100/80 rounded-lg w-fit border border-gray-200/50">
        <label
          className={`flex items-center min-h-[40px] px-4 py-2 cursor-pointer transition-all duration-200 rounded-md ${
            currentMode === "Software" ? "bg-white shadow-sm ring-1 ring-gray-200/50" : "hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name="triggerMode"
            value="Software"
            checked={currentMode === "Software"}
            onChange={() => handleModeChange("Software")}
            className="sr-only"
          />
          <span className={`text-sm font-medium ${currentMode === "Software" ? "text-indigo-600" : "text-gray-500"}`}>
            Software
          </span>
        </label>
        <label
          className={`flex items-center min-h-[40px] px-4 py-2 cursor-pointer transition-all duration-200 rounded-md ${
            currentMode === "Hardware" ? "bg-white shadow-sm ring-1 ring-gray-200/50" : "hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name="triggerMode"
            value="Hardware"
            checked={currentMode === "Hardware"}
            onChange={() => handleModeChange("Hardware")}
            className="sr-only"
          />
          <span className={`text-sm font-medium ${currentMode === "Hardware" ? "text-indigo-600" : "text-gray-500"}`}>
            Hardware
          </span>
        </label>
      </div>
    </div>
  );
}

import React from "react";
import { useVisionStore } from "../../lib/vision/store";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { TriggerModeSelector } from "./TriggerModeSelector";
import { useUpdateCameraSetting } from "@/hooks/use-vision-api";

export function CameraSettingsForm() {
  const { segments, activeSegmentId, setCameraSettings } = useVisionStore();
  const activeSegment = segments.find((s) => s.visionSettings?.id === activeSegmentId);

  if (!activeSegment) {
    return (
      <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-sm text-gray-500">
          No active segment selected to configure camera settings.
        </p>
      </div>
    );
  }

  const cameraSettings = activeSegment.visionSettings?.cameraSettings ||
    activeSegment.visionSettings?.camera || {
      lighting: 0,
      exposure: 0,
      gain: 0,
      focus: 0,
      triggerMode: "Internal",
      triggerDelay: 0,
    };

  const handleChange = (key: keyof typeof cameraSettings, value: number) => {
    if (activeSegmentId) {
      setCameraSettings(activeSegmentId, { [key]: value });
    }
  };

  const handleStringChange = (key: string, value: string) => {
    if (activeSegmentId) {
      setCameraSettings(activeSegmentId, { [key]: value });
    }
  };

  const handleSettingCommit = async (key: string, value: number) => {
    if (key === "exposure" || key === "gain") {
      try {
        const cameraId = activeSegment.visionSettings?.cameraId || "default-camera";
        await updateCameraSetting({ cameraId, key, value });
      } catch (err) {
        console.warn(`Failed to commit camera setting ${key}:`, err);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Camera Settings</h3>
      
      <Accordion type="single" collapsible defaultValue="basics" className="w-full">
        
        <AccordionItem value="trigger">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4 space-y-4">
            <TriggerModeSelector />
            
            {cameraSettings.triggerMode === "Hardware" && (
              <div className="flex gap-4">
                <div>
                  <Label className="block mb-1">Trigger Source</Label>
                  <select
                    className="w-32 min-h-[40px] px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={cameraSettings.triggerSource || "Line 1"}
                    onChange={(e) => handleStringChange("triggerSource", e.target.value)}
                  >
                    <option value="Line 1">Line 1</option>
                    <option value="Line 2">Line 2</option>
                    <option value="Line 3">Line 3</option>
                  </select>
                </div>
                <div>
                  <Label className="block mb-1">Trigger Delay (ms)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={cameraSettings.triggerDelay || 0}
                    onChange={(e) => handleChange("triggerDelay", Number(e.target.value))}
                    className="w-32 min-h-[40px]"
                  />
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="basics">
          <AccordionTrigger>Camera Basics</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4 space-y-6">
            <div>
              <Label className="block mb-2">Lighting</Label>
              <div className="flex items-center space-x-4">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[cameraSettings.lighting || 0]}
                  onValueChange={(vals) => handleChange("lighting", vals[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={cameraSettings.lighting || 0}
                  onChange={(e) => handleChange("lighting", Number(e.target.value))}
                  className="w-20 min-h-[40px]"
                />
              </div>
            </div>
            <div>
              <Label className="block mb-2">Exposure</Label>
              <div className="flex items-center space-x-4">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[cameraSettings.exposure || 0]}
                  onValueChange={(vals) => handleChange("exposure", vals[0])}
                  onValueCommit={(vals) => handleSettingCommit("exposure", vals[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={cameraSettings.exposure || 0}
                  onChange={(e) => {
                    handleChange("exposure", Number(e.target.value));
                    handleSettingCommit("exposure", Number(e.target.value));
                  }}
                  className="w-20 min-h-[40px]"
                />
              </div>
            </div>
            <div>
              <Label className="block mb-2">Gain</Label>
              <div className="flex items-center space-x-4">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[cameraSettings.gain || 0]}
                  onValueChange={(vals) => handleChange("gain", vals[0])}
                  onValueCommit={(vals) => handleSettingCommit("gain", vals[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={cameraSettings.gain || 0}
                  onChange={(e) => {
                    handleChange("gain", Number(e.target.value));
                    handleSettingCommit("gain", Number(e.target.value));
                  }}
                  className="w-20 min-h-[40px]"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="optics">
          <AccordionTrigger>Optics</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div>
              <Label className="block mb-3">Manual Focus</Label>
              <div className="flex items-center gap-5">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[cameraSettings.focus || 0]}
                  onValueChange={(vals) => handleChange("focus", vals[0])}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={cameraSettings.focus || 0}
                  onChange={(e) => handleChange("focus", Number(e.target.value))}
                  className="w-24 min-h-[40px]"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

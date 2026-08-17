import { ClientLogger } from "@/lib/observability/client-logger";
import React from "react";
import { SegmentSelector } from "./SegmentSelector";
import { CameraSettingsForm } from "./CameraSettingsForm";
import { HandlerSettingsForm } from "./HandlerSettingsForm";
import { RoiSelector } from "./RoiSelector";
import { MaskTools } from "./MaskTools";
import { ColorTools } from "./ColorTools";
import { ShapeTrax3Tool } from "./ShapeTrax3Tool";
import { PinConsistencyTool } from "./PinConsistencyTool";
import { useVisionStore } from "../../lib/vision/store";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export function RecipeEditor() {
  const { segments, activeSegmentId } = useVisionStore();
  const activeSegment = segments.find((s) => s.visionSettings?.id === activeSegmentId);

  const handleSave = () => {
    // Serialize state to backend envelope payload
    const payload = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      activeSegmentId,
      segments: segments.map((s) => ({
        id: s.id,
        name: s.name,
        visionSettings: s.visionSettings,
      })),
    };
    ClientLogger.info("Saving recipe envelope...", JSON.stringify(payload, null, 2));
    alert("Recipe saved to console.");
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10 gap-4">
        <div className="flex-1 w-full sm:w-auto overflow-hidden">
          <SegmentSelector />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Button onClick={handleSave} className="flex items-center">
            <Save className="w-4 h-4 mr-2" />
            Save Recipe
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {!activeSegment ? (
            <div className="text-center text-zinc-500 py-12">
              Select or create a segment to edit its recipe.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Column: I/O and Camera */}
              <div className="xl:col-span-4 space-y-6">
                <HandlerSettingsForm />
                <CameraSettingsForm />
              </div>

              {/* Middle Column: ROI, Masking, Processing */}
              <div className="xl:col-span-4 space-y-6">
                <RoiSelector />
                <MaskTools />
                <ColorTools />
              </div>

              {/* Right Column: Advanced Tools */}
              <div className="xl:col-span-4 space-y-6">
                <ShapeTrax3Tool />
                <PinConsistencyTool />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

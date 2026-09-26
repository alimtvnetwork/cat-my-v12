import { useVisionStore } from "@/lib/vision/store";
import { ImageSourceModeType } from "@/types/vision/ImageSourceModeType";
import { StaticImageViewer } from "./StaticImageViewer";
import { LiveCameraViewer } from "./LiveCameraViewer";
import { SafeZoneOverlay } from "./SafeZoneOverlay";
import { ZoomableCanvas } from "./ZoomableCanvas";
import { FocusPeakingVisualizer } from "./FocusPeakingVisualizer";
import { RuleDrawingOverlay } from "./RuleDrawingOverlay";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCameraStatus } from "@/hooks/use-vision-api";

export function MainVisionCanvas(): React.JSX.Element | null {
  const mode = useVisionStore((s) => s.imageSourceMode);
  const isCapturing = useVisionStore((s) => s.isCapturing);
  const { data: cameraStatus } = useCameraStatus("default");
  const isConnected = cameraStatus?.status === "connected";

  return (
    <div className="absolute inset-0 flex flex-col w-full h-full bg-ca-panel overflow-hidden">
      <ZoomableCanvas>
        <div className="relative flex items-center justify-center w-full h-full min-h-0">
          {mode === ImageSourceModeType.SPLIT ? (
            <div className="flex flex-row w-full h-full divide-x divide-ca-border">
              <div className="flex-1 relative">
                <StaticImageViewer />
              </div>
              <div className="flex-1 relative">
                <LiveCameraViewer isConnected={isConnected} />
              </div>
            </div>
          ) : mode === ImageSourceModeType.STATIC ? (
            <StaticImageViewer />
          ) : (
            <LiveCameraViewer isConnected={isConnected} />
          )}
          <FocusPeakingVisualizer />
          <RuleDrawingOverlay />
          <SafeZoneOverlay />
          {isCapturing && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-white" />
            </div>
          )}
        </div>
      </ZoomableCanvas>
    </div>
  );
}

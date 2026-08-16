import { useVisionStore } from "@/lib/vision/store";
import { ImageSourceModeType } from "@/types/vision/ImageSourceModeType";
import { StaticImageViewer } from "./StaticImageViewer";
import { LiveCameraViewer } from "./LiveCameraViewer";
import { SafeZoneOverlay } from "./SafeZoneOverlay";
import { ZoomableCanvas } from "./ZoomableCanvas";
import { useState } from "react";
// Import connection facade when available, for now using mock state
// import { useCameraStatus } from "@/lib/facades/camera";

export function MainVisionCanvas() {
  const mode = useVisionStore((s) => s.imageSourceMode);
  // Mock connection status
  const [isConnected, setIsConnected] = useState(true);

  return (
    <div className="relative w-full h-full flex flex-col flex-1 min-h-[400px] bg-ca-panel rounded-md border border-ca-border overflow-hidden">
      <ZoomableCanvas>
        <div className="relative w-full h-full min-h-[400px]">
          {mode === ImageSourceModeType.STATIC ? (
            <StaticImageViewer />
          ) : (
            <LiveCameraViewer isConnected={isConnected} />
          )}
          <SafeZoneOverlay />
        </div>
      </ZoomableCanvas>
    </div>
  );
}


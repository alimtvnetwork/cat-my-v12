import { useVisionStore } from "@/lib/vision/store";
import { ImageSourceModeType } from "@/types/vision/ImageSourceModeType";
import { StaticImageViewer } from "./StaticImageViewer";
import { LiveCameraViewer } from "./LiveCameraViewer";
import { SafeZoneOverlay } from "./SafeZoneOverlay";
import { useState, useEffect } from "react";
// Import connection facade when available, for now using mock state
// import { useCameraStatus } from "@/lib/facades/camera";

export function MainVisionCanvas() {
  const mode = useVisionStore((s) => s.imageSourceMode);
  // Mock connection status
  const [isConnected, setIsConnected] = useState(true);

  return (
    <div className="relative w-full h-full flex flex-col flex-1 min-h-0 bg-ca-panel rounded-md border border-ca-border overflow-hidden">
      <div className="relative flex-1 w-full h-full min-h-0">
        {mode === ImageSourceModeType.STATIC ? (
          <StaticImageViewer />
        ) : (
          <LiveCameraViewer isConnected={isConnected} />
        )}
        <SafeZoneOverlay />
      </div>
    </div>
  );
}

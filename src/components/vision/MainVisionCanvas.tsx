import { useVisionStore } from "@/lib/vision/store";
import { ImageSourceModeType } from "@/types/vision/ImageSourceModeType";
import { StaticImageViewer } from "./StaticImageViewer";
import { LiveCameraViewer } from "./LiveCameraViewer";
import { SafeZoneOverlay } from "./SafeZoneOverlay";
import { ZoomableCanvas } from "./ZoomableCanvas";
import { useState } from "react";
import { Loader2 } from "lucide-react";
// Import connection facade when available, for now using mock state
// import { useCameraStatus } from "@/lib/facades/camera";

export function MainVisionCanvas() {
  const mode = useVisionStore((s) => s.imageSourceMode);
  const isCapturing = useVisionStore((s) => s.isCapturing);
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


import { CameraOff } from "lucide-react";

export function LiveCameraViewer({ isConnected }: { isConnected: boolean }) {
  if (!isConnected) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-ca-panel/50 text-ca-muted overflow-hidden">
        <CameraOff className="h-12 w-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-ca-foreground">Camera Disconnected</h3>
        <p className="text-sm text-center max-w-sm mt-2">
          Please check the connection or switch to static image mode to continue editing the recipe.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-black overflow-hidden">
      {/* Stub for live video feed */}
      <video
        className="max-h-full max-w-full object-contain pointer-events-none opacity-50"
        autoPlay
        muted
        playsInline
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white/50 font-medium">Live Feed Active</span>
      </div>
    </div>
  );
}

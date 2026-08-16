import { CameraOff, Focus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LiveCameraViewer({ isConnected }: { isConnected: boolean }) {
  const [focusPeaking, setFocusPeaking] = useState(false);

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
    <div className="relative h-full w-full flex flex-col items-center justify-center bg-black overflow-hidden group">
      {/* Stub for live video feed */}
      <video
        className="max-h-full max-w-full object-contain pointer-events-none opacity-50"
        autoPlay
        muted
        playsInline
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white/50 font-medium">Live Feed Active</span>
      </div>
      
      {/* Focus Peaking Overlay Stub */}
      {focusPeaking && (
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/20 to-transparent" />
      )}

      {/* Toolbar overlay */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={focusPeaking ? "default" : "secondary"}
                size="icon"
                onClick={() => setFocusPeaking(!focusPeaking)}
                className="w-10 h-10 rounded-full shadow-md backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white"
              >
                <Focus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Toggle Focus Peaking
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

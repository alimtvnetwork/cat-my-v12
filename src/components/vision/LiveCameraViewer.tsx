import { CameraOff, Focus, Usb, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LiveCameraViewer({ isConnected }: { isConnected: boolean }) {
  const [focusPeaking, setFocusPeaking] = useState(false);

  if (!isConnected) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-ca-panel border border-ca-border/50 text-ca-muted overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ca-panel to-ca-bg pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center max-w-md text-center p-8 rounded-xl bg-ca-bg/50 border border-ca-border backdrop-blur-sm shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ca-panel border border-ca-border mb-6">
            <CameraOff className="h-8 w-8 text-ca-muted" />
          </div>
          <h3 className="text-[15px] font-medium text-ca-foreground mb-2">No Signal Detected</h3>
          <p className="text-[13px] text-ca-muted mb-6 leading-relaxed">
            The camera feed is currently unavailable. Please verify the hardware connection or ensure the camera is not being used by another application.
          </p>
          <div className="flex flex-col w-full gap-3 text-left">
            <div className="flex items-center gap-3 text-[13px] p-3 rounded bg-ca-panel/50 border border-ca-border/50">
               <Usb className="h-4 w-4 text-ca-muted" />
               <span className="text-ca-foreground">Check USB or GigE connection</span>
            </div>
            <div className="flex items-center gap-3 text-[13px] p-3 rounded bg-ca-panel/50 border border-ca-border/50">
               <AlertCircle className="h-4 w-4 text-ca-muted" />
               <span className="text-ca-foreground">Verify driver installation</span>
            </div>
          </div>
        </div>
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

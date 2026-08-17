import { CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisionStore } from "@/lib/vision/store";
import { ImageSourceModeType } from "@/types/vision/ImageSourceModeType";

export function LiveModeEmptyState(): React.JSX.Element | null {
  const setMode = useVisionStore((s) => s.setImageSourceMode);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center bg-ca-panel/50 text-ca-muted overflow-hidden">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-ca-panel border border-ca-border shadow-sm mb-4">
        <CameraOff className="h-8 w-8 text-ca-muted opacity-75" />
      </div>
      <h3 className="text-lg font-medium text-ca-foreground">Camera Disconnected</h3>
      <p className="text-sm text-center max-w-sm mt-2 text-ca-muted-foreground">
        Please check the hardware connection or switch to static image mode to continue editing the rules.
      </p>
      <div className="mt-6">
        <Button 
          variant="outline" 
          onClick={() => setMode(ImageSourceModeType.STATIC)}
        >
          Switch to Static Mode
        </Button>
      </div>
    </div>
  );
}

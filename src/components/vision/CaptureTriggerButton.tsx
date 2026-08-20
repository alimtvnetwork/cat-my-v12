import { useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToastError } from "@/lib/errors/notify";
import { useVisionStore } from "@/lib/vision/store";
import { useCaptureImage } from "@/hooks/use-vision-api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export function CaptureTriggerButton(): React.JSX.Element | null {
  const isCapturing = useVisionStore((s) => s.isCapturing);
  const setIsCapturing = useVisionStore((s) => s.setIsCapturing);

  const { mutateAsync: captureImage } = useCaptureImage();

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      await captureImage("default-camera");
      // Handle success (e.g. save to store)
    } catch (err: unknown) {
      showToastError("Capture Failed", err, { source: "CaptureTriggerButton" });
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (KeyboardKeyType.isSpace(e.key) && !isCapturing) {
        e.preventDefault();
        handleCapture();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCapturing]);

  return (
    <div className="flex flex-col items-center relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCapture}
              disabled={isCapturing}
              variant="default"
              size="icon"
              className="w-10 h-10 rounded-full shadow-md hover:scale-105 transition-transform"
              aria-label="Trigger Capture"
            >
              {isCapturing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Capture (Space)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

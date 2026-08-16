import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToastError } from "@/lib/errors/notify";

export function CaptureTriggerButton() {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      // Mock API call since facade methods are added in phase 4
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.8) {
            reject(new Error("Mock camera failure"));
          } else {
            resolve(true);
          }
        }, 1000);
      });
      // Handle success (e.g. save to store)
    } catch (err: unknown) {
      showToastError(err instanceof Error ? err.message : "Capture failed", "Capture Failed");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex flex-col items-center relative">
      <Button
        onClick={handleCapture}
        disabled={isCapturing}
        variant="default"
        size="icon"
        className="w-10 h-10 rounded-full shadow-md hover:scale-105 transition-transform"
        aria-label="Trigger Capture"
      >
        {isCapturing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </Button>
    </div>
  );
}

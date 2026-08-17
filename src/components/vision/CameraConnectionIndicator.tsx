import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { visionFacade } from "@/lib/facades/vision-facade";
import type { CameraStatusResponse } from "@/lib/facades/domain-facade";

export function CameraConnectionIndicator({ cameraId = "default" }: { cameraId?: string }) {
  const [status, setStatus] = useState<CameraStatusResponse["status"] | "connecting">("connecting");

  useEffect(() => {
    let mounted = true;
    
    const checkStatus = async () => {
      try {
        const response = await visionFacade.getCameraStatus(cameraId);
        if (mounted) {
          setStatus(response.status);
        }
      } catch (err) {
        if (mounted) {
          setStatus("error");
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [cameraId]);

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-ca-panel border border-ca-border rounded-md">
      <div
        className={cn("w-2 h-2 rounded-full", {
          "bg-green-500": status === "connected",
          "bg-ca-muted": status === "disconnected",
          "bg-yellow-500": status === "connecting",
          "bg-red-500": status === "error",
        })}
      />
      <span className="text-[13px] tabular-nums text-ca-foreground capitalize">
        {status}
      </span>
    </div>
  );
}

import { useCameraStatus } from "@/hooks/use-vision-api";
import { cn } from "@/lib/utils";

export function CameraConnectionIndicator({ cameraId = "default" }: { cameraId?: string }) {
  const { data, isFail, isLoading } = useCameraStatus(cameraId);
  
  let status: "connected" | "disconnected" | "error" | "connecting" = "connecting";
  if (isFail) {
    status = "error";
  } else if (data) {
    status = data.status;
  } else if (isLoading) {
    status = "connecting";
  }

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

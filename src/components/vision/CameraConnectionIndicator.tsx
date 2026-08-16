import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type ConnectionStatus = "connected" | "disconnected" | "connecting";

export function CameraConnectionIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>("connected");

  // Mock polling for facade since it's added in phase 4
  useEffect(() => {
    const interval = setInterval(() => {
      // Mock randomly changing status or just keep connected
      // setStatus(Math.random() > 0.9 ? "disconnected" : "connected");
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-ca-panel border border-ca-border rounded-md">
      <div
        className={cn("w-2 h-2 rounded-full", {
          "bg-green-500": status === "connected",
          "bg-red-500": status === "disconnected",
          "bg-yellow-500": status === "connecting",
        })}
      />
      <span className="text-[13px] tabular-nums text-ca-foreground capitalize">
        {status}
      </span>
    </div>
  );
}

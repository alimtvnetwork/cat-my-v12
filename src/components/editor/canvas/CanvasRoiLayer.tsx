import { ReactNode } from "react";

interface CanvasRoiLayerProps {
  children: ReactNode;
}

export function CanvasRoiLayer({ children }: CanvasRoiLayerProps) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {children}
    </div>
  );
}

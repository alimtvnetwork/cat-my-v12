import { ReactNode } from "react";

interface CanvasResultLayerProps {
  children: ReactNode;
  visible: boolean;
}

export function CanvasResultLayer({ children, visible }: CanvasResultLayerProps) {
  if (!visible) return null;
  
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {children}
    </div>
  );
}

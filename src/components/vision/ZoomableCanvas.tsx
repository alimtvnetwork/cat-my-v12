import { useState, useRef, ReactNode } from "react";
import { Maximize, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoiBadge } from "./RoiBadge";
import { usePanZoom } from "@/hooks/usePanZoom";

interface Props {
  children: ReactNode;
}

export function ZoomableCanvas({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showResultLayer, setShowResultLayer] = useState(true);

  const {
    transform,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetView
  } = usePanZoom(containerRef);

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-ca-panel touch-none"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="absolute inset-0 origin-top-left transition-transform duration-75"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        {children}
      </div>
      
      {/* Overlay Toolbar (Step 70 & 73) */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-30">
        <Button
          variant={showResultLayer ? "default" : "secondary"}
          size="icon"
          onClick={() => setShowResultLayer(!showResultLayer)}
          title="Toggle Result Overlay"
          className="w-10 h-10 rounded-full shadow-md opacity-80 hover:opacity-100"
        >
          <Layers className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={resetView}
          title="Reset View"
          className="w-10 h-10 rounded-full shadow-md opacity-80 hover:opacity-100"
        >
          <Maximize className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}


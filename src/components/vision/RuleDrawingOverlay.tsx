import React, { useState } from "react";
import { useVisionStore } from "@/lib/vision/store";

interface Point {
  x: number;
  y: number;
}

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function RuleDrawingOverlay() {
  const { drawingTool, setDrawingTool } = useVisionStore();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  
  // Polygon state for shape track
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawingTool === "none") return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingTool === "shape_track") {
      setPolygonPoints(prev => [...prev, { x, y }]);
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return;
    if (drawingTool === "shape_track") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentBox({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      w: Math.abs(x - startPoint.x),
      h: Math.abs(y - startPoint.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawingTool === "shape_track") return;
    
    setIsDrawing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // In a real app we'd save this to the active rule
    if (currentBox && currentBox.w > 5 && currentBox.h > 5) {
      console.log("Rule drawing added:", drawingTool, currentBox);
      // Reset tool after draw
      setDrawingTool("none");
      setCurrentBox(null);
    }
  };

  // Allow double click to finish polygon
  const handleDoubleClick = () => {
    if (drawingTool === "shape_track" && polygonPoints.length > 2) {
      console.log("Shape track polygon finished:", polygonPoints);
      setDrawingTool("none");
      setPolygonPoints([]);
    }
  };

  if (drawingTool === "none" && !currentBox && polygonPoints.length === 0) return null;

  return (
    <div 
      className="absolute inset-0 z-40 cursor-crosshair touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Pattern Edge / ROI Box */}
      {(drawingTool === "pattern_edge" || drawingTool === "roi") && currentBox && (
        <div 
          className={`absolute border-2 ${drawingTool === "pattern_edge" ? 'border-yellow-400 bg-yellow-400/20' : 'border-blue-400 bg-blue-400/20'}`}
          style={{
            left: currentBox.x,
            top: currentBox.y,
            width: currentBox.w,
            height: currentBox.h
          }}
        />
      )}

      {/* Shape Track Polygon */}
      {drawingTool === "shape_track" && polygonPoints.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <polygon
            points={polygonPoints.map(p => `${p.x},${p.y}`).join(" ")}
            className="fill-green-400/20 stroke-green-400 stroke-2"
          />
          {polygonPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} className="fill-green-400" />
          ))}
          {/* Line to current pointer position could be added here in real impl */}
        </svg>
      )}
      
      {/* Tooltip hint */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm">
        {drawingTool === "shape_track" ? "Click to add points, double-click to finish" : "Click and drag to define region"}
      </div>
    </div>
  );
}

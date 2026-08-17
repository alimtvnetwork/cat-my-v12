import React from "react";
import { useVisionStore } from "../../lib/vision/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Square, Circle as CircleIcon, Hexagon, Trash2 } from "lucide-react";
import type { Mask } from "../../lib/vision/types";
import { ShapeType } from "../../domain/vision/shapes";
import { MaskShapes } from "../../domain/vision/pattern-search";

export function MaskTools(): React.JSX.Element | null {
  const { segments, activeSegmentId, addMask, removeMask } = useVisionStore();

  const activeSegment = segments.find((s) => s.visionSettings?.id === activeSegmentId);
  if (!activeSegment || !activeSegment.visionSettings) return null;

  const masks = activeSegment.visionSettings.roi?.masks || [];
  const segmentId = activeSegment.visionSettings.id;

  const handleAddMask = (type: Mask["type"]) => {
    const newMask: Mask = {
      id: crypto.randomUUID(),
      type,
      geometry: { x: 40, y: 40, width: 20, height: 20, ...(type === ShapeType.Circle ? { radius: 10 } : {}) },
    };
    addMask(segmentId, newMask);
  };

  return (
    <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight">Masking Tools</CardTitle>
        <CardDescription>Draw regions to ignore within the inspection area.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            {MaskShapes.filter(s => s.id !== ShapeType.None).map(shape => {
              const Icon = shape.icon === 'Circle' ? CircleIcon : shape.icon === 'Square' ? Square : Hexagon;
              return (
                <Button key={shape.id} variant="outline" size="sm" onClick={() => handleAddMask(shape.id)}>
                  <Icon className="w-4 h-4 mr-2" />
                  {shape.label}
                </Button>
              );
            })}
          </div>

          {masks.length > 0 && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-200 dark:divide-zinc-800">
              {masks.map((mask) => (
                <div
                  key={mask.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50"
                >
                  <div className="flex items-center space-x-3">
                    {mask.type === ShapeType.Rectangle && <Square className="w-4 h-4 text-zinc-500" />}
                    {mask.type === ShapeType.Circle && <CircleIcon className="w-4 h-4 text-zinc-500" />}
                    {mask.type === ShapeType.Ellipse && <CircleIcon className="w-4 h-4 text-zinc-500" />}
                    {mask.type !== ShapeType.Rectangle && mask.type !== ShapeType.Circle && mask.type !== ShapeType.Ellipse && <Hexagon className="w-4 h-4 text-zinc-500" />}
                    <span className="text-sm font-medium capitalize">
                      {mask.type.toLowerCase()} Mask
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                    onClick={() => removeMask(segmentId, mask.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {masks.length === 0 && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-md">
              No masks created. Add one above.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

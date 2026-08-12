import React from 'react';
import { useVisionStore } from '../../lib/vision/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

export function RoiSelector() {
  const { segments, activeSegmentId, setRoi } = useVisionStore();

  const activeSegment = segments.find(s => s.visionSettings?.id === activeSegmentId);
  if (!activeSegment || !activeSegment.visionSettings) return null;

  const roi = activeSegment.visionSettings.roi || {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    shiftTolerance: 10,
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRoi(activeSegment.visionSettings!.id, {
      [name]: Number(value)
    });
  };

  const handleSliderChange = (value: number[]) => {
    setRoi(activeSegment.visionSettings!.id, {
      shiftTolerance: value[0]
    });
  };

  return (
    <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight">Region of Interest (ROI)</CardTitle>
        <CardDescription>
          Define the inspection area and acceptable shift tolerances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Visual Representation (Placeholder) */}
          <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-sm">
              Camera Feed Placeholder
            </div>
            {/* ROI Bounding Box */}
            <div 
              className="absolute border-2 border-primary bg-primary/20"
              style={{
                left: `${Math.min(Math.max(roi.x, 0), 100)}%`,
                top: `${Math.min(Math.max(roi.y, 0), 100)}%`,
                width: `${Math.min(Math.max(roi.width, 0), 100 - roi.x)}%`,
                height: `${Math.min(Math.max(roi.height, 0), 100 - roi.y)}%`,
              }}
            >
              <div className="absolute top-0 left-0 w-2 h-2 bg-primary -ml-1 -mt-1 cursor-nwse-resize" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-primary -mr-1 -mt-1 cursor-nesw-resize" />
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-primary -ml-1 -mb-1 cursor-nesw-resize" />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary -mr-1 -mb-1 cursor-nwse-resize" />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="roi-x">X (%)</Label>
                <Input
                  id="roi-x"
                  name="x"
                  type="number"
                  min={0}
                  max={100}
                  value={roi.x}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roi-y">Y (%)</Label>
                <Input
                  id="roi-y"
                  name="y"
                  type="number"
                  min={0}
                  max={100}
                  value={roi.y}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roi-width">Width (%)</Label>
                <Input
                  id="roi-width"
                  name="width"
                  type="number"
                  min={1}
                  max={100}
                  value={roi.width}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roi-height">Height (%)</Label>
                <Input
                  id="roi-height"
                  name="height"
                  type="number"
                  min={1}
                  max={100}
                  value={roi.height}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <Label>Shift Tolerance ({roi.shiftTolerance}px)</Label>
              </div>
              <Slider
                value={[roi.shiftTolerance]}
                min={0}
                max={50}
                step={1}
                onValueChange={handleSliderChange}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

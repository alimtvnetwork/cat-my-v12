import React from 'react';
import { useVisionStore } from '../../lib/vision/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ColorTools() {
  const { segments, activeSegmentId, setColorSettings } = useVisionStore();

  const activeSegment = segments.find(s => s.visionSettings?.id === activeSegmentId);
  if (!activeSegment || !activeSegment.visionSettings) return null;

  const colorSettings = activeSegment.visionSettings.roi?.colorSettings || {
    threshold: 128,
    invert: false,
    colorMap: 'grayscale',
    keyColor: '#ffffff'
  };

  const segmentId = activeSegment.visionSettings.id;

  const handleThresholdChange = (value: number[]) => {
    setColorSettings(segmentId, { threshold: value[0] });
  };

  const handleInvertChange = (checked: boolean) => {
    setColorSettings(segmentId, { invert: checked });
  };

  const handleColorMapChange = (value: string) => {
    setColorSettings(segmentId, { colorMap: value });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColorSettings(segmentId, { keyColor: e.target.value });
  };

  return (
    <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight">Image Processing</CardTitle>
        <CardDescription>
          Adjust thresholding and color mapping for inspection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Binarization Threshold ({colorSettings.threshold})</Label>
            </div>
            <Slider
              value={[colorSettings.threshold]}
              min={0}
              max={255}
              step={1}
              onValueChange={handleThresholdChange}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Label htmlFor="switch-invert" className="text-sm font-medium cursor-pointer">
              Invert Image
            </Label>
            <Switch
              id="switch-invert"
              checked={colorSettings.invert}
              onCheckedChange={handleInvertChange}
            />
          </div>

          <div className="space-y-2">
            <Label>Color Mapping</Label>
            <Select value={colorSettings.colorMap} onValueChange={handleColorMapChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select color map" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grayscale">Grayscale</SelectItem>
                <SelectItem value="2-bit">2-bit (Black/White)</SelectItem>
                <SelectItem value="heatmap">Heatmap (Jet)</SelectItem>
                <SelectItem value="key-color">Key Color Extraction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {colorSettings.colorMap === 'key-color' && (
            <div className="flex items-center space-x-3">
              <Label htmlFor="key-color">Key Color</Label>
              <input
                type="color"
                id="key-color"
                value={colorSettings.keyColor || '#ffffff'}
                onChange={handleColorChange}
                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

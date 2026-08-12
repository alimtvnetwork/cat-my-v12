import React from 'react';
import { useVisionStore } from '../../lib/vision/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

export function PinConsistencyTool() {
  const { segments, activeSegmentId, setPinConsistencySettings } = useVisionStore();

  const activeSegment = segments.find(s => s.visionSettings?.id === activeSegmentId);
  if (!activeSegment || !activeSegment.visionSettings) return null;

  const pinConsistency = activeSegment.visionSettings.roi?.pinConsistency || {
    enabled: false,
    expectedPinCount: 4,
    pitchTolerance: 0.1,
    lengthTolerance: 0.2,
  };

  const segmentId = activeSegment.visionSettings.id;

  const handleEnabledChange = (checked: boolean) => {
    setPinConsistencySettings(segmentId, { enabled: checked });
  };

  const handlePinCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPinConsistencySettings(segmentId, { expectedPinCount: Number(e.target.value) });
  };

  const handlePitchChange = (value: number[]) => {
    setPinConsistencySettings(segmentId, { pitchTolerance: value[0] });
  };

  const handleLengthChange = (value: number[]) => {
    setPinConsistencySettings(segmentId, { lengthTolerance: value[0] });
  };

  return (
    <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight">Pin Consistency Checks</CardTitle>
          <CardDescription>
            Verify connector pins count, pitch, and length.
          </CardDescription>
        </div>
        <Switch checked={pinConsistency.enabled} onCheckedChange={handleEnabledChange} />
      </CardHeader>
      
      {pinConsistency.enabled && (
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pin-count">Expected Pin Count</Label>
              <Input
                id="pin-count"
                type="number"
                min={1}
                max={100}
                value={pinConsistency.expectedPinCount}
                onChange={handlePinCountChange}
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Pitch Tolerance (±{pinConsistency.pitchTolerance}mm)</Label>
              </div>
              <Slider
                value={[pinConsistency.pitchTolerance]}
                min={0.01}
                max={1}
                step={0.01}
                onValueChange={handlePitchChange}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Length Tolerance (±{pinConsistency.lengthTolerance}mm)</Label>
              </div>
              <Slider
                value={[pinConsistency.lengthTolerance]}
                min={0.01}
                max={2}
                step={0.01}
                onValueChange={handleLengthChange}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

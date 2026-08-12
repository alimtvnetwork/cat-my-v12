import React from 'react';
import { useVisionStore } from '../../lib/vision/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export function ShapeTrax3Tool() {
  const { segments, activeSegmentId, setShapeTrax3Settings } = useVisionStore();

  const activeSegment = segments.find(s => s.visionSettings?.id === activeSegmentId);
  if (!activeSegment || !activeSegment.visionSettings) return null;

  const shapeTrax3 = activeSegment.visionSettings.roi?.shapeTrax3 || {
    enabled: false,
    matchScore: 80,
    rotationTolerance: 5,
    scaleTolerance: 5,
  };

  const segmentId = activeSegment.visionSettings.id;

  const handleEnabledChange = (checked: boolean) => {
    setShapeTrax3Settings(segmentId, { enabled: checked });
  };

  const handleMatchScoreChange = (value: number[]) => {
    setShapeTrax3Settings(segmentId, { matchScore: value[0] });
  };

  const handleRotationChange = (value: number[]) => {
    setShapeTrax3Settings(segmentId, { rotationTolerance: value[0] });
  };

  const handleScaleChange = (value: number[]) => {
    setShapeTrax3Settings(segmentId, { scaleTolerance: value[0] });
  };

  return (
    <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight">ShapeTrax3 Matching</CardTitle>
          <CardDescription>
            Configure advanced shape recognition and alignment.
          </CardDescription>
        </div>
        <Switch checked={shapeTrax3.enabled} onCheckedChange={handleEnabledChange} />
      </CardHeader>
      
      {shapeTrax3.enabled && (
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Minimum Match Score ({shapeTrax3.matchScore}%)</Label>
              </div>
              <Slider
                value={[shapeTrax3.matchScore]}
                min={1}
                max={100}
                step={1}
                onValueChange={handleMatchScoreChange}
                className="w-full"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Rotation Tolerance (±{shapeTrax3.rotationTolerance}°)</Label>
              </div>
              <Slider
                value={[shapeTrax3.rotationTolerance]}
                min={0}
                max={180}
                step={1}
                onValueChange={handleRotationChange}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Scale Tolerance (±{shapeTrax3.scaleTolerance}%)</Label>
              </div>
              <Slider
                value={[shapeTrax3.scaleTolerance]}
                min={0}
                max={50}
                step={1}
                onValueChange={handleScaleChange}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

import React from "react";
import { useVisionStore } from "../../lib/vision/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PatternConfig } from "../../lib/vision/types";

export function PatternConfigTool(): React.JSX.Element | null {
  const { segments, activeSegmentId, setPatternConfig } = useVisionStore();

  const activeSegment = segments.find((s) => s.visionSettings?.id === activeSegmentId);
  if (!activeSegment || !activeSegment.visionSettings) return null;

  const patternConfig = activeSegment.visionSettings.roi?.patternConfig || {
    enabled: false,
    edgeStrength: 50,
    polarity: "ANY",
    inverseLogic: false,
  };

  const segmentId = activeSegment.visionSettings.id;

  const handleEnabledChange = (checked: boolean) => {
    setPatternConfig(segmentId, { enabled: checked });
  };

  const handleEdgeStrengthChange = (value: number[]) => {
    setPatternConfig(segmentId, { edgeStrength: value[0] });
  };

  const handlePolarityChange = (value: PatternConfig["polarity"]) => {
    setPatternConfig(segmentId, { polarity: value });
  };

  const handleInverseLogicChange = (checked: boolean) => {
    setPatternConfig(segmentId, { inverseLogic: checked });
  };

  return (
    <Card className="shadow-md border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight">
            Generic Pattern Config
          </CardTitle>
          <CardDescription>Basic pattern and edge detection configuration.</CardDescription>
        </div>
        <Switch checked={patternConfig.enabled} onCheckedChange={handleEnabledChange} />
      </CardHeader>

      {patternConfig.enabled && (
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Edge Strength Threshold ({patternConfig.edgeStrength})</Label>
              </div>
              <Slider
                value={[patternConfig.edgeStrength]}
                min={1}
                max={255}
                step={1}
                onValueChange={handleEdgeStrengthChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Edge Polarity</Label>
              <Select value={patternConfig.polarity} onValueChange={handlePolarityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select polarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Any (Light/Dark transitions)</SelectItem>
                  <SelectItem value="DARK_TO_LIGHT">Dark to Light only</SelectItem>
                  <SelectItem value="LIGHT_TO_DARK">Light to Dark only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Label htmlFor="switch-inverse-logic" className="text-sm font-medium cursor-pointer">
                Inverse Logic (Fail if pattern found)
              </Label>
              <Switch
                id="switch-inverse-logic"
                checked={patternConfig.inverseLogic}
                onCheckedChange={handleInverseLogicChange}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

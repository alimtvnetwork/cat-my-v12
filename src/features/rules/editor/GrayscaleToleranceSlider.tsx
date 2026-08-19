import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export interface GrayscaleToleranceSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function GrayscaleToleranceSlider({
  value,
  onChange,
  disabled,
}: GrayscaleToleranceSliderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Grayscale Tolerance
        </Label>
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      <Slider
        min={0}
        max={255}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";

export interface BlackWhiteToggleProps {
  value: "black" | "white";
  onChange: (value: "black" | "white") => void;
  disabled?: boolean;
}

export function BlackWhiteToggle({ value, onChange, disabled }: BlackWhiteToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Search Target
      </Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v === "black" || v === "white") onChange(v);
        }}
        disabled={disabled}
        className="w-full gap-1"
      >
        <ToggleGroupItem value="black" className="h-10 flex-1 px-3 py-2 text-sm font-medium">
          Black
        </ToggleGroupItem>
        <ToggleGroupItem value="white" className="h-10 flex-1 px-3 py-2 text-sm font-medium">
          White
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

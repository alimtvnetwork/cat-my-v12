import React from "react";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface ColorPalettePanelProps {
  colors: string[]; // Hex codes or rgb
  onSelectColor: (color: string) => void;
  onRemoveColor: (color: string) => void;
  selectedColor?: string;
}

export function ColorPalettePanel({
  colors,
  onSelectColor,
  onRemoveColor,
  selectedColor,
}: ColorPalettePanelProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="text-[13px] tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
        Target Colors
      </div>
      {colors.length === 0 ? (
        <div className="text-[13px] tabular-nums text-neutral-500">
          No colors selected. Use the picker to add colors.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <div
              key={color}
              className={cn(
                "group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border",
                selectedColor === color
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              )}
              style={{ backgroundColor: color }}
              onClick={() => onSelectColor(color)}
            >
              <button
                className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 group-hover:flex"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveColor(color);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

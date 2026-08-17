import React from "react";
import { MousePointer, Square, Search, Shapes } from "lucide-react";
import { DrawingToolType } from "@/lib/vision/DrawingToolType";
import { useVisionStore } from "@/lib/vision/store";

interface ToolItem {
  tool: DrawingToolType;
  Icon: React.ElementType;
  label: string;
  shortcut: string;
}

const TOOLS: ToolItem[] = [
  {
    tool: DrawingToolType.None,
    Icon: MousePointer,
    label: "Select (no drawing)",
    shortcut: "V",
  },
  {
    tool: DrawingToolType.Roi,
    Icon: Square,
    label: "Draw Region of Interest",
    shortcut: "R",
  },
  {
    tool: DrawingToolType.PatternEdge,
    Icon: Search,
    label: "Pattern Edge detection tool",
    shortcut: "P",
  },
  {
    tool: DrawingToolType.ShapeTrack,
    Icon: Shapes,
    label: "Shape Track contour tool",
    shortcut: "S",
  },
];

interface ToolButtonProps {
  tool: DrawingToolType;
  Icon: React.ElementType;
  label: string;
  shortcut: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ tool, Icon, label, shortcut, isActive, onClick }: ToolButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      aria-label={`${label} [${shortcut}]`}
      title={`${label} [${shortcut}]`}
      onClick={onClick}
      className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-accent
        ${isActive
          ? "bg-ca-accent text-white"
          : "text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-text"
        }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/**
 * VisionDrawingToolbar — canvas tool selector with ARIA labels.
 * Task 260-261: focus rings, ARIA labels, 40px hit targets.
 */
export function VisionDrawingToolbar(): React.JSX.Element {
  const { drawingTool, setDrawingTool } = useVisionStore();

  return (
    <div
      role="toolbar"
      aria-label="Canvas drawing tools"
      className="flex flex-col gap-1 p-1"
    >
      {TOOLS.map(({ tool, Icon, label, shortcut }) => (
        <ToolButton
          key={tool}
          tool={tool}
          Icon={Icon}
          label={label}
          shortcut={shortcut}
          isActive={drawingTool === tool}
          onClick={() => setDrawingTool(tool)}
        />
      ))}
    </div>
  );
}

import React from "react";
import {
  Square,
  Sparkles,
  Shapes,
  Sun,
  AlertOctagon,
  CircleDot,
  MoveHorizontal,
  Compass,
  Activity,
  Maximize2,
  AlignJustify,
  Split,
  SlidersHorizontal,
  QrCode,
  FileText,
  Layers,
  Image,
  Camera,
  SunMedium,
  Code,
  Workflow,
  Wand2,
  Binary,
  Film,
} from "lucide-react";

export interface ToolIconProps {
  name: string;
  className?: string;
}

export function ToolIcon({ name, className = "w-6 h-6" }: ToolIconProps): React.JSX.Element {
  switch (name) {
    case "Square":
      return <Square className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Shapes":
      return <Shapes className={className} />;
    case "Sun":
      return <Sun className={className} />;
    case "AlertOctagon":
      return <AlertOctagon className={className} />;
    case "CircleDot":
      return <CircleDot className={className} />;
    case "MoveHorizontal":
      return <MoveHorizontal className={className} />;
    case "Compass":
      return <Compass className={className} />;
    case "Activity":
      return <Activity className={className} />;
    case "Maximize2":
      return <Maximize2 className={className} />;
    case "AlignJustify":
      return <AlignJustify className={className} />;
    case "Split":
      return <Split className={className} />;
    case "SlidersHorizontal":
      return <SlidersHorizontal className={className} />;
    case "QrCode":
      return <QrCode className={className} />;
    case "FileText":
      return <FileText className={className} />;
    case "Layers":
      return <Layers className={className} />;
    case "Image":
      return <Image className={className} />;
    case "Camera":
      return <Camera className={className} />;
    case "SunMedium":
      return <SunMedium className={className} />;
    case "Code":
      return <Code className={className} />;
    case "Workflow":
      return <Workflow className={className} />;
    case "Wand2":
      return <Wand2 className={className} />;
    case "Binary":
      return <Binary className={className} />;
    case "Film":
      return <Film className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVisionStore } from "@/lib/vision/store";
import { ImageSourceModeType } from "@/types/vision/ImageSourceModeType";
import { ImageIcon, VideoIcon, Columns } from "lucide-react";

export function ImageSourceToggle() {
  const mode = useVisionStore((s) => s.imageSourceMode);
  const setMode = useVisionStore((s) => s.setImageSourceMode);

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(val) => {
        if (val) setMode(val as ImageSourceModeType);
      }}
      className="bg-ca-panel border-ca-border w-fit rounded-md border"
    >
      <ToggleGroupItem
        value={ImageSourceModeType.STATIC}
        aria-label="Static Image Mode"
        className="h-10 w-10 px-0 rounded-none first:rounded-l-md"
      >
        <ImageIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value={ImageSourceModeType.SPLIT}
        aria-label="Split View Mode"
        className="h-10 w-10 px-0 rounded-none"
      >
        <Columns className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value={ImageSourceModeType.LIVE}
        aria-label="Live Camera Mode"
        className="h-10 w-10 px-0 rounded-none last:rounded-r-md"
      >
        <VideoIcon className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

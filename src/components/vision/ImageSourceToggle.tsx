import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVisionStore } from "@/lib/vision/store";
import { ImageSourceModeType } from "@/types/vision/ImageSourceModeType";
import { ImageIcon, VideoIcon } from "lucide-react";

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
      className="bg-ca-panel border-ca-border h-10 w-fit rounded-md border p-1"
    >
      <ToggleGroupItem
        value={ImageSourceModeType.STATIC}
        aria-label="Static Image Mode"
        className="h-8 w-10 px-0"
      >
        <ImageIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value={ImageSourceModeType.LIVE}
        aria-label="Live Camera Mode"
        className="h-8 w-10 px-0"
      >
        <VideoIcon className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

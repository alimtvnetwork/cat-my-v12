import type { PointerEvent } from "react";
import { canvasPointFromEvent, hitRegionHandle, regionForDrag } from "./pattern-geometry";
import type { RegionDrag, SearchRegion, WhiteBoxMarkingInput } from "./types";

export interface CanvasPointerDragParams {
  source: WhiteBoxMarkingInput | null;
  searchRegion: SearchRegion | null;
  dragState: RegionDrag | null;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
}

export function useCanvasPointerDrag(params: CanvasPointerDragParams) {
  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>): void {
    const point = canvasPointFromEvent(e);
    const handle = params.searchRegion === null ? "new" : hitRegionHandle(params.searchRegion, point);
    params.onDragStateChange({ handle, start: point, region: params.searchRegion });

    if (handle === "new") {
      params.onSearchRegionChange({ x: point.x, y: point.y, width: 1, height: 1 });
    }

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>): void {
    if (params.dragState === null) {
      return;
    }

    const width = params.source?.width ?? 960;
    const height = params.source?.height ?? 540;

    params.onSearchRegionChange(
      regionForDrag(width, height, params.dragState, canvasPointFromEvent(e)),
    );
  }

  function handlePointerUp(e: PointerEvent<HTMLCanvasElement>): void {
    if (params.dragState === null) {
      return;
    }

    const width = params.source?.width ?? 960;
    const height = params.source?.height ?? 540;

    const region = regionForDrag(width, height, params.dragState, canvasPointFromEvent(e));
    params.onDragStateChange(null);
    params.onSearchRegionChange(region.width > 1 && region.height > 1 ? region : null);
  }

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}

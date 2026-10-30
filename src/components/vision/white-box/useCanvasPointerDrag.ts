import type { PointerEvent } from "react";
import {
  canvasPointFromEvent,
  hitRegionHandle,
  regionForDrag,
  rotationAngleDeg,
} from "./pattern-geometry";
import type { RegionDrag, SearchRegion, WhiteBoxMarkingInput } from "./types";

export interface CanvasPointerDragParams {
  source: WhiteBoxMarkingInput | null;
  searchRegion: SearchRegion | null;
  dragState: RegionDrag | null;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
  isLocked?: boolean;
  isRotationEnabled?: boolean;
  onRegionRotationChange?: (degrees: number) => void;
}

export function useCanvasPointerDrag(params: CanvasPointerDragParams) {
  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>): void {
    // A locked region is selection-only: no move, no resize, no rotate,
    // and clicking outside it must NOT silently replace it.
    if (params.searchRegion !== null && params.isLocked === true) {
      params.onDragStateChange(null);

      return;
    }

    const point = canvasPointFromEvent(e);
    const handle =
      params.searchRegion === null
        ? "new"
        : hitRegionHandle(params.searchRegion, point, params.isRotationEnabled ?? false);
    params.onDragStateChange({ handle, start: point, region: params.searchRegion });

    // Do not pre-allocate 1x1 region on pointer down to prevent accidental destruction

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>): void {
    if (params.dragState === null) {
      return;
    }

    if (params.dragState.handle === "rotate") {
      if (params.dragState.region !== null && params.onRegionRotationChange) {
        params.onRegionRotationChange(
          rotationAngleDeg(params.dragState.region, canvasPointFromEvent(e)),
        );
      }

      return;
    }

    const currentPoint = canvasPointFromEvent(e);
    const dragDistance = Math.hypot(
      currentPoint.x - params.dragState.start.x,
      currentPoint.y - params.dragState.start.y,
    );

    if (params.dragState.handle === "new" && dragDistance < 4) {
      return;
    }

    const width = params.source?.width ?? 960;
    const height = params.source?.height ?? 540;

    params.onSearchRegionChange(
      regionForDrag(width, height, params.dragState, currentPoint),
    );
  }

  function handlePointerUp(e: PointerEvent<HTMLCanvasElement>): void {
    if (params.dragState === null) {
      return;
    }

    if (params.dragState.handle === "rotate") {
      if (params.dragState.region !== null && params.onRegionRotationChange) {
        params.onRegionRotationChange(
          rotationAngleDeg(params.dragState.region, canvasPointFromEvent(e)),
        );
      }

      params.onDragStateChange(null);

      return;
    }

    const currentPoint = canvasPointFromEvent(e);
    const dragDistance = Math.hypot(
      currentPoint.x - params.dragState.start.x,
      currentPoint.y - params.dragState.start.y,
    );
    const previousRegion = params.dragState.region;

    params.onDragStateChange(null);

    if (dragDistance < 4) {
      if (previousRegion !== null) {
        params.onSearchRegionChange(previousRegion);
      }
      return;
    }

    const width = params.source?.width ?? 960;
    const height = params.source?.height ?? 540;

    const region = regionForDrag(width, height, params.dragState, currentPoint);
    params.onSearchRegionChange(region.width > 4 && region.height > 4 ? region : previousRegion);
  }

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}

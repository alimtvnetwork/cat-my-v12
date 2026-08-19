import type { CanvasSize } from "@/lib/editor/types";

export enum CanvasViewportPresetType {
  Subtle = "subtle",
  Standard = "standard",
  Strong = "strong",
}

export const fallbackSize: CanvasSize = { width: 1280, height: 720 };

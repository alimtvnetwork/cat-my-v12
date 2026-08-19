import type { EditorPoint, Viewport } from "@/lib/editor/types";

export interface PanGesture {
  screen: EditorPoint;
  viewport: Viewport;
}

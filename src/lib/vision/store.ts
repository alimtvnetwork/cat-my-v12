import { create } from 'zustand';
import type { VisionSettings, TriggerMode, RoiSettings, CameraSettings, RecipeSegment } from './types';

interface VisionState {
  activeSegmentId: string | null;
  setActiveSegmentId: (id: string | null) => void;
  setActiveSegment: (id: string) => void;
}

export const useVisionStore = create<VisionState>((set) => ({
  activeSegmentId: null,
  setActiveSegmentId: (id) => set({ activeSegmentId: id }),
  setActiveSegment: (id) => set({ activeSegmentId: id }),
}));

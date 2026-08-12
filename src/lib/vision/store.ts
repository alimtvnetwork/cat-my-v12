import { create } from 'zustand';
import type { VisionSettings, TriggerMode, RoiSettings, CameraSettings, RecipeSegment } from './types';

interface VisionState {
  segments: RecipeSegment[];
  activeSegmentId: string | null;
  setActiveSegmentId: (id: string | null) => void;
  setActiveSegment: (id: string) => void;
}

const mockSegments: RecipeSegment[] = [
  {
    visionSettings: {
      id: 'mock-1',
      name: 'Initial Settings',
    },
  },
];

export const useVisionStore = create<VisionState>((set) => ({
  segments: mockSegments,
  activeSegmentId: null,
  setActiveSegmentId: (id) => set({ activeSegmentId: id }),
  setActiveSegment: (id) => set({ activeSegmentId: id }),
}));

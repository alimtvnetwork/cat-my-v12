import { create } from 'zustand';
import type { VisionSettings, TriggerMode, RoiSettings, CameraSettings, RecipeSegment } from './types';

interface VisionState {
  segments: RecipeSegment[];
  activeSegmentId: string | null;
  setActiveSegmentId: (id: string | null) => void;
  setActiveSegment: (id: string) => void;
  deleteSegment: (id: string) => void;
  renameSegment: (id: string, name: string) => void;
  addSegment: () => void;
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
  deleteSegment: (id) => set((state) => ({
    segments: state.segments.filter((s) => s.visionSettings.id !== id),
    activeSegmentId: state.activeSegmentId === id ? null : state.activeSegmentId,
  })),
  renameSegment: (id, name) => set((state) => ({
    segments: state.segments.map((s) =>
      s.visionSettings.id === id
        ? { ...s, visionSettings: { ...s.visionSettings, name } }
        : s
    ),
  })),
  addSegment: () => set((state) => {
    const newId = crypto.randomUUID();
    const newSegment: RecipeSegment = {
      visionSettings: {
        id: newId,
        name: 'New Segment',
      },
    };
    return {
      segments: [...state.segments, newSegment],
      activeSegmentId: newId,
    };
  }),
}));

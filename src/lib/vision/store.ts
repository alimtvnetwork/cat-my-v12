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
  setCameraSettings: (segmentId: string, settings: Partial<CameraSettings>) => void;
  duplicateSegment: (id: string) => void;
  reorderSegments: (ids: string[]) => void;
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
  setCameraSettings: (segmentId, settings) => set((state) => ({
    segments: state.segments.map((s) =>
      s.visionSettings && s.visionSettings.id === segmentId
        ? {
            ...s,
            visionSettings: {
              ...s.visionSettings,
              camera: { ...s.visionSettings.camera, ...settings } as CameraSettings,
              cameraSettings: { ...s.visionSettings.cameraSettings, ...settings } as CameraSettings,
            },
          }
        : s
    ),
  })),
  duplicateSegment: (id) => set((state) => {
    const segmentToDuplicate = state.segments.find((s) => s.visionSettings.id === id);
    if (!segmentToDuplicate) return state;

    const newId = crypto.randomUUID();
    const newSegment: RecipeSegment = {
      ...segmentToDuplicate,
      visionSettings: {
        ...segmentToDuplicate.visionSettings,
        id: newId,
        name: `${segmentToDuplicate.visionSettings.name} (Copy)`,
      },
    };

    const index = state.segments.findIndex((s) => s.visionSettings.id === id);
    const newSegments = [...state.segments];
    newSegments.splice(index + 1, 0, newSegment);

    return {
      segments: newSegments,
      activeSegmentId: newId,
    };
  }),
  reorderSegments: (ids) => set((state) => {
    const idToSegment = new Map(state.segments.map(s => [s.visionSettings.id, s]));
    const newSegments = ids
      .map(id => idToSegment.get(id))
      .filter((s): s is RecipeSegment => s !== undefined);
    
    const remainingSegments = state.segments.filter(s => !ids.includes(s.visionSettings.id));
    
    return { segments: [...newSegments, ...remainingSegments] };
  }),
}));

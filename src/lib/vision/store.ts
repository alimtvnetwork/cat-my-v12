import { create } from "zustand";
import type {
  VisionSettings,
  TriggerMode,
  RoiSettings,
  CameraSettings,
  RecipeSegment,
  HandlerSettings,
  Mask,
  ColorSettings,
  ShapeTrax3Settings,
  PatternConfig,
  PinConsistencySettings,
} from "./types";

interface VisionState {
  segments: RecipeSegment[];
  activeSegmentId: string | null;
  setActiveSegmentId: (id: string | null) => void;
  setActiveSegment: (id: string) => void;
  deleteSegment: (id: string) => void;
  renameSegment: (id: string, name: string) => void;
  addSegment: () => void;
  setCameraSettings: (segmentId: string, settings: Partial<CameraSettings>) => void;
  setHandlerInputs: (segmentId: string, inputs: Partial<HandlerSettings["inputs"]>) => void;
  setHandlerOutputs: (segmentId: string, outputs: Partial<HandlerSettings["outputs"]>) => void;
  setRoi: (segmentId: string, roi: Partial<RoiSettings>) => void;
  addMask: (segmentId: string, mask: Mask) => void;
  removeMask: (segmentId: string, maskId: string) => void;
  updateMask: (segmentId: string, maskId: string, updates: Partial<Mask>) => void;
  setColorSettings: (segmentId: string, colorSettings: Partial<ColorSettings>) => void;
  setShapeTrax3Settings: (
    segmentId: string,
    shapeTrax3Settings: Partial<ShapeTrax3Settings>,
  ) => void;
  setPatternConfig: (segmentId: string, patternConfig: Partial<PatternConfig>) => void;
  setPinConsistencySettings: (
    segmentId: string,
    pinConsistencySettings: Partial<PinConsistencySettings>,
  ) => void;
  duplicateSegment: (id: string) => void;
  reorderSegments: (ids: string[]) => void;
}

const mockSegments: RecipeSegment[] = [
  {
    visionSettings: {
      id: "mock-1",
      name: "Initial Settings",
      handlerSettings: {
        inputs: {
          triggerIn: false,
          partPresent: true,
        },
        outputs: {
          ready: true,
          busy: false,
          pass: false,
          fail: false,
        },
      },
      roi: {
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        shiftTolerance: 5,
        masks: [],
        colorSettings: {
          threshold: 128,
          invert: false,
          colorMap: "grayscale",
          keyColor: "#ffffff",
        },
        shapeTrax3: {
          enabled: false,
          matchScore: 80,
          rotationTolerance: 5,
          scaleTolerance: 5,
        },
        patternConfig: {
          enabled: false,
          edgeStrength: 50,
          polarity: "ANY",
          inverseLogic: false,
        },
        pinConsistency: {
          enabled: false,
          expectedPinCount: 4,
          pitchTolerance: 0.1,
          lengthTolerance: 0.2,
        },
      },
    },
  },
];

export const useVisionStore = create<VisionState>((set) => ({
  segments: mockSegments,
  activeSegmentId: null,
  setActiveSegmentId: (id) => set({ activeSegmentId: id }),
  setActiveSegment: (id) => set({ activeSegmentId: id }),
  deleteSegment: (id) =>
    set((state) => ({
      segments: state.segments.filter((s) => s.visionSettings?.id !== id),
      activeSegmentId: state.activeSegmentId === id ? null : state.activeSegmentId,
    })),
  renameSegment: (id, name) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.visionSettings?.id === id ? { ...s, visionSettings: { ...s.visionSettings, name } } : s,
      ),
    })),
  addSegment: () =>
    set((state) => {
      const newId = crypto.randomUUID();
      const newSegment: RecipeSegment = {
        visionSettings: {
          id: newId,
          name: "New Segment",
        },
      };
      return {
        segments: [...state.segments, newSegment],
        activeSegmentId: newId,
      };
    }),
  setCameraSettings: (segmentId, settings) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.visionSettings && s.visionSettings.id === segmentId
          ? {
              ...s,
              visionSettings: {
                ...s.visionSettings,
                camera: { ...s.visionSettings.camera, ...settings } as CameraSettings,
                cameraSettings: {
                  ...s.visionSettings.cameraSettings,
                  ...settings,
                } as CameraSettings,
              },
            }
          : s,
      ),
    })),
  setHandlerInputs: (segmentId, inputs) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.visionSettings && s.visionSettings.id === segmentId
          ? {
              ...s,
              visionSettings: {
                ...s.visionSettings,
                handlerSettings: {
                  ...s.visionSettings.handlerSettings,
                  inputs: {
                    triggerIn: false,
                    partPresent: false,
                    ...s.visionSettings.handlerSettings?.inputs,
                    ...inputs,
                  },
                  outputs: {
                    ready: false,
                    busy: false,
                    pass: false,
                    fail: false,
                    ...s.visionSettings.handlerSettings?.outputs,
                  },
                },
              },
            }
          : s,
      ),
    })),
  setHandlerOutputs: (segmentId, outputs) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.visionSettings && s.visionSettings.id === segmentId
          ? {
              ...s,
              visionSettings: {
                ...s.visionSettings,
                handlerSettings: {
                  ...s.visionSettings.handlerSettings,
                  inputs: {
                    triggerIn: false,
                    partPresent: false,
                    ...s.visionSettings.handlerSettings?.inputs,
                  },
                  outputs: {
                    ready: false,
                    busy: false,
                    pass: false,
                    fail: false,
                    ...s.visionSettings.handlerSettings?.outputs,
                    ...outputs,
                  },
                },
              },
            }
          : s,
      ),
    })),
  setRoi: (segmentId, roi) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.visionSettings && s.visionSettings.id === segmentId
          ? {
              ...s,
              visionSettings: {
                ...s.visionSettings,
                roi: {
                  x: 0,
                  y: 0,
                  width: 0,
                  height: 0,
                  shiftTolerance: 0,
                  masks: [],
                  ...s.visionSettings.roi,
                  ...roi,
                },
              },
            }
          : s,
      ),
    })),
  addMask: (segmentId, mask) =>
    set((state) => ({
      segments: state.segments.map((s) => {
        if (s.visionSettings && s.visionSettings.id === segmentId) {
          const roi = s.visionSettings.roi || {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            shiftTolerance: 10,
            masks: [],
          };
          return {
            ...s,
            visionSettings: {
              ...s.visionSettings,
              roi: {
                ...roi,
                masks: [...(roi.masks || []), mask],
              },
            },
          };
        }
        return s;
      }),
    })),
  removeMask: (segmentId, maskId) =>
    set((state) => ({
      segments: state.segments.map((s) => {
        if (s.visionSettings && s.visionSettings.id === segmentId && s.visionSettings.roi) {
          return {
            ...s,
            visionSettings: {
              ...s.visionSettings,
              roi: {
                ...s.visionSettings.roi,
                masks: s.visionSettings.roi.masks?.filter((m) => m.id !== maskId) || [],
              },
            },
          };
        }
        return s;
      }),
    })),
  updateMask: (segmentId, maskId, updates) =>
    set((state) => ({
      segments: state.segments.map((s) => {
        if (s.visionSettings && s.visionSettings.id === segmentId && s.visionSettings.roi) {
          return {
            ...s,
            visionSettings: {
              ...s.visionSettings,
              roi: {
                ...s.visionSettings.roi,
                masks:
                  s.visionSettings.roi.masks?.map((m) =>
                    m.id === maskId ? { ...m, ...updates } : m,
                  ) || [],
              },
            },
          };
        }
        return s;
      }),
    })),
  setColorSettings: (segmentId, colorSettings) =>
    set((state) => ({
      segments: state.segments.map((s) => {
        if (s.visionSettings && s.visionSettings.id === segmentId) {
          const roi = s.visionSettings.roi || {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            shiftTolerance: 10,
            masks: [],
          };
          return {
            ...s,
            visionSettings: {
              ...s.visionSettings,
              roi: {
                ...roi,
                colorSettings: {
                  threshold: 128,
                  invert: false,
                  colorMap: "grayscale",
                  ...roi.colorSettings,
                  ...colorSettings,
                },
              },
            },
          };
        }
        return s;
      }),
    })),
  setShapeTrax3Settings: (segmentId, shapeTrax3Settings) =>
    set((state) => ({
      segments: state.segments.map((s) => {
        if (s.visionSettings && s.visionSettings.id === segmentId) {
          const roi = s.visionSettings.roi || {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            shiftTolerance: 10,
            masks: [],
          };
          return {
            ...s,
            visionSettings: {
              ...s.visionSettings,
              roi: {
                ...roi,
                shapeTrax3: {
                  enabled: false,
                  matchScore: 80,
                  rotationTolerance: 5,
                  scaleTolerance: 5,
                  ...roi.shapeTrax3,
                  ...shapeTrax3Settings,
                },
              },
            },
          };
        }
        return s;
      }),
    })),
  setPatternConfig: (segmentId, patternConfig) =>
    set((state) => ({
      segments: state.segments.map((s) => {
        if (s.visionSettings && s.visionSettings.id === segmentId) {
          const roi = s.visionSettings.roi || {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            shiftTolerance: 10,
            masks: [],
          };
          return {
            ...s,
            visionSettings: {
              ...s.visionSettings,
              roi: {
                ...roi,
                patternConfig: {
                  enabled: false,
                  edgeStrength: 50,
                  polarity: "ANY",
                  inverseLogic: false,
                  ...roi.patternConfig,
                  ...patternConfig,
                },
              },
            },
          };
        }
        return s;
      }),
    })),
  setPinConsistencySettings: (segmentId, pinConsistencySettings) =>
    set((state) => ({
      segments: state.segments.map((s) => {
        if (s.visionSettings && s.visionSettings.id === segmentId) {
          const roi = s.visionSettings.roi || {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            shiftTolerance: 10,
            masks: [],
          };
          return {
            ...s,
            visionSettings: {
              ...s.visionSettings,
              roi: {
                ...roi,
                pinConsistency: {
                  enabled: false,
                  expectedPinCount: 4,
                  pitchTolerance: 0.1,
                  lengthTolerance: 0.2,
                  ...roi.pinConsistency,
                  ...pinConsistencySettings,
                },
              },
            },
          };
        }
        return s;
      }),
    })),
  duplicateSegment: (id) =>
    set((state) => {
      const segmentToDuplicate = state.segments.find((s) => s.visionSettings?.id === id);
      if (!segmentToDuplicate || !segmentToDuplicate.visionSettings) return state;

      const newId = crypto.randomUUID();
      const newSegment: RecipeSegment = {
        ...segmentToDuplicate,
        visionSettings: {
          ...segmentToDuplicate.visionSettings,
          id: newId,
          name: `${segmentToDuplicate.visionSettings.name} (Copy)`,
        },
      };

      const index = state.segments.findIndex((s) => s.visionSettings?.id === id);
      const newSegments = [...state.segments];
      newSegments.splice(index + 1, 0, newSegment);

      return {
        segments: newSegments,
        activeSegmentId: newId,
      };
    }),
  reorderSegments: (ids) =>
    set((state) => {
      const idToSegment = new Map(state.segments.map((s) => [s.visionSettings?.id, s]));
      const newSegments = ids
        .map((id) => idToSegment.get(id))
        .filter((s): s is RecipeSegment => s !== undefined);

      const remainingSegments = state.segments.filter((s) => !s.visionSettings?.id || !ids.includes(s.visionSettings.id));

      return { segments: [...newSegments, ...remainingSegments] };
    }),
}));

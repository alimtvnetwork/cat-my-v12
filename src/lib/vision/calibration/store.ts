import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NewVisionCalibration, VisionCalibration } from "./types";

export interface VisionCalibrationState {
  calibrations: VisionCalibration[];
  /** Camera id the calibration panel is currently scoped to. */
  selectedCameraId: string;
  setSelectedCameraId: (cameraId: string) => void;
  addCalibration: (input: NewVisionCalibration) => VisionCalibration;
  setActiveCalibration: (id: string) => void;
  removeCalibration: (id: string) => void;
}

export const DEFAULT_CALIBRATION_CAMERA_ID = "default-camera";

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cal-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export const useVisionCalibrationStore = create<VisionCalibrationState>()(
  persist(
    (set) => ({
      calibrations: [],
      selectedCameraId: DEFAULT_CALIBRATION_CAMERA_ID,

      setSelectedCameraId: (cameraId) => {
        set({ selectedCameraId: cameraId.trim() || DEFAULT_CALIBRATION_CAMERA_ID });
      },

      addCalibration: (input) => {
        const record: VisionCalibration = {
          ...input,
          id: randomId(),
          createdAt: new Date().toISOString(),
          isActive: true,
        };

        set((state) => ({
          calibrations: [
            ...state.calibrations.map((c) =>
              c.cameraId === input.cameraId && c.recipeId === input.recipeId
                ? { ...c, isActive: false }
                : c,
            ),
            record,
          ],
        }));

        return record;
      },

      setActiveCalibration: (id) => {
        set((state) => {
          const target = state.calibrations.find((c) => c.id === id);

          if (!target) {
            return state;
          }

          return {
            calibrations: state.calibrations.map((c) => ({
              ...c,
              isActive:
                c.id === id ||
                (c.id !== id &&
                  c.isActive &&
                  (c.cameraId !== target.cameraId || c.recipeId !== target.recipeId)),
            })),
          };
        });
      },

      removeCalibration: (id) => {
        set((state) => ({
          calibrations: state.calibrations.filter((c) => c.id !== id),
        }));
      },
    }),
    {
      name: "ca:vision-calibration:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        calibrations: state.calibrations,
        selectedCameraId: state.selectedCameraId,
      }),
    },
  ),
);

/** Active calibration for a camera + recipe, if one was stored. */
export function findActiveCalibration(
  calibrations: VisionCalibration[],
  cameraId: string,
  recipeId: string,
): VisionCalibration | undefined {
  return calibrations.find((c) => c.isActive && c.cameraId === cameraId && c.recipeId === recipeId);
}

/** Full history (newest first) for a camera + recipe. */
export function findCalibrationHistory(
  calibrations: VisionCalibration[],
  cameraId: string,
  recipeId: string,
): VisionCalibration[] {
  return calibrations
    .filter((c) => c.cameraId === cameraId && c.recipeId === recipeId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

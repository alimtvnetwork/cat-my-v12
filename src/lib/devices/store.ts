import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import { InspectedDevice, SEEDED_INSPECTED_DEVICES } from "./model";

export interface DeviceStoreState {
  devices: Record<string, InspectedDevice>;
  addDevice: (device: InspectedDevice) => void;
  updateDevice: (id: string, partial: Partial<InspectedDevice>) => void;
  removeDevice: (id: string) => void;
  getDeviceList: () => InspectedDevice[];
}

function buildInitialDeviceMap(): Record<string, InspectedDevice> {
  const map: Record<string, InspectedDevice> = {};

  for (const d of SEEDED_INSPECTED_DEVICES) {
    map[d.id] = d;
  }

  return map;
}

export const useDeviceStore = create<DeviceStoreState>()(
  persist(
    (set, get) => ({
      devices: buildInitialDeviceMap(),

      addDevice: (device: InspectedDevice) => {
        const trimmedId = device.id.trim();

        if (!trimmedId) {
          return;
        }

        set((state) => ({
          devices: {
            ...state.devices,
            [trimmedId]: {
              ...device,
              id: trimmedId,
            },
          },
        }));
      },

      updateDevice: (id: string, partial: Partial<InspectedDevice>) => {
        const existing = get().devices[id];

        if (!existing) {
          return;
        }

        set((state) => ({
          devices: {
            ...state.devices,
            [id]: {
              ...existing,
              ...partial,
              id,
            },
          },
        }));
      },

      removeDevice: (id: string) => {
        set((state) => {
          const next = { ...state.devices };
          delete next[id];

          return { devices: next };
        });
      },

      getDeviceList: () => {
        return Object.values(get().devices);
      },
    }),
    {
      name: "cat_inspected_devices_catalog_v1",
      storage: createJSONStorage(() => createFacadeStateStorage()),
    },
  ),
);

import { describe, it, expect, beforeEach } from "vitest";
import { useDeviceStore } from "../store";
import { SEEDED_INSPECTED_DEVICES } from "../model";

describe("useDeviceStore", () => {
  beforeEach(() => {
    useDeviceStore.setState({
      devices: Object.fromEntries(SEEDED_INSPECTED_DEVICES.map((d) => [d.id, d])),
    });
  });

  it("initializes with default seeded inspected devices", () => {
    const list = useDeviceStore.getState().getDeviceList();
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.some((d) => d.id === "STM32F4-MCU-BOARD")).toBe(true);
  });

  it("adds a new inspected device with target features", () => {
    useDeviceStore.getState().addDevice({
      id: "CUSTOM-CHIP-99",
      name: "Custom Sensor SoC",
      packageType: "BGA-144",
      targetFeatures: ["Lead coplanarity", "Silkscreen mark"],
      createdAt: Date.now(),
    });

    const dev = useDeviceStore.getState().devices["CUSTOM-CHIP-99"];
    expect(dev).toBeDefined();
    expect(dev?.name).toBe("Custom Sensor SoC");
    expect(dev?.targetFeatures).toHaveLength(2);
  });

  it("removes an inspected device by id", () => {
    useDeviceStore.getState().removeDevice("STM32F4-MCU-BOARD");
    expect(useDeviceStore.getState().devices["STM32F4-MCU-BOARD"]).toBeUndefined();
  });
});

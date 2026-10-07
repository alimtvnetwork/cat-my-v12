/**
 * Inspected Device (Target Chip / Circuit Board / DUT) Model.
 * Represents the electronic component or circuit board undergoing AOI inspection.
 */

export interface InspectedDevice {
  id: string;
  name: string;
  packageType: string;
  targetFeatures: string[];
  description?: string;
  createdAt: number;
}

export const SEEDED_INSPECTED_DEVICES: readonly InspectedDevice[] = [
  {
    id: "STM32F4-MCU-BOARD",
    name: "STM32F4 Microcontroller Circuit Board",
    packageType: "QFP-64 SMT",
    targetFeatures: [
      "IC body orientation & laser marking (Pin 1 polarity)",
      "Solder bridges and lead spacing on QFP / SOP leads",
      "Presence/absence of surrounding SMD capacitors and resistors",
    ],
    description: "Main controller MCU board with high-density QFP leads and 0402 passives.",
    createdAt: 1700000000000,
  },
  {
    id: "PCB-ECU-MAIN-V2",
    name: "Automotive ECU Main Board",
    packageType: "Automotive High-Reliability PCB",
    targetFeatures: [
      "Power MOSFET solder fillet verification",
      "CAN transceiver alignment and polarity",
      "Through-hole connector pin insertion and wetting",
    ],
    description: "Automotive grade powertrain control module subject to Class 3 IPC-A-610 standards.",
    createdAt: 1700000001000,
  },
  {
    id: "BGA-256-POWER-IC",
    name: "BGA-256 Power Management IC Module",
    packageType: "BGA-256 (0.8mm pitch)",
    targetFeatures: [
      "Substrate corner alignment and orientation mark",
      "Underfill voiding and solder ball collapse height",
      "Bypass decoupling capacitor array presence",
    ],
    description: "High-density power management IC requiring multi-angle ring light illumination.",
    createdAt: 1700000002000,
  },
] as const;

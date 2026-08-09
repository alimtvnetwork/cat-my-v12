// Camera library sample seed.
//
// Populates the CameraFacade with two realistic entries when empty so every
// setup / project screen has a visible, facade-backed dataset without the
// user having to hand-craft configs. Idempotent: skips when the library is
// non-empty.

import { makeCameraFacade } from "./facade";
import { makeDefaultCameraSetting, type CameraSetting } from "./model";

const SEEDED_FLAG = "ca.camera.seed.v1";

function baslerCamera(now: number): CameraSetting {
  const base = makeDefaultCameraSetting(now);

  return {
    ...base,
    id: "cam-seed-basler-aca1920",
    name: "Basler acA1920",
    vendor: "Pylon",
    deviceSerial: "acA1920-40gm-0001",
    fovMmW: 60,
    fovMmH: 45,
    resolutionW: 1920,
    resolutionH: 1200,
    exposureUs: 3500,
    gainDb: 2,
    gamma: 1.0,
    whiteBalanceKelvin: 5600,
    focusMode: "Manual",
    focusValue: 42,
    triggerMode: "Hardware",
    frameRateHz: 40,
    pockets: 1,
    ColorModeType: "Mono8",
    notes: "Line-side PCB solder inspection. Telecentric lens, hardware-triggered.",
  };
}

function flirCamera(now: number): CameraSetting {
  const base = makeDefaultCameraSetting(now);

  return {
    ...base,
    id: "cam-seed-flir-blackfly-s",
    name: "FLIR Blackfly S",
    vendor: "Spinnaker",
    deviceSerial: "BFS-U3-16S2M-0007",
    fovMmW: 30,
    fovMmH: 22,
    resolutionW: 1440,
    resolutionH: 1080,
    exposureUs: 1800,
    gainDb: 4,
    gamma: 1.1,
    whiteBalanceKelvin: 5000,
    focusMode: "Auto",
    triggerMode: "Continuous",
    frameRateHz: 60,
    pockets: 8,
    ColorModeType: "Mono8",
    notes: "Carrier-tape reel feeder camera. 8 pockets per frame, USB3.",
  };
}

function usbReferenceCamera(now: number): CameraSetting {
  const base = makeDefaultCameraSetting(now);

  return {
    ...base,
    id: "cam-seed-usb-reference",
    name: "Reference USB Cam",
    vendor: "GenericV4L2",
    deviceSerial: "USB-REF-0001",
    fovMmW: 80,
    fovMmH: 60,
    resolutionW: 1280,
    resolutionH: 720,
    exposureUs: 8000,
    gainDb: 0,
    gamma: 1.0,
    whiteBalanceKelvin: 5000,
    focusMode: "Auto",
    triggerMode: "Continuous",
    frameRateHz: 30,
    pockets: 1,
    ColorModeType: "RGB8",
    notes: "Bench reference camera over browser MediaDevices. Use for demos and shape smoke tests.",
  };
}

export function autoSeedCamerasIfEmpty(): void {
  if (typeof window === "undefined") return;
  const facade = makeCameraFacade();
  const hasRows = facade.list().length > 0;
  let isHadFlag = false;
  try {
    isHadFlag = window.localStorage.getItem(SEEDED_FLAG) === "1";
  } catch {
    /* ignore */
  }
  // Repair stale flag: if the flag says "seeded" but the facade is empty
  // (user cleared the camera library, or a prior storage wipe reset it),
  // re-seed instead of skipping. Mirrors the rules-seed policy so
  // downstream `seed-bindings.resolve` never blows up on absent
  // `Reference USB Cam` / `Basler acA1920` rows the bundle points at.
  if (hasRows) {
    try {
      window.localStorage.setItem(SEEDED_FLAG, "1");
    } catch {
      /* ignore */
    }

    return;
  }

  if (isHadFlag) console.warn("[camera/seed] stale seed flag repaired empty library");
  const now = Date.now();
  const results = [
    facade.save(baslerCamera(now)),
    facade.save(flirCamera(now)),
    facade.save(usbReferenceCamera(now)),
  ];
  const failures = results.filter((r) => r.ok === false);

  if (failures.length > 0) {
    console.warn("[camera/seed] some seeds failed", failures);

    return;
  }

  try {
    window.localStorage.setItem(SEEDED_FLAG, "1");
  } catch {
    /* ignore */
  }

  console.info("[camera/seed] seeded %d camera setting(s)", results.length);
}

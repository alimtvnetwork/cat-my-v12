---
name: dri1000-machine-protocol
description: Specifications, schema envelopes, and hardware communication protocols for the DRI1000 Automated Optical Inspection (AOI) machine.
---

# DRI1000 Machine Control & Communication Protocol

## Overview
Defines the two-tier JSON instruction protocol and hardware execution contracts for the **DRI1000** Multi-Angle High-Speed Optical Inspection Workstation (operating at up to 450 mm/s and 40+ parts/second).

## 1. Two-Tier Envelope Standard
Every instruction, command, and feedback payload adheres strictly to the deterministic two-tier envelope:
```json
{
  "attributes": {
    "protocolVersion": "1.0.0",
    "payloadType": "command_dispatch",
    "payloadId": "CMD-20260921-DRI1000-00109",
    "correlationId": "Corr-20260921-DRI1000-0018501",
    "timestamp": "2026-09-21T08:14:02.100Z",
    "machineProfile": {
      "machineId": "DRI1000-Station01",
      "model": "DRI1000",
      "firmwareVersion": "v4.112.0-rc2"
    },
    "tracking": {
      "encoderTicks": 1845920,
      "conveyorSpeedMmPerSec": 450.0,
      "beltPositionMm": 12450.25,
      "nestId": "NEST-042"
    },
    "safetyInterlocks": {
      "isEStopHealthy": true,
      "isLightCurtainIntact": true,
      "isInterlockDoorClosed": true,
      "isPneumaticPressureNormal": true,
      "isTempWithinLimits": true
    }
  },
  "data": {
    "executionPolicy": { ... },
    "actions": [ ... ],
    "handshake": { ... }
  }
}
```

## 2. The 6 Modular Sequential Instructions (`docs/jsonInstructions/`)
1. **`01-camera-configuration.json`**:
   - Sensor ROI, pixel format (`Mono8`), line exposure time (\(\mu s\)), sensor gain (\(dB\)), and hardware line-in trigger source.
2. **`02-lighting-control.json`**:
   - Gardasoft CC320 4-channel strobe overdrive controller parameters (pulse duration \(\mu s\), overdrive current amps, trigger delay).
3. **`03-grayscale-thresholding.json`**:
   - 2-bit quantization look-up table (LUT) with levels `[0, 85, 170, 255]`, threshold `170`, and 31-box constellation template.
4. **`04-dri1000-machine-cycle.json`**:
   - End-to-end synchronized machine cycle combining gantry motion, optical strobe trigger, camera readout, and pneumatic reject solenoid actuation.
5. **`05-handler-action-dispatch.json`**:
   - Ordered action dispatch sequence routing discrete tasks to Beckhoff PLC, GigE camera, and pneumatic diverters.
6. **`06-cat-handler-communication.json`**:
   - Workstation-to-handler feedback envelope delivering defect classification, bounding coordinates, and sorting lane assignments.

## 3. Fault Recovery Codes (`E_*`)
- All failure conditions map to registered error codes:
  - `E_CAMERA_TIMEOUT`: Frame acquisition failed within deadline.
  - `E_STROBE_OVERTEMP`: Strobe controller reported thermal limit warning.
  - `E_ENCODER_SLIP`: Conveyor encoder drift exceeded tolerance threshold.
  - `E_PNEUMATIC_PRESSURE`: Solenoid pressure dropped below 0.5 MPa.

# Subtask 01: Author Exhaustive JSON Instructions Specification & Guide (readme.md)

**Status:** `[COMPLETED]`  
**Date:** 2026-09-22  

## Objective
Author the definitive, exhaustive specification and reference guide `docs/jsonInstructions/readme.md`. The document must clearly explain the JSON instruction envelope (`attributes` vs `data`), protocol semantics, DRI1000 machine architecture, camera controls, multi-channel lighting synchronization, 2-bit grayscale thresholding, hardware interlocks, pneumatic rejection, timing sequences, and error recovery policies (`E_*`).

## Files Involved
- `docs/jsonInstructions/readme.md`

## Key Sections Covered
1. **Introduction & Protocol Philosophy**: Two-tier envelope (`attributes` for environment/kinematics/state, `data` for discrete dispatch actions and results).
2. **Hardware Integration & Machine Profile**:
   - Machine Model: `DRI1000` (High-speed multi-part semiconductor/component vision inspection station).
   - Industrial Cameras: GigE global shutter cameras (`Cam01TopGige`), liquid lens focal adjustment, exposure, analog/digital gain, binning, DMA shared memory.
   - Multi-Channel Strobe Controllers: Gardasoft/CCS `LightCtrl01` with Overdrive strobe, PWM current control across 4 channels (Coaxial Top White, Ring Darkfield 45°, Backlight Diffuse, Zone Angle).
   - Motion & Kinematics: Multi-axis gantry (X/Y/Z/Theta), encoder-locked conveyor tracking, pneumatic reject nozzles.
3. **Core Vision Algorithms**:
   - 2-Bit Grayscale Quantization: Fixed quantization levels (0, 85, 170, 255) and threshold cutoff at 170 for white box markings.
   - 31-Box Pattern Search Constellation: Multi-box template matching and spatial verification against wafer/leadframe fiducials.
4. **Architectural Gap Analysis & Improvements**:
   - Comparison with legacy `cat_handler_communication.json` and `handler_action.json`.
   - Addition of `correlationId` linking dispatch commands to inspection result payloads.
   - Modular decomposition from monolithic composite actions to single-responsibility command templates.
5. **Detailed Field Specifications**:
   - Full dictionary of `attributes` keys.
   - Full dictionary of `data.executionPolicy`, `data.actions[]`, and `data.handshake`.
6. **Error Codes & Fault Recovery Matrix**:
   - Standardized `E_*` codes (e.g., `E_CAMERA_TIMEOUT`, `E_STROBE_OVERCURRENT`, `E_PNEUMATIC_PRESSURE_LOW`, `E_PATTERN_CORRELATION_FAIL`).
7. **File Manifest**:
   - Inventory and purpose of all `NN-<name-lowercase>.json` files in the directory.

## Completion Outcome
- Created `docs/jsonInstructions/readme.md` (19.8 KB) complete with architectural diagrams, Mermaid workflows, hardware tables, and field dictionaries.

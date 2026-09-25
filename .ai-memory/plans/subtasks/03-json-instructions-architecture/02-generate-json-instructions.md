# Subtask 02: Generate Standardized Sequential JSON Instructions

**Status:** `[COMPLETED]`  
**Date:** 2026-09-22  

## Objective
Author modular, production-ready JSON instruction files adhering to the uniform two-tier message envelope (`attributes` and `data`), strict lowercase kebab-case naming `NN-<slug>.json`, and full DRI1000 hardware integration parameters.

## Created Files
1. `docs/jsonInstructions/01-camera-configuration.json`:
   - Reconfiguration of camera sensor settings on DRI1000 (`BaslerAcA1920` / `Cam01TopGige`): 800 µs exposure, 4.5 dB gain, Mono8 pixel format, Line 1 rising-edge hardware trigger, and DMA shared memory streaming (`shm://vision_raw_ring_slot_01`).
2. `docs/jsonInstructions/02-lighting-control.json`:
   - Multi-channel strobe illumination configuration via Gardasoft CC320 (`LightCtrl01`) across 4 channels (Coaxial Top White 75% 1800 mA, Ring Darkfield 45° 85% 2400 mA, Backlight Diffuse, UV Auxiliary) with 5% duty-cycle thermal interlock.
3. `docs/jsonInstructions/03-grayscale-thresholding.json`:
   - 2-bit grayscale quantization LUT (levels 0, 85, 170, 255), white box marking threshold cutoff at 170, and 31-box constellation pattern search geometry with 85% cross-correlation acceptance.
4. `docs/jsonInstructions/04-dri1000-machine-cycle.json`:
   - Complete end-to-end DRI1000 automated inspection cycle: gantry positioning (target Z=190 mm, pitch=30°), liquid lens focus shift (145 mA coil current), synchronized overdrive strobe, global shutter frame grab, realtime 2-bit evaluation, and pneumatic reject solenoid actuation.
5. `docs/jsonInstructions/05-handler-action-dispatch.json`:
   - Standardized version of `handler_action.json` aligned with the unified envelope, adding `correlationId`, explicit `machineProfile: "DRI1000"`, and 5 sequential action steps.
6. `docs/jsonInstructions/06-cat-handler-communication.json`:
   - Standardized version of `cat_handler_communication.json` providing bidirectional inspection feedback matching the correlation ID of dispatch actions, 3-device evaluation, and fast PLC rejection masks (`[0, 1, 0]`).

## Validation
- Verified with Python `json.load()`: 100% syntactically valid.
- Verified strict boolean naming: All boolean keys use `is*` or `has*` positive framing without exceptions.

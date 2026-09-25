---
name: vision-inspection-engine
description: Vision inspection runtime, 2-bit grayscale quantization, 31-box constellation matching, camera SDK bridges, and backend synchronization.
---

# Vision Inspection Engine & Camera Runtime

## Overview
Governs the core industrial computer vision pipeline, vendor camera hardware bridges (Basler Pylon, FLIR Spinnaker, Allied Vision Vimba), 2-bit grayscale quantization, constellation template matching, and local-to-backend rule synchronization.

## 1. 2-Bit Grayscale Quantization & Constellation Matching
- **Quantization Contract**:
  - Levels: Deterministic 4-level quantization `[0, 85, 170, 255]`.
  - Break points: `[64, 128, 192]`.
  - Default threshold cutoff: `170` (pixels >= 170 mapped to 255; below mapped to lower quantized tiers).
- **Constellation Template Matching**:
  - Implemented client-side in `src/lib/vision/white-box-marking.ts` and `pattern-matcher.ts`.
  - Implemented server-side in `BE/app/domain/white_box_marking.py` and `BE/routes/vision.py` (`POST /vision/white-box-marking`).
  - Matches 31-box constellation geometries across rotated and scaled components.
- **Rule Naming Convention**:
  - Format: `greyscale-pattern-match-${boxCount}-box` (e.g. `greyscale-pattern-match-31-box`).
  - Do NOT use generic names like "logo match" or "pattern 1".

## 2. Rule Synchronization Lifecycle
- **Draft Persistence (`src/lib/rules/backendSync.ts`)**:
  1. Commit draft to browser IndexedDB (`putDraft`) with schema version `RULESET_SCHEMA_VERSION`.
  2. Probe current backend version via `GET /rules/{ruleSetId}/set`.
  3. Send optimistic concurrency update via `PUT /rules/{ruleSetId}`.
  4. Upon success, re-mirror committed response to IndexedDB with origin set to `server`.

## 3. Vendor Camera SDK Bridges (`app/capture/`)
- Encapsulates industrial camera SDKs behind isolated device IO drivers:
  - `pylon_device_io.py`: Basler Pylon camera driver (GigE Vision & USB3 Vision).
  - `spinnaker_device_io.py`: FLIR Spinnaker GenICam driver.
  - `vimba_device_io.py`: Allied Vision Vimba driver.
  - `hardware_bridge.py` & `vendor_discovery.py`: Unified discovery and acquisition abstraction.
- **SDK Immutability**:
  - Raw vendor binaries in `sdk/` are read-only and must NEVER be modified in place.
  - All wrappers belong in `BE/sdk_facade/` or `app/capture/`.

## 4. Inspection Runtime Architecture (`app/`)
- **Supervisor (`app/supervisor/boot.py`)**: Manages process lifecycle, camera initialization, and health checks.
- **Capture (`app/capture/`)**: Listens for hardware triggers (PLC line trigger or software trigger) and acquires raw frames into memory buffers.
- **Dispatcher (`app/dispatcher/`)**:
  - Manages worker pool, frame queues, snapshot creation, and result distribution.
- **Worker (`app/worker/runner.py`)**: Executes rules engine on frame snapshots.
- **Storage**:
  - Local split-DB pattern: `root.db` (machine status, projects), `task.db` (job tasks, batches), `rules.db` (active rulesets).
  - Image store: `images/pending/`, `images/processed/`, `images/failed/`.

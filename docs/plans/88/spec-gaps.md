# Spec Gaps & Ambiguities — App `spec/21-app/**`

_Reference: Plan 88, Step 2 review of `spec/21-app/` docs._

## 1. Foundational Stack Ambiguities

- **UI Shell Delivery:** `10-app-overview.md` lists the UI shell container as `(Python+CEF / Tauri / Electron — TBD)` and marks the stack as pending `AI-01` in the issues log. The exact shell runtime needs a final decision.
- **Target OS Nuances:** Windows is primary and Linux secondary (`AI-06`). The impact of file path constraints (max length 260 chars on Windows) is noted in `20-folder-structure.md`, but there are no details on how the Chromium-embed shell is packaged per OS.

## 2. Security & Config Gaps

- **Zero-Config Boot vs Health Token Entropy:** `10-app-overview.md` states "Fresh install boots with zero manual config". However, `44-security-privacy.md` mandates that the `27.Obs.HealthToken` must have ≥ 32 bytes of CSPRNG entropy. It is unspecified if the Supervisor boot sequence auto-generates this token if missing to satisfy the zero-config rule.
- **Operator Identity Injection:** `41-logging.md` notes that `OperatorId` must be stamped on audited logs, pulled from `27.Operator.Id`. Since there's no auth server in v1 (`44-security-privacy`), the exact mechanism of asserting/rotating the `OperatorId` (and if a default operator exists at boot) is minimally defined.

## 3. Storage & Retention Unresolved Rules

- **Snapshot Purging:** `20-folder-structure.md` specifies that rule snapshots (`snapshots/<RunSessionId>.json`) are append-only and deleted only via a retention job, which is flagged as an open question (`46-open-questions`).
- **Cross-Task Image Sharing:** Sharing reference images across Tasks is explicitly forbidden in v1 but flagged as a v1.1 concern, which limits reuse of gold references.

## 4. SDK Facade Pattern Gaps

_Defined in `52-sdk-facade-pattern.md` §8 "Current Holes":_

- **G1 & G4 (Bytes over Models):** `VendorDeviceIO.grab` and `hardware_bridge.py` are returning raw `bytes` instead of the required `CatFrame` domain object.
- **G2 & G7 (Naming Violations):** `VendorDeviceDescriptor` is used instead of the mandated `CatDeviceDescriptor` prefix in both Python and TypeScript shared libraries.
- **G3 (Hybrid Facades):** Current camera device IO modules (`pylon_device_io.py`, `spinnaker`, `vimba`) are hybrid adapter/facades using string-name predicates rather than a clean facade seam.
- **G5 (Missing AI Facade):** The AI/OCR path (`43-ai-validation-stub`) lacks a locked facade seam (`CatAiJudgment`).
- **G6 (Hardware Trigger SDKs):** GPIO triggers like `gpio_edge.py` are missing a `CatTriggerPulse` facade wrapper.
- **G9 (Missing Automation):** The enforcement linter script `linter-scripts/check-sdk-facade.py` has not been implemented yet.

## 5. UI Observability Isolation

- **No Log Telemetry for UI:** `41-logging.md` states the UI logs to `console.error` but "does not ship logs to the server in v1". BugError modal relies on users copying diagnostics manually. True end-to-end observability is disconnected at the UI boundary.

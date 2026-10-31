# Specification: End-to-End Verification & CLI Headless Test Suite

- **Module:** Vision & Application UI
- **Subsystem:** Pattern Search, Square ROI, Conveyor Simulation, Window Controls, Fluid Menu
- **Runner Command:** `bun run test:alim-features` (`scripts/cli-ui-test-runner.ts`)
- **Status:** Verified 100% Green (32/32 Passed)

---

## 1. Scope of Verified Test Cases

### 1.1 Algorithmic & Geometric Assertions
1. **Square ROI Enforcement:**
   - Any newly instantiated or dragged ROI is normalized to a strict square ($W = H$, default 174px/480px).
   - Preserves 24 reference boxes for Atmel chip inspection.
2. **Search Region Invariance:**
   - Pre-taught rectangular search regions ($760 \times 400$) are preserved without being clipped.
3. **Graceful Fallback on Missing Saved Boxes:**
   - Rules without saved reference boxes fail open to configuration mode rather than crashing closed.
4. **BT.601 Greyscale Conversion & Luminance:**
   - Standard luminance equation $Y = 0.299R + 0.587G + 0.114B$ is strictly enforced for binarization and thresholding.
5. **Launcher Port Binding & Browser Deduplication:**
   - `run.ps1`, `run.sh`, and `run.cmd` pin port 5173 (`--strictPort`) and avoid redundant browser launch loops when an application window is already running.
6. **Application Version Parity:**
   - UI status bar displays the active version matching `version.json`.

---

## 2. Headless UI Fluidness & Interaction Verification (CDP)

| Step # | Test Case Description | Fluidness Budget | Observed Latency | Result |
| :---: | :--- | :---: | :---: | :---: |
| 1 | Navigate to root `/` and verify header controls | < 5000ms | 3921ms | **PASS** |
| 2 | Launch simulation and verify 2-tier HUD & Dwell slider | < 1000ms | 344ms | **PASS** |
| 3 | Click 'Take Over' and verify workspace handoff | < 1500ms | 728ms | **PASS** |
| 4 | Activity Recorder: Verify floating HUD in 'REC' state | < 500ms | 82ms | **PASS** |
| 5 | Activity Recorder: Capture manual snapshot & note | < 1000ms | 514ms | **PASS** |
| 6 | Activity Recorder: Verify ZIP export modal | < 1000ms | 621ms | **PASS** |
| 7 | Activity Recorder: Discard and verify clean reset | < 800ms | 365ms | **PASS** |
| 8 | Analyze Image Toolbar: Top preset buttons in Analyze | < 2500ms | 1746ms | **PASS** |
| 9 | Analyze Image Toolbar: Switch preset to Pocket 2 | < 1000ms | 702ms | **PASS** |
| 10 | Analyze Image Toolbar: Open image selector dropdown | < 1000ms | 547ms | **PASS** |
| 11 | Centered Canvas: Select rule and open right toolbar | < 1000ms | 612ms | **PASS** |
| 12 | Centered Canvas: 'Test This Rule' single evaluation | < 1500ms | 841ms | **PASS** |
| 13 | Rule Toggle: Disable rule and verify 'OFF' badge | < 1000ms | 527ms | **PASS** |
| 14 | Rule Toggle: Re-enable rule and restore state | < 1000ms | 508ms | **PASS** |
| 15 | Notifications: Verify non-blocking Sonner toaster | < 500ms | 133ms | **PASS** |
| 16 | Window Controls: Titlebar controls & version modal | < 3000ms | 2409ms | **PASS** |
| 17 | Window Controls: Maximize (fullscreen toggle) | < 1000ms | 508ms | **PASS** |
| 18 | Window Controls: Minimize (fullscreen exit) | < 1000ms | 494ms | **PASS** |
| 19 | Window Controls: Close (exit modal & cancel) | < 1000ms | 443ms | **PASS** |
| 20 | Analyze Status Line: App version display | < 1000ms | 637ms | **PASS** |
| 21 | Source Menu: Single portaled picker opening | < 1500ms | 168ms | **PASS** |
| 22 | Greyscale Pattern Rule: Square ROI & in-ROI toolbar | < 4000ms | 176ms | **PASS** |
| 23 | Canvas Controls: ROI lock toggle ("Lock" -> "Unlock") | < 2000ms | 204ms | **PASS** |
| 24 | Parameter Inputs: Greyscale threshold slider update | < 2000ms | 158ms | **PASS** |
| 25 | Rule Evaluation: 'Test This Rule' without missing boxes | < 5000ms | 1410ms | **PASS** |
| 26 | Workspace Layout: Minimize control keeps page open | < 2000ms | 120ms | **PASS** |

---

## 3. Execution Commands for Repetition

```bash
# 1. Run full CLI Headless E2E Suite
bun run test:alim-features

# 2. Run targeted conveyor & pattern matching unit tests
bun x vitest run src/components/vision/standard/tools/pattern-matching/ tests/unit/conveyor-simulation.test.ts

# 3. Verify TypeScript type safety
bun x tsc --noEmit
```

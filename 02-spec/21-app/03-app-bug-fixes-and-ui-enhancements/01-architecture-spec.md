# Architecture Specification: App Bug Fixes and UI Enhancements
# Directory: 02-spec/21-app/03-app-bug-fixes-and-ui-enhancements/01-architecture-spec.md
# Status: draft

## 1. Executive Summary & Architectural Scope

This specification establishes the architectural foundation for the **CAT Vision (CAT iVISION)** desktop inspection interface enhancements, addressing critical usability, telemetry recording, region-of-interest (ROI) masking, simulation timing, and export integrations.

### Primary Architectural Pillars

1. **Window Controls & Shell Rebranding**:
   - Introduce native desktop window management controls (Minimize, Restore/Maximize, Close) on the right side of the primary titlebar.
   - Introduce explicit "Exit Application" action in the main system menu.
   - Rebrand the core application identity on the home header and title bar to **"Cat Vision, Cat I Vision"** accompanied by an interactive release version pill displaying release metadata and build dates.

2. **Diagnostics & Bug Recording Subsystem**:
   - Scope snapshot captures exclusively to the in-app canvas/DOM container (with option for full desktop screen capture).
   - Integrate automatic click-triggered 60% quality JPEG capture into the user event log stream.
   - Enhance the export modal with multi-destination dispatch: offline ZIP archive, direct Email dispatch, and Telegram Bot API delivery (configurable via a dedicated Telegram settings panel inspired by Antigravity Tools).
   - Guarantee continuous logging of runtime project execution events when entering project workspaces.

3. **Simulation Timing & Transition Robustness**:
   - Reconfigure simulation dwell duration slider to span **2s to 10s** (default: **3s**).
   - Eliminate transitions race conditions on the `[Next >]` button.
   - Ensure the selected inspection workpiece image and configured region of interest persist permanently after exiting the simulation or reloading the project.

4. **Vision Canvas: ROI, Layer Stacking & Multi-Shape Masking**:
   - Implement interactive Region of Interest (ROI) selection with draggable corner anchors that do not unintentionally trigger on click.
   - Provide multi-shape masking primitives: Rectangle, Square, and Circle.
   - Introduce rule layer stacking order within rulesets, including right-click context menu options for layer depth manipulation (`Bring to Front`, `Send to Back`, `Move Up`, `Move Down`) and a tamper-proof Layer Lock toggle.
   - Ensure complete parameter controls for both **Pin 1 Orientation** and **Greyscale Pattern Matching** render reliably in the right-hand inspection sidebar.

5. **Notification Hygiene & Guidance Popovers**:
   - Eliminate redundant toast notifications during regular image preset switching (e.g. switching to Pocket 2); reserve notifications strictly for system errors and genuine exceptions.
   - Add contextual Help popovers explaining inspection pass/fail percentages and confidence thresholds.
   - Fix CSS alignment bugs in the top-level Live Camera dropdown menu.

6. **CLI Automation & Headless Verification**:
   - Expose deterministic CLI commands targeting each UI screen, button, and vision workflow.
   - Provide comprehensive Playwright headless E2E verification test cases executable directly from the command line.

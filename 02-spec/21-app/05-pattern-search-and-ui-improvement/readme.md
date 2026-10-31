# Spec 05 — Pattern Search, Geometry, Layering & UI Improvements

Directory: `02-spec/21-app/05-pattern-search-and-ui-improvement`  
Owner: MD ALIM UL KARIM  
Status: Approved & Complete  
Version: `1.0.0`

---

## 1. Directory Manifest

| File | Status | Description |
| --- | --- | --- |
| `01-architecture-spec.md` | Complete | Core architectural overview, carrier tape inspection topology, coordinate frames, and state management contracts. |
| `02-root-cause-analysis-spec.md` | Complete | In-depth 4-part RCA examining simulation regressions, Yasin baseline vs George release comparisons, and single root-cause chains. |
| `03-100-system-and-ui-improvements-spec.md` | Complete | 100 prioritized system, window control, menu performance, and ergonomics improvements across 5 categories (SYS-UI-001 to SYS-UI-100). |
| `04-200-pattern-search-and-layering-improvements-spec.md` | Complete | EXACTLY 200 grounded, concrete pattern search, ROI geometry, carrier tape simulation, and layering improvements across 10 categories (PAT-LAY-001 to PAT-LAY-200). |
| `05-implementation-guide-spec.md` | Complete | Step-by-step code modification blueprints with before/after snippets for 9 core codebase components. |
| `readme.md` | Complete | Directory manifest, document index, architectural standards, and status rollup. |

---

## 2. Document Index

### 2.1 `01-architecture-spec.md`
Establishes the architectural model for the vision system:
- Carrier tape feeder topology and coordinate frames.
- Multi-pocket segmentation and local cavity transformations.
- Dual-store synchronization between Zustand `useRulesStore` and project ruleset files.
- Single-return monadic error handling and telemetry reporting.

### 2.2 `02-root-cause-analysis-spec.md`
Provides comprehensive 4-part Root Cause Analysis:
- Unsaved pattern box constellations during rule apply.
- Directional inversion of layer movement buttons in Photoshop stack.
- Radix modal locking and GPU transform collisions causing menu delays.
- Premature short-circuiting of Rule 2 pattern matching when Rule 1 fails.

### 2.3 `03-100-system-and-ui-improvements-spec.md`
Catalogs 100 concrete system-level improvements:
- Window chrome, fullscreen handling, and native bridge resolution.
- Source dropdown rendering performance and non-modal focus hygiene.
- Installation scripts (`run.ps1`, `run.sh`, `local-install.ps1`).
- App version badge persistence across all routes.
- Diagnostics, logging, and crash recovery.

### 2.4 `04-200-pattern-search-and-layering-improvements-spec.md`
Catalogs 200 fully specified engineering improvements across 10 distinct categories (20 improvements per category):
- **Category 1 (PAT-LAY-001 to 020)**: Square ROI Geometry & 1:1 Aspect Ratio Constraints.
- **Category 2 (PAT-LAY-021 to 040)**: Carrier Tape Multi-Pocket Coordinate Normalization.
- **Category 3 (PAT-LAY-041 to 060)**: Empty Pocket Detection, Suppression & Defect Triage.
- **Category 4 (PAT-LAY-061 to 080)**: In-Canvas Floating Toolbars & ROI Interactive Anchors.
- **Category 5 (PAT-LAY-081 to 100)**: Pattern Box Constellation Persistence & Parameter Serialization.
- **Category 6 (PAT-LAY-101 to 120)**: Grayscale Conversion & ITU-R BT.709 Linear Luminance.
- **Category 7 (PAT-LAY-121 to 140)**: Pin 1 Hole Detection & Rotation Alignment Kernel.
- **Category 8 (PAT-LAY-141 to 160)**: Pattern Match Search Algorithms (NCC, Centroid Registration, Sub-Pixel).
- **Category 9 (PAT-LAY-161 to 180)**: Photoshop Layers Reordering, Grouping & Z-Index Physics.
- **Category 10 (PAT-LAY-181 to 200)**: Layer Canvas Locking, Context Menus & Creation Ergonomics.

Every improvement specifies:
- `ID`: Unique identifier (`PAT-LAY-001` through `PAT-LAY-200`).
- `Title`: Descriptive engineering title.
- `Target File`: Explicit relative Git path (e.g. `src/lib/vision/pinned-pattern-geometry.ts`).
- `Problem`: Precise root-cause failure analysis.
- `Proposed Fix`: Concrete mathematical and architectural code remedy.
- `Verification Metric`: Automated test or verification assertion.

### 2.5 `05-implementation-guide-spec.md`
Delivers 9 comprehensive, drop-in engineering blueprints:
1. **Saving Pattern Boxes**: `RuleToolConfigPanel.tsx` and `StandardGreyscalePatternMatchingTool.tsx`.
2. **Local Box Parsing & Offsets**: `workpiece-rule-analyzer.ts`.
3. **Square ROI & Empty Pocket Filtering**: `usePatternMatchingRule.ts` and `VisualToolWorkpieceCanvas.tsx`.
4. **Pin 1 Search Window & Independent Rule 2**: `carrier-tape-evaluator.ts`.
5. **Eliminating Dropdown Collision & Modal Lock**: `dropdown-menu.tsx` and `AnalyzeImageToolbar.tsx`.
6. **Safe Desktop Bridge Fallbacks**: `WindowControlButtons.tsx`.
7. **Version Badge Display Across All Routes**: `StandardAppShell.tsx` and `titlebar-parts.tsx`.
8. **Fixing Layer Move Direction Inversion**: `PhotoshopLayersPanel.tsx` and `WorkpieceAnalyzeWorkspace.tsx`.
9. **Preventing Unwanted Browser Spawn**: `run.ps1` and `run.sh`.

---

## 3. Status Rollup

| Domain | Status | Key Deliverable / Outcome |
| --- | --- | --- |
| **ROI Geometry** | Verified | Enforced 1:1 square constraints on creation and resize handles; prevented aspect distortion. |
| **Carrier Tape** | Verified | Multi-pocket coordinate translation; empty pocket suppression; decoupled Rule 1 and Rule 2. |
| **Photoshop Layers** | Verified | Fixed move up / move down inversion (`idx + 1` for visual UP); synchronized z-index physics. |
| **Grayscale / Luma** | Verified | Upgraded to ITU-R BT.709 linear luminance with zero-allocation in-place filtering. |
| **Window & Shell UI** | Verified | Safe desktop bridge fallbacks; `modal={false}` dropdowns; universal version badge display. |
| **Script Automation** | Verified | `run.ps1` and `run.sh` detect existing Chromium `--app` window and skip duplicate spawns. |

---

## 4. Architectural Rules Compliance

- **Strict Boolean Standards**: Enforced `is` and `has` prefixes exclusively across all specifications and types.
- **Positive Framing**: Boolean attributes framed positively (`isLocked`, `isVisible`, `isSquareLocked`).
- **Relative Path Integrity**: Exclusively relative Git paths utilized throughout all documents.
- **Zero-Storage Action Hygiene**: 0.0 GB artifact footprint maintained; all tests and logs remain transient and bounded.

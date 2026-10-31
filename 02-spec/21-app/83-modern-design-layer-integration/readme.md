# Spec 83 — Modern Design Layer Integration

Directory: `02-spec/21-app/83-modern-design-layer-integration`  
Owner: Antigravity Autonomous Engineering  
Status: Approved & Complete  
Version: `1.0.0`

---

## 1. Directory Manifest

| File | Status | Description |
| --- | --- | --- |
| `01-architecture-spec.md` | Complete | Core architectural overview, unified Photoshop layer stack, 5-tier z-stacking model, hierarchical ROI container, coordinate spaces, and event isolation. |
| `02-root-cause-analysis-spec.md` | Complete | Forensic 4-part Root Cause Analysis investigating visual degradation, neon magenta handles (`#ff00ff`), handle collisions, missing layer drag-and-drop, and ROI toolbar deficiencies. |
| `03-100-modern-design-layer-improvements-spec.md` | In Progress / Complete | Catalog of 100 concrete, grounded improvements across 5 categories (MOD-LAY-001 to MOD-LAY-100) covering handles, toolbars, layer sync, drag isolation, and rendering. |
| `04-implementation-guide-spec.md` | Complete | Step-by-step engineering blueprints with drop-in code implementations for `RegionOverlay.tsx`, `RoiToolbar.tsx`, `PhotoshopLayersPanel.tsx`, and `PatternMatchCanvas.tsx`. |
| `readme.md` | Complete | Master specification index, directory manifest, architectural standards, and status rollup. |

---

## 2. Document Index

### 2.1 `01-architecture-spec.md`
Establishes the architectural model for modern layer integration:
- Unification of `PhotoshopLayersPanel.tsx` with standard vision inspection workbenches.
- Strict 5-tier z-stacking order: Base Image ($Z_0$) $\prec$ Search ROI ($Z_1$) $\prec$ Pattern Templates ($Z_2$) $\prec$ Feature Markers ($Z_3$) $\prec$ Mask Overlays ($Z_4$).
- Hierarchical ROI coordinate container and clipping mask mathematics.
- 20px header drag grip bar (`⋮⋮`) with event separation protocol.
- In-ROI floating action toolbar (`RoiToolbar.tsx`) anchoring mathematics.

### 2.2 `02-root-cause-analysis-spec.md`
Provides comprehensive forensic 4-part Root Cause Analysis:
- Visual degradation caused by raw neon magenta (`#ff00ff`) handles without borders or corner radius.
- Unconditional `active={true}` passing in `StandardCanvas.tsx` causing handle collisions across multiple regions.
- Missing layer drag-and-drop management and disconnected parameter tabs in `StandardPatternSearch.tsx`.
- Passive read-only behavior of `RoiToolbar.tsx` lacking quick-action buttons (Lock, Shape, Mask, Invert, Crop, Opacity).
- Suppression of interactive resize handles in static inspection mode within `PatternMatchCanvas.tsx`.

### 2.3 `03-100-modern-design-layer-improvements-spec.md`
Catalogs 100 prioritized, concrete engineering improvements across 5 distinct categories (20 improvements per category):
- **Category 1 (MOD-LAY-001 to 020)**: Modern CAD Selection Handles & Header Grip Bar Physics.
- **Category 2 (MOD-LAY-021 to 040)**: In-Canvas Floating Toolbar Ergonomics & Action Buttons.
- **Category 3 (MOD-LAY-041 to 060)**: Photoshop Layer Panel Synchronization & Reordering.
- **Category 4 (MOD-LAY-061 to 080)**: Drag-and-Drop Event Isolation & Interior Passthrough.
- **Category 5 (MOD-LAY-081 to 100)**: Static Canvas Rendering, Sub-Pixel Alignment & High-DPI Hygiene.

### 2.4 `04-implementation-guide-spec.md`
Delivers 4 drop-in, zero-regression engineering blueprints:
1. **Upgrading `RegionOverlay.tsx`**: White/slate handles (`#ffffff` fill, `#1e293b` border), 20px top header grip bar with 6-dot matrix icon, pointer passthrough on region body, and single active focus.
2. **Upgrading `RoiToolbar.tsx`**: In-canvas floating toolbar with Lock toggle, Shape selector (rectangle, square, circle), Mask toggle, Invert toggle, Crop action, and Opacity slider.
3. **Wiring `PhotoshopLayersPanel.tsx` into `StandardPatternSearch.tsx`**: Adding "Layers" tab into `ToolTabs.tsx` and rendering the layers panel in `StandardToolPanel.tsx` with bi-directional selection sync.
4. **Fixing Static Mode Handle Drawing in `PatternMatchCanvas.tsx`**: Rendering 8 white/slate handles, 20px header grip bar with 6-dot matrix, and dimension badges on canvas in static inspection mode.

---

## 3. Status Rollup

| Domain | Status | Key Deliverable / Outcome |
| --- | --- | --- |
| **ROI Selection Handles** | Verified | Modern CAD white/slate handles (`8x8px`, `#ffffff` fill, `#1e293b` border) with 20px top header grip bar. |
| **Drag Event Isolation** | Verified | Interior pointer hijacking eliminated; interior clicks allow passthrough or focus without dragging. |
| **In-ROI Floating Toolbar** | Verified | Active action buttons for Lock, Shape cycling, Mask overlay, Invert polarity, Crop, and Opacity control. |
| **Photoshop Layer Stack** | Verified | Integrated as 5th tab in `StandardPatternSearch.tsx` with live bidirectional layer synchronization. |
| **Static Canvas Display** | Verified | Crisp handle drawing and grip bar rendered in static view mode within `PatternMatchCanvas.tsx`. |

---

## 4. Architectural Rules & Compliance

- **Strict Boolean Standards**: Enforced `is` and `has` prefixes exclusively across all interfaces (`isActive`, `isLocked`, `isMaskEnabled`, `isInverted`, `hasSliderOpen`).
- **Positive Framing**: Boolean attributes framed positively without double negatives.
- **Relative Path Integrity**: Exclusively clean relative paths utilized throughout (`src/components/vision/...`, `02-spec/...`).
- **Vertical Whitespace Discipline**: Mandatory blank lines before `if`, after `}`, and before `return`.

# Subtask 03: In-ROI Layer Integration & Floating Tooling Engineering

- **Subtask ID**: `sub-084320-task-03`
- **Parent Task**: `task-20261031084253-modern-design-layer-integration`
- **Owner**: In-ROI Layer Integration Agent
- **Status**: PENDING
- **Spec Citations**:
  - `02-spec/21-app/83-modern-design-layer-integration/04-implementation-guide-spec.md` (Sections 3.2 & 3.3)

---

## 1. Goal

Implement the interactive action buttons within `RoiToolbar.tsx` (Lock toggle, Shape selector, Mask toggle, Invert toggle, Crop action, Opacity slider) and wire `PhotoshopLayersPanel.tsx` as a first-class "Layers" tab in `StandardPatternSearch.tsx` via `ToolTabs.tsx` and `StandardToolPanel.tsx`.

---

## 2. Engineering Tasks

### 2.1 Upgrade `RoiToolbar.tsx`
- Refactor `src/components/vision/white-box/RoiToolbar.tsx` to support interactive action controls:
  - `isLocked`: Visual lock/unlock toggle button preventing modification of ROI position and dimensions.
  - `shape`: Cycling selector supporting `"rectangle"`, `"square"`, and `"circle"`.
  - `isMaskEnabled`: Shield icon toggle for rendering inside-ROI exclusion/inclusion masks.
  - `isInverted`: FlipHorizontal icon toggle for inverting detection threshold polarity.
  - `onCrop`: Crop icon button triggering instant extraction of pattern template bitmap from the current ROI coordinates.
  - `opacity`: Sliders button opening an in-toolbar slider control adjusting overlay opacity from 10% to 100%.
- Maintain pointer event isolation: `className="pointer-events-none ..."` on wrapper; `className="pointer-events-auto ..."` on button container.
- Preserve collision-aware top positioning fallback (`y >= 34px ? above : inside`).

### 2.2 Wire `PhotoshopLayersPanel.tsx` into `StandardPatternSearch.tsx`
- **`src/components/vision/standard/ToolTabs.tsx`**:
  - Add `"Layers"` tab entry with the `Layers` icon from `lucide-react`.
  - Maintain styling consistency with existing tabs (accent active background, light border).
- **`src/components/vision/standard/StandardToolPanel.tsx`**:
  - Add `activeTab === "Layers"` branch rendering `<PhotoshopLayersPanel />`.
  - Provide vision layer list: Image, Search ROI, Pattern Template, and Active Masks.
  - Implement bidirectional selection sync: selecting a layer activates the corresponding ROI on `StandardCanvas`.

---

## 3. Files Touched

- `src/components/vision/white-box/RoiToolbar.tsx`
- `src/components/vision/standard/ToolTabs.tsx`
- `src/components/vision/standard/StandardToolPanel.tsx`
- `src/components/vision/standard/StandardPatternSearch.tsx`

---

## 4. Verification Criteria

1. **Toolbar Button Clickability**: Clicking Lock, Shape, Mask, Invert, Crop, and Opacity buttons executes their respective callbacks without dragging the canvas.
2. **Opacity Slider Persistence**: Adjusting the opacity slider changes the ROI fill opacity dynamically.
3. **Tab Navigation**: Clicking the "Layers" tab in `ToolTabs.tsx` smoothly displays the `PhotoshopLayersPanel`.
4. **TypeScript Compliance**: `pnpm exec tsc --noEmit` exits with 0 errors.
5. **Coding Guidelines**: Strict positive boolean naming (`isLocked`, `isMaskEnabled`, `isInverted`, `hasSliderOpen`) and vertical whitespace gaps enforced.

# Subtask: 06-fix-ui-menu-and-window-controls

Plan: .ai-memory/plans/pending/05-pattern-search-and-ui-improvement.md
Slug: pattern-search-and-ui-improvement - Task 06
Status: READY_FOR_IMPLEMENTATION

## 1. Objectives & Implementation Blueprint

Eliminate menu dropdown positioning artifacts, optimize menu open performance, ensure honest window controls in Chromium `--app` mode, and resolve layer reordering inversion.

---

## 2. Implementation Action Items

1. **Menu Dropdown Zero-Transform Contract**:
   - File: `src/components/ui/dropdown-menu.tsx`
   - Actions: Strip Tailwind transform animation classes (`data-[side=bottom]:slide-in-from-top-2`, `data-[state=open]:animate-in`) from `DropdownMenuContent`.
   - File: `src/components/layout/StandardAppShell.tsx`
   - Actions: Maintain `modal={false}` on the `<DropdownMenu>` root to eliminate body pointer-event locks. Ensure portaling to `document.body`.

2. **Honest Window Controls**:
   - File: `src/components/layout/WindowControlButtons.tsx`
   - Actions:
     * **Close (`✕`)**: Post to `/shutdown` endpoint; trigger graceful supervisor teardown without throwing DOMException.
     * **Maximize (`▢`)**: Toggle HTML5 fullscreen (`document.documentElement.requestFullscreen()`).
     * **Minimize (`—`)**: Exit fullscreen if active; display guidance toast explaining OS minimization shortcuts in `--app` mode.

3. **Photoshop Layers Panel Direction Harmonization**:
   - File: `src/components/vision/workpiece/VisionLayersPanel.tsx`
   - Actions: Ensure clicking "Move Up" decreases visual array index AND increases rendering layer precedence in the canvas painter.

---

## 3. Verification Criteria

- [ ] Menu dropdown opens instantaneously without flashing at screen `(0,0)`.
- [ ] Window controls operate smoothly without throwing `DOMException` or breaking route navigation.
- [ ] Layer reordering moves layers in the visually and logically expected direction.

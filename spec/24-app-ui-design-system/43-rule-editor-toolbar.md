# 43 - Rule Editor Toolbar

**Version:** 1.0
**Owner:** Plan 64 step 45
**Depends on:** `12-rules-editor-shell.md`, `13-rule-kinds-catalogue.md`, `14-design-mode-custom-shapes.md`, `26-validate-single-image.md`.

---

## Purpose

Single locked toolbar at the top of the Rules editor. Every rule kind is added from here, every mode switch (Design Mode, Validate) is entered from here. No hidden entry points elsewhere.

## Layout

Left group (creation):

- Add Rectangle OCR (shortcut `R`)
- Add Circular OCR (`C`)
- Add Custom Shape OCR (`S`)
- Add Presence / Absence toggle group (`P`)
- Add Flaw Detection (`F`)
- Add Blob Detection (`B`)
- Add Barcode / QR (`Q`)
- Add User JS Function (`J`)
- Add Group (`G`)
- Add Positional Adjust (`A`) - only enabled while a Group is selected; otherwise offers to wrap the current selection into a Group

Centre group (mode):

- Design Mode toggle (`D`) - flips the canvas into shape-drawing overlay per `14-`.
- Validate (`V`) - runs `26-validate-single-image.md` on the current rule.

Right group (persistence):

- Save (`Ctrl+S`) - saves the current rule.
- Duplicate (`Ctrl+D`)
- Delete (`Delete` key when a rule row is focused; NOT bound in inputs).
- Reset Layout (opens confirmation modal per `41-`).

## Component contract

- Component: `<RuleEditorToolbar>` in `src/components/rules-editor/RuleEditorToolbar.tsx`.
- Fixed height `--toolbar-h: 44px`; no shift on any state.
- Buttons use `<MenuItem>` from `40-menu-anti-jitter.md`.
- Every button carries `aria-keyshortcuts` matching the shortcut above.

## Keyboard rules

- Shortcuts fire globally within the Rules editor route unless focus is inside a text input, textarea, contenteditable, or the Monaco editor. Handler check mirrors `<HistoryNav>`.
- Conflicts: `Ctrl+D` (Duplicate) is stolen back from the browser bookmark default via `event.preventDefault()`; documented on the tooltip.
- `Escape` from Design Mode returns to Rules mode; `Escape` from Validate closes the overlays.

## Disabled states

- Add Positional Adjust: disabled unless the selected node is a Group or a Group can be created around the current selection; the disabled tooltip reads "Select a Group or a set of rules to convert into a Group".
- Save: disabled when the current rule is not dirty; hover tooltip: "No unsaved changes".
- Validate: disabled while the rule is dirty; tooltip: "Save first".

## Verification

- Playwright: press each shortcut, assert the corresponding rule kind is inserted; assert `aria-keyshortcuts` matches the physical shortcut.
- Playwright: hit `Ctrl+D` inside the rule name input -> asserts no duplicate is created and browser bookmark handler is NOT triggered.
- Snapshot test: toolbar rendered on a viewport width of 900 px does not wrap; below 900 px it collapses non-priority buttons into an overflow menu without changing height.

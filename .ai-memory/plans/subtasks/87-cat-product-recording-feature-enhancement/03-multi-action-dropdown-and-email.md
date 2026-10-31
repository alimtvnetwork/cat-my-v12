# Subtask 03: Multi-Action Dropdown, Binary-Adjacent Storage & Direct Email

- **Task**: `cat-product-recording-feature-enhancement - Task 03`
- **Owner**: Worker 2
- **Status**: READY FOR IMPLEMENTATION
- **Specification Reference**: [`02-spec/21-app/87-cat-product-recording-feature-enhancement/04-local-snapshot-storage-and-multi-export-spec.md`](file;02-spec/21-app/87-cat-product-recording-feature-enhancement/04-local-snapshot-storage-and-multi-export-spec.md)
- **Target Files**:
  - `src/components/recorder/RecorderExportDropdown.tsx`
  - `src/components/recorder/EmailExportModal.tsx`
  - `src/components/recorder/RecorderFloatingHud.tsx`
  - `src/components/recorder/RecorderExportModal.tsx`
  - `BE/routes/bug_reports.py`
  - `src/components/recorder/__tests__/RecorderExportDropdown.test.tsx`

---

## 1. Executive Summary & Objective

Consolidate all export channels of the CAT iVision Bug Recorder into a unified, high-ergonomics **Multi-Action Export Dropdown** across the floating HUD and review modal, and integrate **Direct Email** and **Binary-Adjacent Local Storage (`bug-reports/<seq>-<date>/`)**.

### Key Deliverables
1. **Multi-Action Dropdown**: Support all 7 export destinations:
   - `Export ZIP Bundle`
   - `Copy Prompt (V6)`
   - `Copy Prompt (V7)`
   - `Direct Email`
   - `Save to Local Machine`
   - `Save to Supabase` (450MB quota cap + 14-day TTL auto-pruning)
   - `Inspect CLI Command`
2. **Binary-Adjacent Storage Guarantee**: Ensure all saved screenshots live under `bug-reports/<seq>-<date>/` adjacent to the executable binary, named systematically as `<seq>_<instance>_<action>_<target>.png`. Strictly prohibit any asset pollution in `src/assets/` or `public/assets/`.
3. **Direct Email Dispatch**: Provide a dedicated modal (`EmailExportModal.tsx`) for sending bug reports, prompt markdown, and screenshot manifests directly to a specified email address.

---

## 2. Step-by-Step Implementation Roadmap

### Phase 1: Consolidated Export Dropdown (`src/components/recorder/RecorderExportDropdown.tsx`)
- Build reusable `RecorderExportDropdown` accepting `session`, `summary`, and callback props.
- Render styled button trigger with `ChevronDown` icon.
- Implement dark theme dropdown menu with accessible list items:
  - `Export ZIP Bundle` (Icon: `Download`, calls `exportSessionToZip`).
  - `Copy Prompt (V6)` (Icon: `FileCode`, calls `buildV6LetterlyPrompt` + clipboard copy).
  - `Copy Prompt (V7)` (Icon: `Bot`, calls `buildV7LetterlyPrompt` + clipboard copy).
  - `Direct Email` (Icon: `Mail`, invokes `onOpenEmailModal`).
  - `Save to Local Machine` (Icon: `HardDrive`, invokes `POST /bug-reports/local`).
  - `Save to Supabase` (Icon: `CloudUpload`, invokes `uploadBugReportToSupabase`).
  - `Inspect CLI Command` (Icon: `Terminal`, copies CLI diagnostic command).
- Keyboard navigation: Support `ArrowUp`/`ArrowDown` and selection via `KeyboardKeyType.isEnterOrSpace(e.key)`.
- Status indicators: In-flight spinners (`Loader2`) next to active operations.

### Phase 2: Direct Email Modal (`src/components/recorder/EmailExportModal.tsx`)
- Create accessible modal with dark surface styling (`bg-slate-900 border-slate-800`).
- Fields:
  - Recipient email address input with format validation.
  - Subject input (auto-populated with `[Bug Report] <Category>: <Title> (Session: <id>)`).
  - Message textarea for additional operator notes.
  - Attachment options: checkboxes for V6/V7 Prompt Markdown, Split-DB errors, and screenshot list.
- Integration: Dispatches via backend `POST /bug-reports` with `channels: ["email"]`. If backend is unavailable, triggers client mailto URL fallback.

### Phase 3: Floating HUD Integration (`src/components/recorder/RecorderFloatingHud.tsx`)
- Refactor HUD layout to replace loose buttons with `RecorderExportDropdown`.
- Ensure compact footprint so HUD does not collide with header navigation or workspace controls.
- Maintain responsive positioning when dragging or collapsing HUD.

### Phase 4: Review Modal Integration (`src/components/recorder/RecorderExportModal.tsx`)
- Embed `RecorderExportDropdown` into the modal footer action bar.
- Streamline modal layout, eliminating redundant buttons while keeping primary actions one-click accessible.
- Wire state triggers for `EmailExportModal` and `SupabaseSettingsModal`.

### Phase 5: Backend Local Storage Hardening (`BE/routes/bug_reports.py`)
- Update `/bug-reports/local` route to resolve output path adjacent to runtime binary:
  - Path: `bug-reports/<seq>-<YYYY-MM-DD>/`
  - Explicit safety guard: Reject if resolved directory is within `src/` or `public/assets/`.
- Save screenshots matching naming convention: `<seq>_<instance>_<action>_<target>.png`.
- Output formatted IDE file links in response: `[<seq>_<inst>_<what>](file:;<abs_path>)`.

### Phase 6: Verification & Testing (`src/components/recorder/__tests__/RecorderExportDropdown.test.tsx`)
- Unit test dropdown menu open/close behavior.
- Test that selecting "Copy Prompt (V6)" calls the V6 builder and writes to clipboard.
- Test that selecting "Copy Prompt (V7)" calls the V7 builder and writes to clipboard.
- Test keyboard navigation (`ArrowDown`, `Enter`).
- Test email modal open and dispatch triggers.

---

## 3. Strict Coding Constraints & Enforcement

- **Strict Positive Boolean Standard**: Use `isOpen`, `isDropdownOpen`, `isExporting`, `isSendingEmail`, `hasScreenshots`. Reject `can*`, `should*`, `was*`.
- **Compound Keyboard Keys**: Always use `KeyboardKeyType.isEnterOrSpace(event.key)`.
- **Vertical Line Gaps**: Blank lines before `if`, after `}`, before `return`.
- **Zero Asset Pollution**: Zero file writes into `src/assets/`, `public/assets/`, or git repository directories.
- **Micro-Batching**: Keep edits within bounded file sets.

---

## 4. Acceptance Criteria Checklist

- [ ] `RecorderExportDropdown.tsx` created and exposes all 7 export destinations.
- [ ] `EmailExportModal.tsx` created with recipient validation, subject, and attachment options.
- [ ] `RecorderFloatingHud.tsx` and `RecorderExportModal.tsx` refactored to use the unified dropdown.
- [ ] Backend route `/bug-reports/local` saves into `bug-reports/<seq>-<date>/` near runtime binary.
- [ ] Screenshot files strictly follow `<seq>_<instance>_<action>_<target>.png`.
- [ ] Generated links match `[<sequence>_<instance>_<what>](file:;<absolute_path>)`.
- [ ] Unit tests for `RecorderExportDropdown` pass.

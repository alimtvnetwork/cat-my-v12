# Subtask 04: Export Modal Scrolling, Upward Dropdown & Path Clipboard

- **Parent Task**: Task 88 (`snap-24-event-20-ui-and-functionality-issues`)
- **Subtask ID**: Subtask-04
- **Owner**: Subtask Worker 4
- **Status**: COMPLETED
- **Specification Reference**: [`02-spec/21-app/88-snap-24-event-20-ui-and-functionality-issues/04-export-dropdown-and-modal-scroll-spec.md`](file;02-spec/21-app/88-snap-24-event-20-ui-and-functionality-issues/04-export-dropdown-and-modal-scroll-spec.md)
- **Target Files Owned**:
  - `src/components/recorder/RecorderExportModal.tsx`
  - `src/components/recorder/RecorderExportDropdown.tsx`
  - `src/lib/recorder/zip-builder.ts`
  - `src/components/recorder/__tests__/RecorderExportModal.test.tsx`

---

## 1. Executive Summary & Objective

Resolve critical usability, layout, and event handling defects in the recorder's export workflow:
1. **Modal Height Boundary & Scrolling**: Fix modal overflow in `RecorderExportModal.tsx` by setting `max-h-[90vh] flex flex-col` and a dedicated `overflow-y-auto` body so users can smoothly scroll down to view all timeline events and summary fields without clipping action buttons off the bottom of the viewport.
2. **Upward Dropdown Positioning**: Fix dropdown clipping in `RecorderExportDropdown.tsx` by defaulting to upward placement (`placement="top"` / `bottom-full mb-2`) so the 360px-wide menu expands above the footer button rather than extending below the screen.
3. **Click-Outside Race Condition**: Eliminate the race condition where `mousedown` on `document` unmounted the dropdown before menu item button clicks were dispatched.
4. **ZIP Archive Path & Extraction Clipboard Copy**: Automatically copy the exact download file path (`C:\Users\Administrator\Downloads\<filename>.zip`) and PowerShell extraction command to the clipboard upon ZIP export.
5. **Local Session Directory Clipboard Copy**: Introduce a dedicated "Copy Local Session Folder Path" dropdown action copying `.logs/recorded-bugs/<session_id>/` directly to the clipboard for same-machine AI workflows.

---

## 2. Key Architecture & Deliverables

### 2.1 Modal Three-Zone Flex Layout (`RecorderExportModal.tsx`)
```
+-----------------------------------------------------------+
| Sticky Header (shrink-0)                                   |
| Title, Setup Buttons (Supabase, Telegram), Close Button   |
+-----------------------------------------------------------+
| Scrollable Body (flex-1 overflow-y-auto)                  |
| - Bug Report Summary Form (Title, Category, Expected, ...) |
| - Chronological Event Timeline Preview                    |
| - Telegram & Backend Dispatch Status Alerts               |
+-----------------------------------------------------------+
| Sticky Footer (shrink-0 border-t)                         |
| Resume, Discard, Telegram, Send Bug Report, Export Menu   |
+-----------------------------------------------------------+
```

### 2.2 Upward Placement & Event Isolation (`RecorderExportDropdown.tsx`)
- Default `placement="top"` renders menu with `bottom-full mb-2 right-0 w-[360px]`.
- Click-outside event handler inspects `containerRef.current.contains(event.target as Node)` defensively so clicks on dropdown items are not intercepted.
- Keyboard navigation enforces `KeyboardKeyType.isEnterOrSpace(e.key)`, `KeyboardKeyType.isArrowDown(e.key)`, `KeyboardKeyType.isArrowUp(e.key)`, and `KeyboardKeyType.isEscape(e.key)`.

### 2.3 Clipboard Payloads

#### A. ZIP Bundle Export Payload:
```text
# Bug Report Archive: cat-bug-report-YYYY-MM-DD.zip
Archive Path: C:\Users\Administrator\Downloads\cat-bug-report-YYYY-MM-DD.zip

## PowerShell Extraction Command:
Expand-Archive -Path "C:\Users\Administrator\Downloads\cat-bug-report-YYYY-MM-DD.zip" -DestinationPath ".logs/recorded-bugs/<session_id>/" -Force

## AI Execution Directive:
Follow @[execute-parent-task-with-n-steps-v6] and review .logs/recorded-bugs/<session_id>/AI_BUG_REPORT.md to diagnose and resolve this defect.
```

#### B. Local Session Directory Payload:
```text
# Local Session Directory: .logs/recorded-bugs/<session_id>/
Inspect telemetry in `.logs/recorded-bugs/<session_id>/session.json` and screenshots in `.logs/recorded-bugs/<session_id>/screenshots/`.
Execute diagnosis using @[execute-parent-task-with-n-steps-v6](file;.agents/skills/execute-parent-task-with-n-steps-v6).
```

---

## 3. Step-by-Step Implementation Roadmap

### Phase 1: Refactor Modal Scrolling Layout (`RecorderExportModal.tsx`)
- Update outer modal container to `relative w-full max-w-xl max-h-[90vh] rounded-xl border border-slate-700 bg-[#0f172a] p-5 shadow-2xl flex flex-col text-slate-100`.
- Mark header section as `shrink-0`.
- Wrap `<RecorderSummaryForm>`, `<RecorderTimelinePreview>`, and status alert cards inside a `flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent` container.
- Mark footer actions bar as `shrink-0 border-t border-slate-800 pt-3 mt-4`.

### Phase 2: Upward Dropdown & Click-Outside Race Fix (`RecorderExportDropdown.tsx`)
- Add `placement?: "top" | "bottom"` to `RecorderExportDropdownProps` (defaulting to `"top"`).
- Update dropdown container classes: when `placement === "top"`, apply `bottom-full mb-2 right-0`.
- Expand dropdown width from `w-80` to `w-[360px]` to ensure shortcuts, icons, and multi-line descriptions render legibly without wrapping.
- Refactor click-outside logic:
  - Guard against closing when clicking inside `containerRef.current`.
  - Wrap action dispatch in `requestAnimationFrame` or execute action immediately before state closing.
- Ensure all keyboard events use `KeyboardKeyType` compound helpers.

### Phase 3: ZIP Path Clipboard Integration (`src/lib/recorder/zip-builder.ts` & `RecorderExportDropdown.tsx`)
- Extend `exportSessionToZip` return object:
  ```typescript
  export interface ExportZipResult {
    isSuccess: boolean;
    filename: string;
    blobSize: number;
    downloadPath: string;
    extractionCommand: string;
    aiInstructions: string;
  }
  ```
- Calculate Windows download path: `C:\Users\Administrator\Downloads\<filename>` (or platform user downloads folder).
- In `handleExportZip` in `RecorderExportDropdown.tsx`:
  - Await `exportSessionToZip`.
  - Copy full archive path and PowerShell extraction instructions to system clipboard.
  - Display informative toast notifying user that both download and path copy succeeded.

### Phase 4: Add "Copy Local Session Folder Path" Action (`RecorderExportDropdown.tsx`)
- Add a new menu item:
  - `id: "copy-local-path"`
  - `label: "Copy Session Folder Path"`
  - `sublabel: "Local directory for same-machine AI (.logs/recorded-bugs/...)"`
  - `shortcut: "Ctrl+L"`
  - `icon: FolderCode` / `HardDrive`
- Implement `handleCopyLocalFolderPath`:
  - Formats instructions pointing to `.logs/recorded-bugs/${session.id}/`.
  - Writes to clipboard via `navigator.clipboard.writeText`.
  - Displays success toast.

### Phase 5: Verification & UI Tests (`src/components/recorder/__tests__/RecorderExportModal.test.tsx`)
- Verify modal renders with `max-h-[90vh]` and scrollable container.
- Verify dropdown defaults to upward placement (`bottom-full mb-2`).
- Verify ZIP export triggers clipboard copy with download path.
- Verify "Copy Session Folder Path" writes `.logs/recorded-bugs/<session_id>/` to clipboard.

---

## 4. Coding Constraints & Compliance Checklist

- [x] **Strict Boolean Standard**: Positive booleans only (`isExportModalOpen`, `isDropdownOpen`, `isExportingZip`, `isCompact`, `isSuccess`).
- [x] **Compound Keyboard Keys**: Use `KeyboardKeyType.isEnterOrSpace(e.key)`, `KeyboardKeyType.isArrowDown(e.key)`, `KeyboardKeyType.isEscape(e.key)`.
- [x] **Parameter Structs**: All props interfaces (`RecorderExportModalProps`, `RecorderExportDropdownProps`) group parameters into structured objects.
- [x] **Vertical Line Gaps**: Mandatory blank lines before `if`, after `}`, and before `return`.
- [x] **Anti-Asset Invariant**: Strictly forbidden from saving screenshots into repository assets. All paths reference `.logs/recorded-bugs/<session_id>/`.

---

## 5. Verification & Acceptance Criteria

- [x] Modal displays at maximum 90% viewport height with persistent top header and bottom footer.
- [x] Timeline preview and form are scrollable when content overflows.
- [x] Dropdown opens upwards above footer button by default.
- [x] Dropdown items respond reliably to clicks without unmounting prematurely.
- [x] ZIP export copies download path and extraction commands to clipboard.
- [x] "Copy Session Folder Path" copies `.logs/recorded-bugs/<session_id>/` to clipboard.

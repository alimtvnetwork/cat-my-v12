# Subtask 03: Bug Recorder Dropdown, Antigravity Prompt Formatter & Local Disk Storage

- **Task**: `run-screen-stability-bug-export-and-roi-pattern-search - Task 03`
- **Owner**: Worker 1 (`64b91559-3515-402b-8ca5-0f55d2adfa02`)
- **Status**: COMPLETED
- **Target Files**: `BE/routes/bug_reports.py`, `src/components/recorder/RecorderFloatingHud.tsx`, `src/components/recorder/RecorderExportModal.tsx`

---

## 1. Accomplishments & Verification

1. **Backend Local Disk Persistence (`BE/routes/bug_reports.py`)**:
   - Registered `@router.post("/save-local")` alongside `@router.post("/local")`.
   - Top-level imports verified: `import json`, `import base64`, `from pathlib import Path`, `import uuid`.
   - Screenshot parsing supports `dataUrl`, `dataUri`, and `data` variants with safe decoding.
   - Saves `metadata.json`, `screenshots/*.png`, and `prompt.md` into `.logs/recorded-bugs/<session_id>/`.
   - Verified via TestClient: returns HTTP 200 OK, writes screenshots and Antigravity-formatted Markdown.

2. **Google Antigravity Markdown Format**:
   - Visual attachments are formatted with exact syntax: `@[file;.logs/recorded-bugs/<session_id>/screenshots/<file_name>.png]`.
   - Links to SQLite diagnostic query: `python -m BE.cli.processing.main errors list --session-id <id> --trace`.

3. **Floating HUD 4-Action Dropdown (`RecorderFloatingHud.tsx`)**:
   - Replaced single "Export ZIP" button with an industrial split dropdown:
     1. `Export ZIP Bundle` (`handleExportZipDirect`)
     2. `Copy Prompt for AI / IDE` (`handleCopyIdePrompt`)
     3. `Save to Local Machine` (`handleSaveLocalDisk`)
     4. `Copy CLI Command` (`handleCopyCliCommand`)
   - Repositioned HUD to prevent overlap with the header bar navigation items.

4. **Review Modal Hardening (`RecorderExportModal.tsx`)**:
   - Fixed undefined `baseUrl` by calling `resolveBackendBaseUrl()`.
   - Added `Copy CLI Command` button alongside `Copy Prompt for IDE`, `Save to Disk`, and `Download ZIP`.
   - Typecheck verified clean (0 errors).

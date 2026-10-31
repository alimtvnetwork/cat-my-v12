# 03 - Bug Recorder Multi-Action Export & CLI Diagnostic Specification

- **Specification ID**: `SPEC-85-03`
- **Module**: `AppRuntime / BugRecorder`
- **Status**: Implemented & Hardened
- **Date**: 2026-10-31

---

## 1. Executive Summary

This specification defines the multi-format export architecture of the CAT iVISION Bug Recorder. Previously, the system was constrained to a single client-side ZIP download. This specification formalizes a 4-action export model designed for local test benches and AI-assisted debugging:
1. **ZIP Bundle**: Full offline archival with JSON activity ledger and PNG screenshots.
2. **AI / IDE Prompt (Antigravity Format)**: Markdown prompt embedding local screenshot references using `@ [file;.logs/recorded-bugs/<id>/screenshots/<file_name>.png]`.
3. **Local Machine Persistence**: Direct server-side persistence to `.logs/recorded-bugs/<session_id>/` via loopback HTTP endpoints (`/bug-reports/save-local` and `/bug-reports/local`).
4. **Terminal CLI Command**: Seamless command line inspection (`python -m BE.cli.processing.main errors list --session-id <id> --trace`).

---

## 2. Component Implementation & Endpoints

### 2.1 Backend Route Specification (`BE/routes/bug_reports.py`)
- **Route Aliases**: `@router.post("/save-local")` and `@router.post("/local")`.
- **Payload Schema**:
  ```json
  {
    "session_id": "string (optional, auto-generated if absent)",
    "initialRoute": "string",
    "summary": {
      "title": "string",
      "category": "string (UiGlitch | InspectionFailure | Crash | Hardware)",
      "description": "string",
      "expectedBehavior": "string",
      "actualBehavior": "string"
    },
    "screenshots": [
      {
        "label": "string",
        "dataUrl": "data:image/png;base64,...",
        "timestamp": 123456789
      }
    ],
    "events": []
  }
  ```
- **Filesystem Output**:
  - Metadata: `.logs/recorded-bugs/<session_id>/metadata.json`
  - Screenshots: `.logs/recorded-bugs/<session_id>/screenshots/<label>.png`
  - Prompt: `.logs/recorded-bugs/<session_id>/prompt.md`
- **Response Wire Envelope**:
  ```json
  {
    "Status": { "IsSuccess": true, "Code": 200, "Message": "Saved" },
    "Results": [
      {
        "sessionId": "<id>",
        "savedDir": "D:\\work\\cat-my\\.logs\\recorded-bugs\\<id>",
        "promptFile": "D:\\work\\cat-my\\.logs\\recorded-bugs\\<id>\\prompt.md",
        "screenshotCount": 5,
        "idePrompt": "# Bug Report: ..."
      }
    ]
  }
  ```

### 2.2 Frontend HUD Dropdown (`src/components/recorder/RecorderFloatingHud.tsx`)
- Sleek split-button: `Export` (primary) + `ChevronDown` (dropdown).
- Options:
  - `Export ZIP Bundle`: Triggers `exportSessionToZip(session, summary)`.
  - `Copy Prompt for AI / IDE`: Writes Antigravity Markdown with `@[file;...]` to clipboard.
  - `Save to Local Machine`: Invokes `POST /bug-reports/save-local`.
  - `Copy CLI Command`: Copies `python -m BE.cli.processing.main errors list --session-id <id> --trace`.

### 2.3 Modal Parity (`src/components/recorder/RecorderExportModal.tsx`)
- Fully synchronized actions in review modal.
- `resolveBackendBaseUrl()` guarantees loopback routing without undefined `baseUrl` errors.

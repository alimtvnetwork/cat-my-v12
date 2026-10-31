# Subtask 03: Bug Recorder Dropdown, Antigravity Prompt Formatter & Local Disk Storage

- **Slug**: `run-screen-stability-bug-export-and-roi-pattern-search - Task 03`
- **Owner**: Recorder & CLI Engineer
- **Status**: PENDING

## Objectives
1. Replace the static "Export ZIP" button with a professional dropdown menu:
   - "Export ZIP" (bundle download).
   - "Send / Copy Prompt for IDE / AI" (formats snapshots as local file references matching Antigravity format: `@[file;path/to/snap.png]`).
   - "Save to Local Machine / Disk" (writes snapshots directly to `.logs/recorded-bugs/<id>/` on disk).
   - "Inspect in CLI" (copies CLI command to inspect recorded bugs from terminal).
2. Wire backend endpoint `POST /bug-reports/save-local` to persist snapshots as physical `.png` files.
3. Expose CLI command to view and inspect saved bug sessions with file paths.

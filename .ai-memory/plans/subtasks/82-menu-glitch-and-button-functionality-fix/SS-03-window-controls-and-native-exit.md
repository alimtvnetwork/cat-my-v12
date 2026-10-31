# Subtask 03: Window Controls and Native Exit Automation

- **Slug**: `menu-glitch-and-button-functionality-fix - Task 03`
- **Parent Plan**: `.ai-memory/plans/pending/82-menu-glitch-and-button-functionality-fix.md`
- **Status**: Pending

## Objectives
- In `BE/routes/shutdown.py`:
  - Implement `/window/minimize`, `/window/maximize`, `/window/close` using Windows API (`ctypes.windll.user32`).
  - Send `WM_CLOSE` to the Cat Vision window on `/shutdown` so the window automatically terminates.
- In `src/components/layout/WindowControlButtons.tsx`:
  - Wire minimize, maximize, and exit to loopback endpoints.
  - Eliminate the blocking Alt+F4 modal dialog.

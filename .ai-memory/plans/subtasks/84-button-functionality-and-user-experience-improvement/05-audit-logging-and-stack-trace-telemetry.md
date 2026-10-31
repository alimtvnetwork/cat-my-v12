# Subtask 05: Audit Logging and Stack Trace Telemetry

- **Slug**: `button-functionality-and-user-experience-improvement - Task 05`
- **Owner**: Telemetry & Quality Specialist
- **Status**: PENDING

## Objectives
1. In `src/components/layout/WindowControlButtons.tsx`:
   - Eliminate all silent `.catch(() => {})` blocks.
   - Record complete JavaScript error stack traces into `useErrorStore`.
   - Dispatch structured audit events for every window button interaction.
2. In `BE/routes/shutdown.py`:
   - Log candidate HWNDs, matched PIDs, and Win32 API result codes.
   - On error, format full Python traceback and insert record into Split-DB `system_errors`.

## Target Files
- `src/components/layout/WindowControlButtons.tsx`
- `BE/routes/shutdown.py`

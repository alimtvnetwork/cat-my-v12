# Subtask 06: E2E Verification and Release Push

- **Slug**: `button-functionality-and-user-experience-improvement - Task 06`
- **Owner**: QA & Release Orchestrator
- **Status**: PENDING

## Objectives
1. Run automated test suites:
   - `bun test tests/unit/menu-glitch-and-window-controls.test.ts`
   - `bun test tests/unit/vision-system-all-features.test.ts`
   - `uv run --project BE pytest BE/tests/test_vision_error_management_verification.py -q`
   - `bun x tsc --noEmit`
2. Validate PowerShell syntax and launcher behavior:
   - `powershell -Command "[scriptblock]::Create((Get-Content .\run.ps1 -Raw))"`
3. Execute single atomic commit and push via GitMap:
   - `gitmap cpf "Feature: Window Controls - implement pre-hydration splash screen, reliable Win32 window controls, and audit stack trace telemetry"`

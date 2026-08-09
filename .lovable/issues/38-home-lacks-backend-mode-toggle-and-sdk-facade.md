# Issue 38: Home lacks Seed/Backend mode toggle and there is no SDK facade / BE folder

Status: open
Reported: 2026-07-21

## Symptom

- Homepage only shows seeded UI values. No way to switch to a real backend.
- No Settings surface to change backend base URL.
- No `BE/` backend project. No `sdk/` folder. No `run.ps1` / `run.sh` launcher.
- No facade layer between app code and the (future) camera SDK.
- Error management (spec/03-error-manage) is not yet wired across a real backend boundary.

## Expected

- Home + Settings: `Mode = Seed | Backend` toggle; when Backend, user only sets base URL prefix.
- Backend endpoints and routing are cemented in code (typed client), user does not configure them.
- `BE/` backend project scaffolded per `spec/21-app` + coding + error-manage guidelines.
- `sdk/` raw drop folder + `sdk-facade` on both sides before any direct SDK call.
- `run.ps1` and `run.sh` boot backend + frontend (Chromium extension shell) together.
- Full Mermaid system-flow diagrams before implementation.

## Related

- Command: `.lovable/spec/commands/40-backend-mode-toggle-and-sdk-facade.md`
- Spec request: `spec/21-app/backend-implementation-request-v1.md`
- Plan: `.lovable/plans/pending/88-backend-implementation-v1-150-steps.md`

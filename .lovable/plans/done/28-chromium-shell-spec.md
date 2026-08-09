# Chromium Shell Spec (spec/21-app) - Blind-AI-Ready

Slug: chromium-shell-spec
Steps: 50
Status: completed
Created: 2026-07-14
Closed: 2026-07-14
Rescore: 100/100 (all 50 steps landed: chapters 00-25, nine Mermaid diagrams, cross-links, linter clean, stale pending cleanup)

## Context

Define the desktop Chromium-embed shell for the Vision Inspection App inside `spec/21-app/`, resolving open question AI-01 (`CEF | Tauri | Electron`) currently marked TBD in `spec/21-app/10-app-overview.md:29`, `spec/21-app/11-system-context.md:22`, and `spec/21-app/03-glossary.md:23`. The shell wraps the Next.js/HTML/CSS UI and hosts the Python backend in a single distributable, with IPC bridging every UI action to a backend endpoint or in-process method. Deliverable is a documentation set (not code) written so a blind AI can implement it end-to-end: overview, decision record, IPC contract, packaging, lifecycle, security, self-update binding, and a `diagrams/` folder of Mermaid `.mmd` files. Ties into `spec/14-update/` (self-update) and `spec/21-app/62-v2-execution-order.md`.

Related:

- Issue: `.lovable/issues/01-spec-21-blind-ai-readiness.md`
- Existing pending plan pulled forward: `.lovable/plans/pending/27-plan-20.md` (duplicate of completed; see step 50)
- Command reference: `.lovable/spec/commands/01-blind-ai-audit-conventions.md`, `.lovable/spec/commands/01-plan-50-workflow.md`

New target folder: `spec/21-app/shell/` with subfolder `spec/21-app/shell/diagrams/`.

## Steps

1. Read `spec/21-app/10-app-overview.md`, `11-system-context.md`, `03-glossary.md`, `04-overview.md`, `62-v2-execution-order.md` and list every existing reference to the shell / CEF / Tauri / Electron / packaging into a working notes buffer.
2. Read `spec/14-update/` index and enumerate the update-feed URL, signature key, migration hook order, and restart contract that the shell must honor.
3. Read `.lovable/memory/08-vision-inspection-app.md` and `.lovable/spec/commands/01-blind-ai-audit-conventions.md` to lock naming, error-code, and audit conventions the shell doc must follow.
4. Read `spec/03-error-manage/` in full and record every rule (log shape, `E_*` / `I_*` codes, retry semantics) the shell doc must apply to IPC failures.
5. Read `spec/coding-guidelines/python.md` and `spec/coding-guidelines/typescript.md` and record constraints binding on shell bootstrap code and IPC bindings.
6. Create the target folders: `spec/21-app/shell/` and `spec/21-app/shell/diagrams/` (empty `.gitkeep` allowed) — documented only; no code.
7. Draft `spec/21-app/shell/00-overview.md`: purpose, scope, non-goals, glossary delta, and a one-paragraph plain-language description of what the Chromium Shell is and is not. See `./subtasks/28-chromium-shell-spec/ss-01-overview-outline.md`.
8. Draft `spec/21-app/shell/01-adr-shell-choice.md` (ADR-AI-01): compare CEF vs Tauri vs Electron vs pywebview across binary size, Python coupling, code signing, auto-update, IPC ergonomics, licensing; declare the chosen shell with rationale and reversal cost. See `./subtasks/28-chromium-shell-spec/ss-02-adr-shell-choice.md`.
9. Draft `spec/21-app/shell/02-runtime-architecture.md`: process model (shell process, Python worker, UI renderer), threads, lifetimes, ownership of ports/pipes, crash boundaries.
10. Draft `spec/21-app/shell/03-boot-lifecycle.md`: cold start sequence, splash, migration hook order (align with `spec/14-update/`), health gate, ready-state signal, first-run vs upgrade paths, shutdown order.
11. Draft `spec/21-app/shell/04-ipc-contract.md` (canonical): transport (loopback HTTP+WS or stdio-JSON-RPC), envelope schema, correlation IDs (ULID), timeouts, backpressure, error envelope shape. See `./subtasks/28-chromium-shell-spec/ss-03-ipc-envelope.md`.
12. Draft `spec/21-app/shell/05-ui-to-backend-map.md`: exhaustive table mapping every UI surface (routes under `src/routes/*`, HMI components under `src/components/hmi/*`, ops tiles under `src/components/ops/*`) to backend endpoint or in-process method. See `./subtasks/28-chromium-shell-spec/ss-04-ui-backend-map.md`.
13. Enumerate each UI route file listed in the codebase index (index, run, results, errors, settings._, setup._, ops) and record its intended backend calls with request/response schemas, RLS/auth expectations, and error codes.
14. Enumerate each HMI component (ActionBar, ConfigPanel, Counter, DeviceDiscoveryPanel, FeatureGate, GlobalNav, HmiShell, MachineFrame, ModeHeader, RoiOverlay, StatusLog, StepsWindow, Titlebar, ToolRibbon, Viewport) and list emitted events → backend method.
15. Draft `spec/21-app/shell/06-security-model.md`: sandbox, `contextIsolation`/equivalent, disabled Node in renderer, CSP, origin locking to `app://` scheme, secret storage (OS keychain), token scoping for local Supabase publishable key.
16. Draft `spec/21-app/shell/07-permissions-and-consent.md`: camera, filesystem, network egress prompts; tie into existing `tests/contract/test_consent.py` and consent lifecycle.
17. Draft `spec/21-app/shell/08-updates-binding.md`: bind to `spec/14-update/` — feed URL, signature verification, download-verify-apply-restart, rollback, migration ordering, offline behavior.
18. Draft `spec/21-app/shell/09-packaging.md`: build pipeline (Vite build → shell bundler → PyInstaller/Nuitka worker → single installer), per-OS artifacts (Windows `.msi`/`.exe`, macOS `.dmg` signed+notarized, Linux `.AppImage`/`.deb`), reproducibility, artifact naming aligned with `spec/16-generic-release/`.
19. Draft `spec/21-app/shell/10-code-signing.md`: Windows Authenticode, macOS Developer ID + notarization, Linux GPG detached signatures; key custody and CI secret names.
20. Draft `spec/21-app/shell/11-observability.md`: log sinks (renderer console → file, worker stdout → file, ring buffer), crash dumps, `I_*` breadcrumbs on boot/quit, metrics counters exposed to ops panel.
21. Draft `spec/21-app/shell/12-error-taxonomy.md`: enumerate shell-scope error codes (`E_SHELL_BOOT_FAILED`, `E_SHELL_IPC_TIMEOUT`, `E_SHELL_WORKER_CRASH`, `E_SHELL_UPDATE_FAILED`, `I_SHELL_READY`, `I_SHELL_UPGRADED`) with severity, actor, remediation, per `spec/03-error-manage/`.
22. Draft `spec/21-app/shell/13-feature-flags.md`: how the shell surfaces feature-gate state to the UI and negotiates with the license verifier.
23. Draft `spec/21-app/shell/14-file-layout.md`: on-disk layout of installed app (bin, resources, data dir, log dir, config, cache) per OS, with the exact platform paths.
24. Draft `spec/21-app/shell/15-data-migration.md`: SQLite migration ordering under `app/core/io/migrations/` on upgrade, and rollback strategy on failed migration.
25. Draft `spec/21-app/shell/16-offline-behavior.md`: what works fully offline, degraded modes, queued audit events, resync-on-reconnect.
26. Draft `spec/21-app/shell/17-accessibility.md`: keyboard navigation across renderer, focus rings, screen-reader labels, high-contrast theme handoff.
27. Draft `spec/21-app/shell/18-i18n.md`: locale resolution, bundle loading, right-to-left support.
28. Draft `spec/21-app/shell/19-testing-strategy.md`: unit (IPC codec), integration (spawn worker + issue calls), e2e (Playwright driving the shell), smoke on each OS in CI, coverage bar.
29. Draft `spec/21-app/shell/20-perf-budget.md`: cold-start budget, warm-start, IPC round-trip P50/P95, memory ceiling, crash-rate SLO.
30. Draft `spec/21-app/shell/21-supply-chain.md`: SBOM generation, dependency pinning, vendored binaries policy, license inventory.
31. Draft `spec/21-app/shell/22-uninstall.md`: full uninstall including data-dir prompt, keychain purge, scheduled-task removal.
32. Draft `spec/21-app/shell/23-implementation-checklist.md`: ordered, blind-AI action checklist (repo scaffolding → IPC → boot → package → sign → ship) with acceptance criteria per row. See `./subtasks/28-chromium-shell-spec/ss-05-implementation-checklist.md`.
33. Write `spec/21-app/shell/diagrams/01-context.mmd` (Mermaid C4-style context: User → Shell → Worker → Supabase / Local DB / Hardware).
34. Write `spec/21-app/shell/diagrams/02-process-model.mmd` (Mermaid flowchart: shell process, renderer, worker, supervisor).
35. Write `spec/21-app/shell/diagrams/03-boot-sequence.mmd` (Mermaid sequenceDiagram: boot to ready).
36. Write `spec/21-app/shell/diagrams/04-ipc-request.mmd` (Mermaid sequenceDiagram: UI call → IPC → worker → response, including error path).
37. Write `spec/21-app/shell/diagrams/05-update-flow.mmd` (Mermaid sequenceDiagram: check → download → verify → migrate → restart, tied to `spec/14-update/`).
38. Write `spec/21-app/shell/diagrams/06-crash-recovery.mmd` (Mermaid stateDiagram: healthy → worker-crash → respawn → degraded → healthy).
39. Write `spec/21-app/shell/diagrams/07-permissions.mmd` (Mermaid flowchart: consent prompts and persisted grants).
40. Write `spec/21-app/shell/diagrams/08-packaging-pipeline.mmd` (Mermaid flowchart: source → build → sign → notarize → publish feed).
41. Write `spec/21-app/shell/diagrams/09-ui-to-backend-map.mmd` (Mermaid flowchart grouping UI routes/components → backend methods, mirroring step 12 table).
42. Write `spec/21-app/shell/diagrams/readme.md` indexing each `.mmd` file with a one-line description and how to render.
43. Cross-link: update `spec/21-app/10-app-overview.md`, `11-system-context.md`, `03-glossary.md` to reference `spec/21-app/shell/` and mark AI-01 resolved (documentation-only edit — no code paths).
44. Cross-link: update `spec/21-app/62-v2-execution-order.md` to include shell milestones in the execution order.
45. Add `spec/21-app/shell/24-open-questions.md` capturing residual unknowns (e.g. Linux packaging target, notarization vendor, telemetry opt-in default) with owners and due dates.
46. Add `spec/21-app/shell/25-glossary.md` defining Shell, Renderer, Worker, IPC, Feed, Bundle, Migration Hook, so terminology is unambiguous for a blind AI.
47. Run `linter-scripts/check-spec-folder-refs.py` and `linter-scripts/check-forbidden-spec-paths.sh` mentally against the new files; record any allowlist entries needed in the plan's Verification section (do not edit allowlists yet).
48. Update `.lovable/memory/06-spec-map.md` to add the new `spec/21-app/shell/` subtree.
49. Update `.lovable/memory/v2/01-ranked-backlog.md` marking the packaging + self-update-binding gaps as covered by this plan.
50. Reconcile plans folder: `27-plan-20.md` currently exists in both `pending/` and `done/`. Remove the stale `pending/27-plan-20.md` in a follow-up execution turn; note the discrepancy here so the executor performs a single `mv`-equivalent cleanup.

## Verification

- Every file listed under `spec/21-app/shell/` exists after execution and contains the sections named in its step.
- `spec/21-app/shell/diagrams/` contains nine `.mmd` files plus `readme.md`; each renders without Mermaid lexer errors (spot-check via `mmdc` locally or Lovable Mermaid artifact preview).
- `rg -n "AI-01"` shows resolution notes in `10-app-overview.md`, `11-system-context.md`, `03-glossary.md`.
- `rg -n "spec/21-app/shell"` returns hits from `62-v2-execution-order.md`, `.lovable/memory/06-spec-map.md`, `.lovable/memory/v2/01-ranked-backlog.md`.
- UI→backend map (`05-ui-to-backend-map.md`) covers 100% of files under `src/routes/*` and `src/components/hmi/*`; a grep script confirms no orphans.
- `linter-scripts/check-spec-folder-refs.py` passes; any needed allowlist entry is documented.
- `.lovable/plans/pending/27-plan-20.md` is gone after cleanup; `completed/27-plan-20.md` retained.

## Appended from prior pending tasks

- `27-plan-20.md` (audit retention rotation) — previously reported completed but a stale copy remained under `pending/`. Cleanup captured as Step 50; no functional work left.
- Packaging shell gap and self-update binding gap flagged in `.lovable/prompts/295-next-task.md` — fully absorbed into this plan (Steps 8, 17, 18, 19, 40).

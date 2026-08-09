---
Slug: implementation-checklist
Parent: 28-chromium-shell-spec
Status: pending
Created: 2026-07-14
---

# SS-05 — Blind-AI implementation checklist

Produce `spec/21-app/shell/23-implementation-checklist.md`. Ordered, each row has: id, action, files touched, acceptance test, rollback.

Phases:

1. Scaffold — create shell repo skeleton per chosen ADR (Tauri or fallback).
2. IPC codec — implement envelope, timeouts, cid dedupe; unit tests.
3. Worker spawn — supervised child process with restart-on-crash, health probe.
4. Renderer preload — inject `{port, token}`; enforce origin lock.
5. Method registry — wire every UI→backend row from `05-ui-to-backend-map.md`; contract tests per row.
6. Boot lifecycle — splash, migrations, ready gate.
7. Observability — log sinks, crash dumps, audit breadcrumbs.
8. Permissions — camera, filesystem, network egress prompts.
9. Feature flags + license — wire `useLicenseFeatures` handoff.
10. Packaging — per-OS artifacts, reproducibility.
11. Signing + notarization — Windows, macOS, Linux.
12. Self-update — bind to `spec/14-update/`; simulate upgrade + rollback.
13. E2E — Playwright driving the shell against local worker.
14. Perf gates — cold start, IPC RTT budgets.
15. Release — SBOM, changelog, feed publish.

Each row must have an explicit acceptance test (command or observable state) and a rollback step. No row may be marked done without evidence artifact (log, screenshot, or test report path).

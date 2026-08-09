---
Slug: overview-outline
Parent: 28-chromium-shell-spec
Status: pending
Created: 2026-07-14
---

# SS-01 — Overview outline for `spec/21-app/shell/00-overview.md`

Sections the overview must contain, in order:

1. Purpose — one paragraph: the shell packages the React/HTML/CSS UI + Python worker into a single desktop distributable with a Chromium renderer.
2. Scope — what is inside the shell repo, what stays in the app repo.
3. Non-goals — no mobile, no browser-extension delivery, no server-hosted mode in this doc set.
4. Audience — blind AI implementers, release engineers, QA.
5. Success criteria — installable artifact per OS, first-paint under budget, IPC round-trip under budget, signed + notarized where applicable, self-update proven end-to-end.
6. High-level diagram reference → `./diagrams/01-context.mmd` and `./diagrams/02-process-model.mmd`.
7. Reading order — pointer to ADR (01), then IPC (04), then packaging (09), then checklist (23).
8. Change log stub.

Deliverable: a single Markdown file no longer than 200 lines, with anchors matching the section titles above.

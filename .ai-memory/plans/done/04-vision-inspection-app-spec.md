---
Title: Vision Inspection Automation — Spec Authoring (No Code)
Slug: vision-inspection-app-spec
Source: 02-spec/21-app/01-initial-instructions.md
Command: .ai-memory/02-spec/commands/01-plan-50-workflow.md
Status: Complete
Version-Bump: 0.39.0
Scope: SPEC ONLY. No backend code. No UI code. Writes only under 02-spec/21-app/, 02-spec/22-app-issues/, conversation/, and .ai-memory/**.
---

# Vision Inspection Automation — Spec Authoring Plan (50 steps)

Rules (from command 01-plan-50-workflow):

- 50 steps exactly.
- Do NOT execute this turn — the user will say `next` to advance.
- One task = one file. Depth (>3 lines / multi-file) spins out `.ai-memory/plans/subtasks/04-vision-inspection-app-spec/SS-*.md`.
- Coding-guideline reads are mandatory before any DB or model shape decision (folders 04, 05, 06, 07 under `02-spec/`).
- Backend code is FORBIDDEN in this plan (Acceptance #7 of source file).

Domain glossary (locked from source file, do not rename):
Job → Task → Image → Region (shape) → Rule → Judgment → Result. Root DB knows all Tasks. Task DB holds rules + results. Rules DB is override-layered per Split-DB spec (folder 05).

---

## Phase A — Read & Ground Truth (Steps 1–8)

1. Re-read `02-spec/21-app/01-initial-instructions.md` in full and extract every noun/verb into `02-spec/21-app/00-glossary.md` (Job, Task, Image, Region, Rule, Judgment, Worker, Root DB, Task DB, Rules DB, SDK Capture, AI Validation).
2. Read `.ai-memory/coding-guidelines.md` + `.ai-memory/what-to-read.md` (if present) and record Boolean/Enum/Error-Manage rules into `02-spec/21-app/00-authoring-rules.md`.
3. Read `02-spec/04-database-conventions/**` and summarize into `02-spec/21-app/02-db-conventions-digest.md` (naming, PascalCase, GRANT policy note is Postgres-only — SQLite here uses tables + RLS N/A).
4. Read `02-spec/05-split-db-architecture/**` → `02-spec/21-app/03-split-db-digest.md`. Confirm override-layer order for `rules.db` (base → task overrides).
5. Read `02-spec/06-seedable-config-architecture/**` → `02-spec/21-app/04-seedable-config-digest.md`. Locate where worker-count, batch-size, tolerance defaults live.
6. Read `.ai-memory/memory/07-lovable-folder-guide.md` + `02-spec/01-spec-authoring-guide/07-memory-folder-guide.md` → confirm the `02-spec/21-app` folder layout matches required-files rules (00-overview, 97-acceptance, 98-changelog, 99-consistency-report).
7. Inventory `assets/tools-images/*` and produce `02-spec/21-app/05-image-index.md` — map each renumbered image (01–50) to the referenced feature the user calls out ("image 34", "image 35/36", "image 24/25").
8. Open `02-spec/22-app-issues/00-overview.md` and reserve an issues log; record unresolved ambiguities as `02-spec/22-app-issues/XX-<slug>.md` as they surface in later steps.

## Phase B — Architecture Overview (Steps 9–16)

9. Write `02-spec/21-app/00-overview.md`: scope, non-goals, stack (Python backend + React/Tailwind + Chromium-embed shell), UI-only in this pass.
10. Write `02-spec/21-app/10-system-context.md` with a Mermaid `flowchart` showing Operator ↔ Chromium Shell ↔ React UI ↔ Local Python Backend ↔ SDK ↔ Worker Pool ↔ Split DBs ↔ (future) AI Cloud.
11. Write `02-spec/21-app/11-runtime-processes.md`: main backend process, SDK capture process, worker pool, UI process — with lifecycle + who spawns whom.
12. Write `02-spec/21-app/12-shared-codebase.md`: shared Python package consumed by backend + workers + CLIs; forbid duplicated rule logic.
13. Write `02-spec/21-app/13-worker-pattern.md`: configurable `WorkerCount` (default TBD) × `BatchSize` (default TBD, per-worker parallel images 3–N), input = pending image path, output = result row + JSON + SQLite write.
14. Write `02-spec/21-app/14-capture-pipeline.md`: SDK worker saves to `pending/` at up to 77 fps; naming = zero-padded sequence; atomic rename from `.part` → final.
15. Write `02-spec/21-app/15-processing-pipeline.md`: dispatcher picks from `pending/`, hands to workers, moves to `processed/` on completion; failure → `failed/` with reason.
16. Write `02-spec/21-app/16-parallelism-guarantees.md`: capture and processing run concurrently; back-pressure rules; no image blocks the next.

## Phase C — Data & Storage (Steps 17–24)

17. Write `02-spec/21-app/20-folder-structure.md` — canonical tree: `backend/db/root.db`, `backend/db/tasks/<TaskId>/{task.db, rules.db, results.json, images/pending, images/processed, images/failed}`.
18. Write `02-spec/21-app/21-root-db.md`: schema for `Task`, `Job`, `WorkerRun`, `AppSetting`; Mermaid ER diagram; PascalCase columns.
19. Write `02-spec/21-app/22-task-db.md`: schema for `Image`, `Region`, `Rule`, `Judgment`, `Result`; Mermaid ER.
20. Write `02-spec/21-app/23-rules-db-overrides.md`: base rules vs per-task overrides using the Split-DB layering (folder 05); resolution order documented.
21. Write `02-spec/21-app/24-results-json.md`: exact JSON shape written per image + per task summary; example payload.
22. Write `02-spec/21-app/25-file-naming.md`: `TaskId` format, image sequence format, temp `.part` convention, cross-platform (Windows + Linux) safe names.
23. Write `02-spec/21-app/26-migrations.md`: versioned migrations per DB file; `SchemaVersion` table; forward-only.
24. Write `02-spec/21-app/27-config-surface.md`: which knobs live in Seedable-Config vs Task overrides vs runtime UI (worker count, batch size, tolerance defaults, save-format).

## Phase D — UI / UX Specification (Steps 25–36)

25. Write `02-spec/21-app/30-ui-overview.md`: top-level screens — Home/Jobs, Rule Setup, Live Capture, Run Monitor, Results, Settings, AI Review (stub).
26. Write `02-spec/21-app/31-rule-setup-screen.md`: image canvas + shape toolbar (rectangle, ellipse, polygon, freeform) + rule builder panel + tolerance sliders + JSON preview. Reference images 34–36.
27. Write `02-spec/21-app/32-shape-model.md`: geometry types, coordinate system (image-space, integer px), grouped shapes (parent/child), XY-linked with bounds + match %.
28. Subtask: shape drag/resize/rotate interactions → `.ai-memory/plans/subtasks/04-vision-inspection-app-spec/ss-01-shape-interactions.md`.
29. Write `02-spec/21-app/33-rule-catalog.md`: presence/absence, flaw, count, OCR text validate, graphic-display check, math ops — each with inputs, params, outputs, PASS/FAIL semantics. Reference image 24/25.
30. Write `02-spec/21-app/34-tolerance-model.md`: numeric tolerance ranges, XY grouped bounds, per-rule match-% threshold; how tolerance surfaces in the UI.
31. Write `02-spec/21-app/35-zoom-and-pan.md`: fit-to-viewport, 100 % pixel, wheel-zoom, layout stability (canvas never reflows sibling panels).
32. Write `02-spec/21-app/36-json-instruction-output.md`: canonical JSON produced by the Rule Setup screen — the single source of truth consumed by workers.
33. Write `02-spec/21-app/37-run-monitor-screen.md`: live counters (Captured / Queued / Processed / OK / NG), throughput fps, worker health strip, cancel/pause.
34. Write `02-spec/21-app/38-results-screen.md`: filter by OK/NG, per-image drill-in with rule breakdown, export CSV/JSON.
35. Write `02-spec/21-app/39-settings-screen.md`: worker count, batch size, save paths, capture device selection.
36. Subtask: keyboard shortcuts + accessibility → `.ai-memory/plans/subtasks/04-vision-inspection-app-spec/SS-02-keyboard-a11y.md`.

## Phase E — Cross-Cutting (Steps 37–43)

37. Write `02-spec/21-app/40-error-manage.md`: adopt 3-tier error architecture from `.ai-memory/memory/03-error-manage.md`; every rule failure carries a code + machine reason + human message.
38. Write `02-spec/21-app/41-logging.md`: structured logs per Task (`task.log`), per Worker (`worker-<n>.log`); rotation policy TBD.
39. Write `02-spec/21-app/42-observability.md`: metrics we care about (capture fps, processing fps, queue depth, worker CPU); local dashboard placeholder only.
40. Write `02-spec/21-app/43-ai-validation-stub.md`: mark **To Be Defined later**; input contract (image + failed-rule context), output contract (isTrueNG/isFakeNG/confidence) — no vendor lock-in.
41. Write `02-spec/21-app/44-security-privacy.md`: local-first, no image upload without operator consent, image redaction hooks for the AI path.
42. Write `02-spec/21-app/45-testing-strategy.md`: unit (rule engine), contract (JSON instruction ↔ worker), E2E (Playwright over Chromium shell), performance (77 fps capture sustained).
43. Write `02-spec/21-app/46-open-questions.md`: consolidate every "TBD" and every question raised — link each to a `02-spec/22-app-issues/` entry.

## Phase F — Governance & Close-Out (Steps 44–50)

44. Write `02-spec/21-app/97-acceptance-criteria.md` verbatim from the source file's 7-point list (§Acceptance Criteria) + add "no backend code produced" gate.
45. Write `02-spec/21-app/98-changelog.md` starting at v0.1.0 = "Initial spec drop".
46. Write `02-spec/21-app/99-consistency-report.md`: cross-check that every referenced folder (04/05/06/07) is cited and every image number the user mentioned appears in `05-image-index.md`.
47. Create `conversation/04-vision-inspection-app/01-initial-instruction-intake.md` capturing the verbatim source, decisions taken, and questions asked — index in `conversation/index.md`.
48. Update `.ai-memory/memory/index.md` with a new entry `[Vision Inspection app spec](mem://feature/vision-inspection-app)` and write that memory file summarizing worker pattern + split-DB layout + UI screens.
49. Move this plan to `.ai-memory/plans/done/04-vision-inspection-app-spec.md` and flip `Status: Complete`.
50. Bump repo to **v0.39.0** — update `readme.md` header, prepend to `changelog.md`, prepend to `release_notes.md` (theme: "Vision inspection app — spec authoring initiated"). Register the trigger prompt `01-prompts/38-initial-instructions.md` in `.ai-memory/prompt.md`.

---

## Open questions to raise with the user BEFORE Phase B starts

Q1. **Shell tech** — Python + CEF vs Tauri (Rust shell hosting the React UI) vs Electron. You mentioned CEF may exist for Python; happy to lock that, or should the spec keep it "Chromium-embed, shell TBD"?
Q2. **AI provider** — do we assume Lovable AI Gateway for the AI-validation path, or leave provider-agnostic?
Q3. **Default WorkerCount / BatchSize** — pick sane defaults (e.g. 8 workers × 3 images) or leave both as "operator-configurable, no default"?
Q4. **Region shapes** — freeform polygon is in scope for v1, or v1 = rectangle + ellipse only, polygon in v2?
Q5. **Rules DB overrides** — do overrides cascade per-Job as well as per-Task, or only per-Task?

None of these block writing the plan; they gate Phase B/C content.

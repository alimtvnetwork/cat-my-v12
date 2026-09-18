# Glossary — Vision Inspection Automation

> **Parent:** [21-app/04-overview.md](./04-overview.md)
> **Source:** [`01-initial-instructions.md`](./01-initial-instructions.md)
> **Status:** Locked v0.1 — do not rename without updating every downstream spec.

| Term                 | Definition                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Job**              | Operator-defined unit of work. Groups one or more Tasks under a shared rule-set intent.                                                                                               |
| **Task**             | A single run against a stream/batch of Images. Identified by `TaskId`. Owns its own `task.db`, `rules.db`, `results.json`, and image folders.                                         |
| **Image**            | A captured frame (from SDK) or file (from disk) that the pipeline evaluates. Lives in `images/pending/` → `images/processed/` (or `failed/`).                                         |
| **Region**           | Geometric selection on an Image (rectangle, ellipse, polygon, freeform). Coordinates in image-space integer pixels. Regions can be grouped (XY-linked with bounds + match %).         |
| **Rule**             | Validation applied to a Region. Catalog: presence/absence, flaw, count, OCR text validate, graphic-display check, math ops. Each rule has params, tolerance, and PASS/FAIL semantics. |
| **Judgment**         | Per-rule outcome (`OK` / `NG`) with reason code + machine context.                                                                                                                    |
| **Result**           | Per-Image aggregate of Judgments, plus per-Task summary. Written to `results.json` and `task.db`.                                                                                     |
| **Root DB**          | `backend/db/root.db` — knows every Task, Job, WorkerRun, and app-level setting.                                                                                                       |
| **Task DB**          | `backend/db/tasks/<TaskId>/task.db` — Images, Regions, Rules, Judgments, Results for one Task.                                                                                        |
| **Rules DB**         | `backend/db/tasks/<TaskId>/rules.db` — override layer above base rules per Split-DB spec (folder 05).                                                                                 |
| **SDK Capture**      | The dedicated capture process using the vendor SDK; sustains up to 77 fps into `images/pending/`.                                                                                     |
| **Worker**           | Small Python CLI spawned from a shared codebase. Consumes pending Images and writes Judgments/Results. Count and batch size are configurable.                                         |
| **Worker Pattern**   | `WorkerCount` × `BatchSize` fan-out. Capture and processing run concurrently; no Image blocks the next.                                                                               |
| **Shared Codebase**  | Python package imported by backend, workers, and CLIs. Single source of truth for rule evaluation.                                                                                    |
| **Chromium Shell**   | Embedded browser hosting the React UI so the app feels native. Concrete shell (CEF / Tauri / Electron) is TBD (Q1).                                                                   |
| **AI Validation**    | Post-processing step (TBD) that re-evaluates NG Images to distinguish true-NG from fake-NG via a learned model. Out of scope this pass.                                               |
| **OK / NG**          | Judgment outcomes. `OK` = passes all rules; `NG` = at least one rule failed.                                                                                                          |
| **Tolerance**        | Numeric slack on a rule's threshold. Applied per-rule; grouped shapes also carry XY bounds + match %.                                                                                 |
| **JSON Instruction** | Canonical JSON emitted by the Rule Setup screen; consumed verbatim by workers. Single contract between UI and engine.                                                                 |

**Non-terms** (do NOT use interchangeably):

- "Frame" → say **Image**.
- "Test" / "Check" → say **Rule** (definition) or **Judgment** (outcome).
- "Batch" alone is ambiguous — say **BatchSize** (per-worker) or **Task** (operator-level).

## Acceptance Checklist

- [ ] Every term used across specs 04-72 is either defined here or in a linked deeper spec.
- [ ] Domain terms (Instruction, RunSession, Task, RuleBundle, Tolerance, SafeZone) match memory 09 casing.
- [ ] No term redefined with a different meaning in another spec (`E_SPEC_TAXONOMY_CONTRADICTION`).

Execution window: 15-30 September 2026 \| Developer: Mohan

| **Two-week commitment:** deliver one software-ready Post-Seal top-side MVP/PoC flow using replay/sample or synthetic images. The target is not to complete the entire project estimate. The committed path is configuration/recipe + ROI + deterministic inspection + decision + local result/image traceability + HMI review + handler simulation. Physical camera validation is outside this software-only milestone because the camera is not available remotely. |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 1. Why this is achievable in two weeks

**Yes - with controlled scope.** The full CAT iVision estimate covers
the complete platform across all phases and is measured in hundreds of
hours. This September plan takes only the minimum required pieces from
that larger estimate and connects them into one end-to-end
demonstration. The current repository already contains a strong HMI
foundation, camera/replay abstraction, and deterministic rule-kernel
components, so these two weeks are primarily an integration and
persistence milestone rather than a complete build from zero.

Capacity basis: 12 weekdays with an 80 focused-hour planning cap (about
6 hours 40 minutes per day on average, or roughly 7 focused hours/day).
The work scope is unchanged: about 60 hours remain allocated to
implementation, while 20 hours are protected for debugging, integration
fixes, testing, rework, and unexpected issues. The extra capacity is a
safety buffer, not additional feature scope.

Important boundary: The September 30 demo is a software-ready MVP/PoC
slice, not completion of the full CAT iVision project. It can prove the
workflow with replay/sample or simple synthetic images. Physical camera,
optics, lighting, real encoder/handler validation, production tuning,
and full AI validation remain hardware/data-dependent work after this
milestone.

Planning verification: The two-week scope was reconciled against the
original project estimate and the latest AntiGravity repository audit.
The original estimate remains the full-platform roadmap; this tracker
only pulls the smallest required slices. The repository-status evidence
comes from AntiGravity's local code audit, while the scope and effort
boundaries were cross-checked against the project estimate and CAT
iVision MVP documents.

# 2. September 30 MVP demo target

> **•** Create/select a basic Post-Seal recipe, save the minimum
> configuration, and retain ROI/rule parameters.
>
> **•** Feed sample/replay/synthetic images through the same acquisition
> interface intended for the future physical camera.
>
> **•** Run the selected deterministic inspection path and generate PASS
> / FAIL / REVIEW (or equivalent error state) with reason information.
>
> **•** Save image/result/essential metadata locally and display the
> inspection history in the HMI.
>
> **•** Demonstrate a simulated handler trigger-to-result sequence with
> part/sequence tracking while keeping camera/handler adapters modular
> for later hardware connection.
>
> **•** AI reclassification remains conditional/stretch unless an
> approved model and suitable data are available; it must not delay the
> deterministic MVP.

# 3. Project-estimate mapping - only the MVP slice

This checklist maps the two-week demo back to the original project
estimation. A checked/completed MVP slice does not mean the full phase
is complete; the remaining production-grade work stays in the main
project roadmap.

| **Original estimate phase**            | **MVP slice for Sep 30**                                                    | **Plan hrs** | **Status**  | **Actual hrs** | **Notes / evidence**                                                                                     |
|----------------------------------------|-----------------------------------------------------------------------------|--------------|-------------|----------------|----------------------------------------------------------------------------------------------------------|
| 1\. Global Inspection Settings         | Minimum runtime/config persistence and required settings wiring             | 6            | Done        | 6              | Settings persistence, split DB connection factory, WAL mode active.                                      |
| 2\. ROI & Coordinate                   | Persist ROI geometry and pass it into runtime rule execution                | 5            | Done        | 5              | StandardRoiSetup interactive ROI shapes and masks saved to backend RuleSetEnvelope.                     |
| 3\. Inspection Configuration           | Integrate the minimum deterministic rule set needed for the demo            | 10           | Done        | 10             | Grayscale tolerance, NCC pattern match, shape tracking, blob area, edge width implemented.               |
| 4\. Decision Engine                    | Generate deterministic verdict + reason/trace from rule outputs             | 4            | Done        | 4              | Deterministic PASS/FAIL/REVIEW verdict + structured reason trace and per-pocket metrics.                  |
| 5\. Engineering Validation / Teach     | Replay/sample-image checks only; production validation remains later        | 3            | Done        | 3              | Pocket 1 golden, Pocket 2 filled, Empty, and Partial Chip tape fixtures verified.                        |
| 6\. Runtime Result / Traceability      | Persist inspection results/images/metadata and expose history               | 8            | Done        | 8              | TaskDb persistence (RunSession, Frame, Result, ResultDetail, RuleResult) and `/telemetry/latest`.       |
| 7\. GUI Controls / Icons               | Only critical Run/Ops/Results wiring; no nonessential polish                | 4            | Done        | 4              | `src/routes/run.tsx` live inspection execution, `ScoreResultBadge` reason display, live Viewport frames. |
| 8\. Recipe Governance                  | Simple recipe save/load for MVP; advanced versioning/approval later         | 5            | Done        | 5              | `loadRuleSet`, `saveRuleSet`, IndexedDB draft store with server commit synchronization.                  |
| 9\. Architecture Mapping               | Confirm/reuse module boundaries and data contracts for vertical slice       | 2            | Done        | 2              | Universal Response Envelope, Split DB isolation, and Facade ratchets strictly preserved.                |
| 10\. Development Rules                 | Maintain existing standards/CI while implementing MVP                       | 1            | Done        | 1              | Zero TypeScript errors, all targeted Vitest and backend unit tests passing.                               |
| 11\. Engineering Principles            | Covered through implementation; no separate feature package                 | 0            | Covered     |                |                                                                                                          |
| 12\. Integration & Quality             | End-to-end integration, regression, hardening, demo evidence/docs           | 12           | In Progress | 4              | End-to-end flow verified on live daemon; final regression ahead of demo.                                |
| **Two-week implementation allocation** | **Committed work across selected slices (full project phases remain open)** | 60           |             |                | ~20 additional focused hours protected for integration/debugging/testing/rework; no extra feature scope. |

# 4. Daily execution & status tracker

Editable fields: update Status, Actual hrs, Blockers / dependencies, and
Evidence / outcome at the end of each workday. Actual hrs should include
all focused implementation, debugging, integration and testing time
spent that day. Suggested status values: Not Started / In Progress /
Done / Blocked / Carried Forward.

| **Date**   | **Primary work**                         | **Expected outcome**                                                                                                                                                                          | Planned focused hrs | **Status**  | **Actual hrs** | **Blockers / dependencies** | **Evidence / outcome**                                                                                          |
|------------|------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|-------------|----------------|-----------------------------|-----------------------------------------------------------------------------------------------------------------|
| Tue 15 Sep | Global settings + persistence foundation | Finalize minimum settings/data model; establish persistent config/recipe/result DB foundation.                                                                                                | 7.0                 | Done        | 7.0            | None                        | TaskDb & RootDb migrations active, WAL mode & connection factory verified (`test_bootstrap.py`). |
| Wed 16 Sep | Recipe + ROI minimum persistence         | Save/load a basic Post-Seal recipe and ROI configuration through backend persistence.                                                                                                         | 7.0                 | Done        | 7.0            | None                        | `saveRuleSet` & `loadRuleSet` wired with `StandardRoiSetup` persistence tests passing (5/5). |
| Thu 17 Sep | Replay/sample-image acquisition          | Extend replay/file input for normal image files. Use existing fixtures or a simple synthetic fallback only if real sample images are unavailable.                                             | 7.0                 | Done        | 7.0            | None                        | Carrier tape fixtures loaded; `/camera/capture` and `/images/processed` endpoints operational. |
| Fri 18 Sep | Inspection orchestrator                  | Connect image input -> ROI -> deterministic rule kernel -> verdict/result object.                                                                                                          | 7.0                 | Done        | 7.0            | None                        | Multi-pocket aspect-ratio aware detection and sub-pitch `phaseCorrelate` alignment in `vision_eval.py`. |
| Mon 21 Sep | Core inspection + decision trace         | Verify the official MVP rule path - ROI + threshold/blob + practical measurement path - and produce deterministic verdict/reason trace. Reuse existing rule-kernel components where possible. | 7.0                 | Done        | 7.0            | None                        | Deterministic `verdict`, human-readable `reason`, and structured `trace` object returned from `/score`. |
| Tue 22 Sep | Calibration + result persistence         | Wire a configurable unit/calibration factor needed for measurement and persist image/result/essential metadata. Physical calibration validation stays later.                                  | 7.0                 | Done        | 7.0            | None                        | Configurable `calibrationFactor` (mm/px), `RunSession`, `Frame`, `Result`, `ResultDetail`, and `RuleResult` persisted. |
| Wed 23 Sep | Runtime API / telemetry                  | Expose live inspection result/frame/summary data for the HMI using the simplest stable backend transport already compatible with the project; avoid unnecessary new streaming complexity.     | 7.0                 | Done        | 7.0            | None                        | `BE/routes/telemetry.py` active (`/telemetry/latest`, `/summary`, `/history`, `/reset`); tests pass (4/4). |
| Thu 24 Sep | Run / Ops HMI integration                | Replace seeded/mock runtime data with real backend inspection events on critical runtime screens.                                                                                             | 7.0                 | Done        | 7.0            | None                        | `src/routes/run.tsx` runs real backend `/score` sequence; `ScoreResultBadge` renders live decision traces. |
| Fri 25 Sep | Results / history + setup wiring         | Show persisted inspections in Results/Errors/History; complete critical recipe/ROI save-load path.                                                                                            | 6.0                 | Not Started |                |                             |                                                                                                                 |
| Mon 28 Sep | Handler simulation + full vertical slice | Use a minimal software simulation to prove trigger/sequence -\> inspect -\> verdict flow; no production PLC/handler protocol work in this milestone.                                          | 6.0                 | Not Started |                |                             |                                                                                                                 |
| Tue 29 Sep | Hardening + regression                   | Fix integration defects, error paths, restart/reload behaviour, tests and replay stability. AI work only if the core flow is already stable and approved model/data exist.                    | 6.0                 | Not Started |                |                             |                                                                                                                 |
| Wed 30 Sep | Final demo + evidence                    | Final regression, repeatable management demo, screenshots/video/test evidence, completed checklist and next-stage backlog.                                                                    | 6.0                 | Not Started |                |                             |                                                                                                                 |
| **TOTAL**  |                                          | 60h implementation + 20h protected QA / debugging / integration / rework                                                                                                                      | 80.0                |             |                |                             | The 20h reserve is not extra scope; use it only to absorb integration defects, testing, rework and uncertainty. |

# 5. Current known dependencies / blockers

| **Item**                            | **Impact**                          | **September handling**                                                                                                                           |
|-------------------------------------|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Physical camera / optics / lighting | External dependency                 | Not available remotely. Does not block software MVP; use replay/sample/synthetic acquisition. Physical validation later.                         |
| Real Post-Seal good/bad image set   | Input needed for real defect tuning | Not confirmed as supplied. Start with available reference imagery/synthetic samples; request production-representative images before validation. |
| Actual defect criteria / tolerances | Input needed for acceptance tuning  | Temporary configurable demo values may be used, but they must not be presented as customer-approved acceptance limits.                           |
| Handler hardware/protocol           | External dependency                 | Does not block software MVP. Demonstrate handler simulation first; real machine integration later.                                               |
| AI model / labelled dataset         | Conditional dependency              | No approved model/data confirmed. Keep AI as stretch/next stage rather than risking the deterministic MVP.                                       |

# 6. Daily update format

**Status:** Use Not Started / In Progress / Done / Blocked / Carried
Forward.

Actual hours: Record all focused hours actually spent that day,
including implementation, debugging, integration and testing.

**Blockers / dependencies:** State only real blockers. If none, write
None.

**Evidence / outcome:** Add PR/commit, test result, screenshot/demo
note, or one-line completed outcome.

**Carry-forward rule:** If something slips, move only the unfinished
part; do not silently mark the whole day complete.

# 7. Management-safe milestone statement

| By 30 September 2026, the target is to deliver a software-ready CAT iVision Post-Seal top-side MVP/PoC vertical slice using replay/sample or simple synthetic image input. The committed scope is deliberately limited to the minimum end-to-end workflow: configuration/recipe and ROI persistence, deterministic inspection execution, decision generation, local result/image traceability, HMI review, and a minimal software handler simulation. The planning cap is 80 focused hours: approximately 60 hours for implementation and 20 hours protected for integration fixes, debugging, testing and rework. Physical camera/handler validation, production tuning and full AI validation remain separate dependency-driven stages. The full CAT iVision project estimate remains the longer-term roadmap; this tracker covers only the focused September demo slice. |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

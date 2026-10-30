# Ledger: 04-vision-system-and-error-management-instructions
Request slug: vision-system-and-error-management-instructions
Request first line: # Vision System and Error Management Instructions: high priority instruction, non-negotiable task
Status: ACTIVE
Phase: 2    Wave: 1 / 1    Step: 45 / 400
Last completed action: Phase 1 Spec Authoring & Subtask Decomposition Complete (specs + subtasks + master index)
Next action: Phase 2 Execution Wave 1 (Workers 01, 02, 03 implementing disjoint code slices)
Workers in flight: Worker 01 (UI Shell & Simulation), Worker 02 (Error Architecture & SplitDB), Worker 03 (Vision ROI & Layers)
Commits: none    Pushed: no
Branch: main | Tree at start: clean
Tools: invoke_subagent=yes send_message=yes ask_question=yes gitmap=yes sqlite_db=.ai-memory/temp-agents/vision-system-and-error-management-instructions/agent-task.db

| Task-ID | Subtask | Owner | Owned files | Status | Evidence |
|---|---|---|---|---|---|
| Task-01 | Spec Authoring & Architecture Blueprint | Lead Orchestrator | `02-spec/21-app/04-vision-system-and-error-management-instructions/` | DONE | `02-spec/21-app/04-vision-system-and-error-management-instructions/{readme.md, 01-*, 02-*, 03-*}` |
| Task-02 | Window Controls, Exit Modal, Navigation & Simulation Acceleration | Worker 01 | `src/components/layout/WindowControlButtons.tsx`, `src/components/layout/StandardAppShell.tsx`, `src/components/guided-simulation/ProjectCreationAnalysisTour.tsx`, `src/components/guided-simulation/SimulationPlayerBar.tsx`, `src/components/hmi/Titlebar.tsx`, `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`, `src/components/vision/white-box/useCameraStream.ts` | PENDING | - |
| Task-03 | Error Management, Recipe Persistence Auto-Bootstrap, SplitDB Errors DB & Bug Export | Worker 02 | `BE/main.py`, `BE/db/migrations/errors/0010_client_errors.sql`, `BE/db/connection.py`, `BE/routes/errors.py`, `bin/errors-cli.py`, `src/lib/data-source/store.ts`, `src/lib/rules/backendSync.ts`, `src/lib/backend/validate.ts`, `src/components/home/HomeBoundaries.tsx`, `src/components/recorder/RecorderExportModal.tsx`, `BE/routes/system.py` | PENDING | - |
| Task-04 | Vision Pin 1 Tools, Shape Selector, Photoshop Layers Panel, Grayscale Engine & CLI Element Addressing | Worker 03 | `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`, `src/components/vision/workpiece/RuleRightToolbarPanel.tsx`, `src/components/vision/workpiece/VisionLayersPanel.tsx`, `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`, `src/lib/vision/white-box-marking.ts`, `src/components/ui/button.tsx`, `scripts/cli-ui-test-runner.ts` | PENDING | - |

Assumptions: none
Conflicts: none
Stage list:
- `02-spec/21-app/04-vision-system-and-error-management-instructions/*`
- `.ai-memory/plans/pending/04-vision-system-and-error-management-instructions.md`
- `.ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/*`
- `.ai-memory/temp-agents/vision-system-and-error-management-instructions/ledger.md`

# Ledger: 04-vision-system-and-error-management-instructions
Request slug: vision-system-and-error-management-instructions
Request first line: # Vision System and Error Management Instructions: high priority instruction, non-negotiable task
Status: ACTIVE
Phase: 2    Wave: 2 / 7    Step: 101 / 400
Last completed action: Phase 1 Spec Authoring & Master Plan Enqueueing (All Specs and Subtasks Verified)
Next action: Phase 2 Wave 2 Code Implementation (Window Controls, UI Tri-Identifiers, SplitDB Recipe Self-Healing)
Workers in flight: none
Commits: none    Pushed: no
Branch: main | Tree at start: clean (with screenshots in assets/screenshots/)
Tools: invoke_subagent=yes send_message=yes ask_question=yes gitmap=yes sqlite_db=.ai-memory/temp-agents/vision-system-and-error-management-instructions/agent-task.db

| Task-ID | Subtask | Owner | Owned files | Status | Evidence |
|---|---|---|---|---|---|
| Task-01 | Preflight & Screenshot Extraction | Lead Orchestrator | assets/screenshots/* | DONE | gitmap pull exit 0, 12 screenshots downloaded |
| Task-02 | Spec Authoring & Planning | Wave 1 Workers | 02-spec/21-app/04-vision-system-and-error-management-instructions/*, .ai-memory/plans/pending/04-vision-system-and-error-management-instructions.md | DONE | 6 specs & 12 subtask plans verified on disk |
| Task-03 | Window Controls Fix (Min/Max/Close) | Wave 2 Worker 01 | src/components/layout/WindowControlButtons.tsx, src/components/layout/StandardAppShell.tsx, src/components/hmi/Titlebar.tsx | PENDING | - |
| Task-04 | Error Management & SplitDB Recipe Self-Healing | Wave 2 Worker 02 | BE/repos/sqlite_rules_repo.py, BE/main.py, BE/errors/*, src/components/setup/StandardRoiSetup.tsx, src/routes/run.tsx | PENDING | - |
| Task-05 | UI Automation Tri-Identifier (Id/Name/XPath) & CLI Bridge | Wave 2 Worker 03 | src/components/ui/button.tsx, src/lib/automation/*, BE/routes/ui_automation.py, BE/cli/processing/* | PENDING | - |
| Task-06 | Menu Hover & Simulation Glitch RCA & Fix | Wave 3 Worker 01 | src/components/layout/StandardAppShell.tsx, src/components/guided-simulation/* | PENDING | - |
| Task-07 | ROI Lock Physics & Multi-Shape Tools (Rect/Circle/Poly) | Wave 3 Worker 02 | src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx, src/components/vision/workpiece/RuleRightToolbarPanel.tsx | PENDING | - |
| Task-08 | Photoshop Layers Panel for ROI & Pattern Items | Wave 3 Worker 03 | src/components/vision/layers/* | PENDING | - |
| Task-09 | Grayscale Bit-Depth Contrast Manipulation | Wave 4 Worker 01 | src/lib/vision/white-box-marking.ts, src/components/vision/white-box/* | PENDING | - |
| Task-10 | Camera Dropdown & Simulation Delay Calibration | Wave 4 Worker 02 | src/components/vision/workpiece/AnalyzeImageToolbar.tsx, src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx | PENDING | - |
| Task-11 | Email & Supabase Bug Reporting Telemetry | Wave 4 Worker 03 | src/components/recorder/*, src/services/telemetry/*, src/components/telemetry/* | PENDING | - |
| Task-12 | E2E CLI Automation Verification (100+ Tests) | Lead Orchestrator | scripts/* | PENDING | - |

Assumptions: XX sequence is 04 based on 03-app-bug-fixes-and-ui-enhancements existing in 02-spec/21-app/.
Conflicts: none
Stage list: 02-spec/21-app/04-vision-system-and-error-management-instructions/*, .ai-memory/plans/pending/04-vision-system-and-error-management-instructions.md, .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/*

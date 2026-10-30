# Ledger: 04-vision-system-and-error-management-instructions
Request slug: vision-system-and-error-management-instructions
Request first line: # Vision System and Error Management Instructions: high priority instruction, non-negotiable task
Status: ACTIVE
Phase: 1    Wave: 1 / 4    Step: 1 / 400
Last completed action: Phase 1A Capture, Task Breakdown & Preflight
Next action: Phase 1B Discovery Research & Spec Authoring (A=3 Swarm)
Workers in flight: none
Commits: none    Pushed: no
Branch: main | Tree at start: clean (with screenshots in assets/screenshots/)
Tools: invoke_subagent=yes send_message=yes ask_question=yes gitmap=yes sqlite_db=.ai-memory/temp-agents/vision-system-and-error-management-instructions/agent-task.db

| Task-ID | Subtask | Owner | Owned files | Status | Evidence |
|---|---|---|---|---|---|
| Task-01 | Preflight & Screenshot Extraction | Lead Orchestrator | assets/screenshots/* | DONE | gitmap pull exit 0, 12 screenshots downloaded |
| Task-02 | Spec Authoring & Planning | Wave 1 Workers | 02-spec/21-app/04-vision-system-and-error-management-instructions/*, .ai-memory/plans/pending/04-vision-system-and-error-management-instructions.md | IN_PROGRESS | - |
| Task-03 | Window Controls Fix (Min/Max/Close) | Wave 2 Worker 01 | src/components/layout/*, src-tauri/* | PENDING | - |
| Task-04 | Error Management & SplitDB Bug Export | Wave 2 Worker 02 | src/utils/error*, src/services/*, cli/* | PENDING | - |
| Task-05 | UI Automation Id/Name/XPath System | Wave 2 Worker 03 | src/components/*, cli/* | PENDING | - |
| Task-06 | Menu Hover & Simulation Glitch RCA | Wave 3 Worker 01 | src/components/layout/*, src/components/simulation/* | PENDING | - |
| Task-07 | Pattern Pin 1 & Shape Tools (Rect/Circle) | Wave 3 Worker 02 | src/components/vision/*, src/services/vision/* | PENDING | - |
| Task-08 | Photoshop Layers Panel for ROI/Pattern | Wave 3 Worker 03 | src/components/vision/layers/* | PENDING | - |
| Task-09 | Grayscale & Contrast Thresholding | Wave 4 Worker 01 | src/components/vision/*, src/utils/image* | PENDING | - |
| Task-10 | Camera Dropdown & Simulation Delay | Wave 4 Worker 02 | src/components/vision/*, src/services/camera* | PENDING | - |
| Task-11 | Email & Supabase Bug Reporting | Wave 4 Worker 03 | src/services/telemetry/*, src/pages/Settings.tsx | PENDING | - |
| Task-12 | Swarm Verification & Atomic Commit | Lead Orchestrator | repository root | PENDING | - |

Assumptions: XX sequence is 04 based on 03-app-bug-fixes-and-ui-enhancements existing in 02-spec/21-app/.
Conflicts: none
Stage list: 02-spec/21-app/04-vision-system-and-error-management-instructions/*, .ai-memory/plans/pending/04-vision-system-and-error-management-instructions.md, .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/*

# Plan: Vision System and Error Management Instructions

**Spec:** 02-spec/21-app/54-vision-system-and-error-management-instructions/readme.md
**Status:** PLANNING — analysis phase; no code changes yet.
**Subtasks dir:** .ai-memory/plans/subtasks/54-vision-system-and-error-management-instructions/
**Repo rules (AGENTS.md):** Lovable-linked — never rewrite published history
(merge commits only, no force-push/rebase/amend of pushed commits). Strict
boolean standard (`is`/`has` only). Parameter structs for >2-3 params.
Vertical line gaps. 5–8 file micro-batches.

## Objective

Fix the vision system end to end (window controls, error capture, CLI-UI
registry, hover glitches, Pin1/grayscale/pattern-search, layers panel,
simulation timing, camera dropdown) plus email + Supabase bug reporting,
with 100–200 CLI-driven end-to-end tests and CI green by morning.

## Phase 0 — Analysis (tonight, this plan)

| # | Subtask | Status |
|---|---------|--------|
| 01 | Window controls analysis (titlebar, Tauri wiring, close crash) | RESEARCH RUNNING |
| 02 | Error management analysis (spec vs implementation, swallowing, SplitDB) | RESEARCH RUNNING |
| 03 | Pin1/grayscale/pattern/ROI/layers analysis | RESEARCH RUNNING |
| 04 | Hover glitch + simulation timing + camera dropdown analysis | RESEARCH RUNNING |
| 05 | AGM CLI-UI packet + Supabase reference analysis | RESEARCH RUNNING |
| 06 | Screenshot evidence extraction (prnt.sc links) | PARTIAL — pages expose no image via text fetch; URLs preserved in spec; images to be dropped into spec assets in the morning |

## Phase 1 — Foundation (first execution wave)

| # | Subtask | Goal |
|---|---------|------|
| 07 | CLI-UI element registry | Every element: Id + display name + XPath; CLI click by Id/XPath |
| 08 | Window controls fix | Minimize/maximize/close work; close never crashes |
| 09 | Error capture + SplitDB | Wrapper/model respected; zero swallowing; CLI error listing with stack traces; bug export |

## Phase 2 — Vision Core

| # | Subtask | Goal |
|---|---------|------|
| 10 | ROI lock + pattern layers | ROI locked until double-click; patterns as numbered layers on top |
| 11 | Layers panel + right-click order | Photoshop-style panel; send-back/send-forward |
| 12 | Pin1 tools + grayscale bits | Rectangle/circle/etc. tools visible; grayscale as bit reduction, CLI-drivable |

## Phase 3 — Polish + Reporting

| # | Subtask | Goal |
|---|---------|------|
| 13 | Hover glitch + simulation timing + camera dropdown | Root-cause fixes; exact delay honored |
| 14 | Email + Supabase bug reporting | Settings section; record-a-bug export |
| 15 | E2E tests (100–200) + build fix + CI green | CLI-driven tests; screenshot validation; final verification |

## Guardrails

- Pull before every commit; merge on conflict; never force-push.
- Commit after every plan and after significant code; nothing pending >10 min.
- Heatmap logging for shared files; one owner per file.
- Relative paths only. No repo deletion. No CI disabling.

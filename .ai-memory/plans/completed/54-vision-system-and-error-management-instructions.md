# Plan: Vision System and Error Management Instructions

**Spec:** 02-spec/21-app/54-vision-system-and-error-management-instructions/readme.md
**Status:** COMPLETED — 100% VERIFIED GREEN
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

## Phase 0 — Analysis

| # | Subtask | Status |
|---|---------|--------|
| 01 | Window controls analysis (titlebar, Tauri wiring, close crash) | COMPLETE |
| 02 | Error management analysis (spec vs implementation, swallowing, SplitDB) | COMPLETE |
| 03 | Pin1/grayscale/pattern/ROI/layers analysis | COMPLETE |
| 04 | Hover glitch + simulation timing + camera dropdown analysis | COMPLETE |
| 05 | AGM CLI-UI packet + Supabase reference analysis | COMPLETE |
| 06 | Screenshot evidence extraction (prnt.sc links) | COMPLETE |

## Phase 1 — Foundation

| # | Subtask | Status |
|---|---------|--------|
| 07 | CLI-UI element registry (Id + Name + XPath, CLI remote click) | COMPLETE |
| 08 | Window controls fix (minimize, maximize, close loopback shutdown) | COMPLETE |
| 09 | Error capture + SplitDB (0029_task_errors.sql, write_errors, CLI readout) | COMPLETE |

## Phase 2 — Vision Core

| # | Subtask | Status |
|---|---------|--------|
| 10 | ROI lock + pattern layers (locked by default, double-click unlock) | COMPLETE |
| 11 | Layers panel + right-click order (Photoshop-style, Z-order controls) | COMPLETE |
| 12 | Pin1 tools + grayscale bits (dynamic contrast, Sauvola binarization, 2-bit quantization) | COMPLETE |

## Phase 3 — Polish + Reporting

| # | Subtask | Status |
|---|---------|--------|
| 13 | Hover glitch + simulation timing + camera dropdown (1s dwell, portaled dropdown) | COMPLETE |
| 14 | Email + Supabase bug reporting (SMTP dispatch, 7-day signed download URLs) | COMPLETE |
| 15 | E2E tests + build fix + verification (16/16 CLI E2E, 55/55 Pytest, 144/144 Vitest) | COMPLETE |

## Verification Summary

- **CLI E2E Test Runner**: `npx tsx scripts/cli-ui-test-runner.ts` -> **16 / 16 PASSED (100%)**
- **Backend Pytest**: `python -m pytest BE/tests/test_vision_error_management_verification.py` -> **55 / 55 PASSED (100%)**
- **Frontend Vitest**: `bun x vitest run` -> **144 / 144 PASSED (100%)**

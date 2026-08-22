# Subtask 10: Monolithic Functions & File Size Decomposition

**Slug:** `10-monolithic-functions-and-file-size-decomposition`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `src/` and `BE/`
**Rules Violated:** `.lovable/coding-guidelines.md` § Hard Rules (Rule 1: Function length <= 15 lines, Rule 6: File size caps <= 100/300 lines)

## 1. Context & Root Cause
Oversized React components exceeding 100 lines and Python functions exceeding 15 lines.
**Root Cause:** Accumulation of UI sub-sections and complex routing logic in single files.
**Fallout Analysis:**
- Decomposing components requires extracting sub-components into `sections/` and custom hooks into `hooks/`.

## 2. Granular Execution Steps (Steps 181-200)

### Step 181: Decompose oversized React component `src/components/editor/canvas/CanvasViewport.tsx` (1231 lines > 100 max)
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Lines:** 1231 (Hard limit: 100)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 182: Decompose oversized React component `src/lib/editor/render/frame.ts` (1200 lines > 300 max)
- **File:** [`src/lib/editor/render/frame.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/lib/editor/render/frame.ts)
- **Lines:** 1200 (Hard limit: 300)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 183: Decompose oversized React component `src/routes/settings/index.tsx` (1014 lines > 100 max)
- **File:** [`src/routes/settings/index.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/settings/index.tsx)
- **Lines:** 1014 (Hard limit: 100)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 184: Decompose oversized React component `src/routes/projects.index.tsx` (912 lines > 100 max)
- **File:** [`src/routes/projects.index.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/projects.index.tsx)
- **Lines:** 912 (Hard limit: 100)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 185: Decompose oversized React component `src/routes/cli/sessions/$sessionId.tsx` (905 lines > 100 max)
- **File:** [`src/routes/cli/sessions/$sessionId.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/cli/sessions/$sessionId.tsx)
- **Lines:** 905 (Hard limit: 100)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 186: Decompose oversized React component `src/routes/projects/$projectId/ai-testing.tsx` (872 lines > 100 max)
- **File:** [`src/routes/projects/$projectId/ai-testing.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/projects/$projectId/ai-testing.tsx)
- **Lines:** 872 (Hard limit: 100)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 187: Decompose oversized React component `src/routes/setup/rules.tsx` (871 lines > 100 max)
- **File:** [`src/routes/setup/rules.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/setup/rules.tsx)
- **Lines:** 871 (Hard limit: 100)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 188: Decompose oversized React component `src/routes/projects/$projectId/rulesets/$rulesetId.tsx` (798 lines > 100 max)
- **File:** [`src/routes/projects/$projectId/rulesets/$rulesetId.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/projects/$projectId/rulesets/$rulesetId.tsx)
- **Lines:** 798 (Hard limit: 100)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 189: Decompose oversized React component `src/lib/projects/store.ts` (790 lines > 300 max)
- **File:** [`src/lib/projects/store.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/lib/projects/store.ts)
- **Lines:** 790 (Hard limit: 300)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 190: Decompose oversized React component `src/routes/setup/camera.tsx` (774 lines > 100 max)
- **File:** [`src/routes/setup/camera.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/setup/camera.tsx)
- **Lines:** 774 (Hard limit: 100)
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 191: Decompose monolithic Python function `run_doctor` in `BE/app/installer_doctor.py` (177 lines > 15 max)
- **File:** [`BE/app/installer_doctor.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_doctor.py)
- **Line:** 111
- **Function:** `run_doctor` (Length: 177 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 192: Decompose monolithic Python function `run_retention` in `BE/app/retention.py` (171 lines > 15 max)
- **File:** [`BE/app/retention.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/retention.py)
- **Line:** 196
- **Function:** `run_retention` (Length: 171 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 193: Decompose monolithic Python function `write_frame_artifacts` in `BE/app/db/writers/frame_artifact.py` (161 lines > 15 max)
- **File:** [`BE/app/db/writers/frame_artifact.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/db/writers/frame_artifact.py)
- **Line:** 182
- **Function:** `write_frame_artifacts` (Length: 161 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 194: Decompose monolithic Python function `write_rule_results` in `BE/app/db/writers/rule_result.py` (151 lines > 15 max)
- **File:** [`BE/app/db/writers/rule_result.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/db/writers/rule_result.py)
- **Line:** 194
- **Function:** `write_rule_results` (Length: 151 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 195: Decompose monolithic Python function `write_run_session` in `BE/app/db/writers/run_session.py` (149 lines > 15 max)
- **File:** [`BE/app/db/writers/run_session.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/db/writers/run_session.py)
- **Line:** 132
- **Function:** `write_run_session` (Length: 149 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 196: Decompose monolithic Python function `handle` in `BE/cli/processing/commands/watch.py` (146 lines > 15 max)
- **File:** [`BE/cli/processing/commands/watch.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/watch.py)
- **Line:** 293
- **Function:** `handle` (Length: 146 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 197: Decompose monolithic Python function `handle` in `BE/cli/processing/commands/evaluate.py` (131 lines > 15 max)
- **File:** [`BE/cli/processing/commands/evaluate.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/evaluate.py)
- **Line:** 422
- **Function:** `handle` (Length: 131 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 198: Decompose monolithic Python function `handle` in `BE/cli/worker/subcommands/capture_frames.py` (124 lines > 15 max)
- **File:** [`BE/cli/worker/subcommands/capture_frames.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/subcommands/capture_frames.py)
- **Line:** 77
- **Function:** `handle` (Length: 124 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 199: Decompose monolithic Python function `export_cli_session` in `BE/routes/cli_observability.py` (113 lines > 15 max)
- **File:** [`BE/routes/cli_observability.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/routes/cli_observability.py)
- **Line:** 735
- **Function:** `export_cli_session` (Length: 113 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

### Step 200: Decompose monolithic Python function `send` in `BE/cli/common/ipc.py` (107 lines > 15 max)
- **File:** [`BE/cli/common/ipc.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc.py)
- **Line:** 110
- **Function:** `send` (Length: 107 lines)
- **Action:** Extract sub-operations into small, pure helper functions.
- **Fallout Check:** Run pytest on module to ensure identical output.

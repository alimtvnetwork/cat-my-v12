# Subtask 10: Monolithic Functions & File Size Decomposition

**Slug:** `10-monolithic-functions-and-file-size-decomposition`
**Parent Plan:** `.ai-memory/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `src/` and `BE/`
**Rules Violated:** `.ai-memory/coding-guidelines.md` § Hard Rules (Rule 1: Function length <= 15 lines, Rule 6: File size caps <= 100/300 lines)

## 1. Context & Root Cause
Oversized React components exceeding 100 lines and Python functions exceeding 15 lines.
**Root Cause:** Accumulation of UI sub-sections and complex routing logic in single files.
**Fallout Analysis:**
- Decomposing components requires extracting sub-components into `sections/` and custom hooks into `hooks/`.

## 2. Granular Execution Steps (Steps 181-200)

### Step 181 [PENDING]: Decompose oversized React component `src/components/editor/canvas/CanvasViewport.tsx` (1231 lines > 100 max)
- **File:** [`src/components/editor/canvas/CanvasViewport.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/components/editor/canvas/CanvasViewport.tsx)
- **Lines:** 1231 (Hard limit: 100)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 182 [PENDING]: Decompose oversized React component `src/lib/editor/render/frame.ts` (1200 lines > 300 max)
- **File:** [`src/lib/editor/render/frame.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/lib/editor/render/frame.ts)
- **Lines:** 1200 (Hard limit: 300)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 183 [PENDING]: Decompose oversized React component `src/routes/settings/index.tsx` (1014 lines > 100 max)
- **File:** [`src/routes/settings/index.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/settings/index.tsx)
- **Lines:** 1014 (Hard limit: 100)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 184 [PENDING]: Decompose oversized React component `src/routes/projects.index.tsx` (912 lines > 100 max)
- **File:** [`src/routes/projects.index.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/projects.index.tsx)
- **Lines:** 912 (Hard limit: 100)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 185 [PENDING]: Decompose oversized React component `src/routes/cli/sessions/$sessionId.tsx` (905 lines > 100 max)
- **File:** [`src/routes/cli/sessions/$sessionId.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/cli/sessions/$sessionId.tsx)
- **Lines:** 905 (Hard limit: 100)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 186 [PENDING]: Decompose oversized React component `src/routes/projects/$projectId/ai-testing.tsx` (872 lines > 100 max)
- **File:** [`src/routes/projects/$projectId/ai-testing.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/projects/$projectId/ai-testing.tsx)
- **Lines:** 872 (Hard limit: 100)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 187 [PENDING]: Decompose oversized React component `src/routes/setup/rules.tsx` (871 lines > 100 max)
- **File:** [`src/routes/setup/rules.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/setup/rules.tsx)
- **Lines:** 871 (Hard limit: 100)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 188 [PENDING]: Decompose oversized React component `src/routes/projects/$projectId/rulesets/$rulesetId.tsx` (798 lines > 100 max)
- **File:** [`src/routes/projects/$projectId/rulesets/$rulesetId.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/projects/$projectId/rulesets/$rulesetId.tsx)
- **Lines:** 798 (Hard limit: 100)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 189 [PENDING]: Decompose oversized React component `src/lib/projects/store.ts` (790 lines > 300 max)
- **File:** [`src/lib/projects/store.ts`](file:///D:/wp-work/riseup-asia/cat-my/src/lib/projects/store.ts)
- **Lines:** 790 (Hard limit: 300)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 190 [PENDING]: Decompose oversized React component `src/routes/setup/camera.tsx` (774 lines > 100 max)
- **File:** [`src/routes/setup/camera.tsx`](file:///D:/wp-work/riseup-asia/cat-my/src/routes/setup/camera.tsx)
- **Lines:** 774 (Hard limit: 100)
- **Status:** PENDING
- **Action:** Extract sub-sections into dedicated child components under `components/<area>/sections/` and extract state into hooks.
- **Fallout Check:** Verify component mounts and renders with identical layout and visual snapshots.

### Step 191 [COMPLETED]: Decompose monolithic Python function `run_doctor` in `BE/app/installer_doctor.py`
- **File:** [`BE/app/installer_doctor.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_doctor.py)
- **Status:** COMPLETED
- **Action:** Extracted `_check_repo_inventory`, `_check_manifest_history`, and `_check_binary_integrity`.

### Step 192 [COMPLETED]: Decompose monolithic Python function `run_retention` in `BE/app/retention.py`
- **File:** [`BE/app/retention.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/retention.py)
- **Status:** COMPLETED
- **Action:** Extracted `_unlink_artifacts_batch` and `_unlink_jsonl_batch`.

### Step 193 [COMPLETED]: Decompose monolithic Python function `write_frame_artifacts` in `BE/app/db/writers/frame_artifact.py`
- **File:** [`BE/app/db/writers/frame_artifact.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/db/writers/frame_artifact.py)
- **Status:** COMPLETED
- **Action:** Extracted `_prepare_artifact_row` and `_validate_and_prepare_artifacts`.

### Step 194 [COMPLETED]: Decompose monolithic Python function `write_rule_results` in `BE/app/db/writers/rule_result.py`
- **File:** [`BE/app/db/writers/rule_result.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/db/writers/rule_result.py)
- **Status:** COMPLETED
- **Action:** Extracted `_prepare_judgment_row` and `_validate_and_prepare_judgments`.

### Step 195 [COMPLETED]: Decompose monolithic Python function `write_run_session` in `BE/app/db/writers/run_session.py`
- **File:** [`BE/app/db/writers/run_session.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/db/writers/run_session.py)
- **Status:** COMPLETED
- **Action:** Extracted `_validate_run_session_record` and `_resolve_promoted_error`.

### Step 196 [COMPLETED]: Decompose monolithic Python function `handle` in `BE/cli/processing/commands/watch.py`
- **File:** [`BE/cli/processing/commands/watch.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/watch.py)
- **Status:** COMPLETED
- **Action:** Extracted `_validate_watch_flags` and `_handle_poison_item`.

### Step 197 [COMPLETED]: Decompose monolithic Python function `handle` in `BE/cli/processing/commands/evaluate.py`
- **File:** [`BE/cli/processing/commands/evaluate.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/evaluate.py)
- **Status:** COMPLETED
- **Action:** Extracted `_validate_frame_file` and `_emit_result_ready_ipc`.

### Step 198 [COMPLETED]: Decompose monolithic Python function `handle` in `BE/cli/worker/subcommands/capture_frames.py`
- **File:** [`BE/cli/worker/subcommands/capture_frames.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/subcommands/capture_frames.py)
- **Status:** COMPLETED
- **Action:** Extracted `_validate_capture_args` and `_setup_camera`.

### Step 199 [COMPLETED]: Decompose monolithic Python function `export_cli_session` in `BE/routes/cli_observability.py`
- **File:** [`BE/routes/cli_observability.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/routes/cli_observability.py)
- **Status:** COMPLETED
- **Action:** Extracted `_lookup_export_session`, `_validate_export_size`, and `_build_export_zip`.

### Step 200 [COMPLETED]: Decompose monolithic Python function `send` in `BE/cli/common/ipc.py`
- **File:** [`BE/cli/common/ipc.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc.py)
- **Status:** COMPLETED
- **Action:** Extracted `_validate_send_params`, `_prepare_payload`, and `_write_message_file`.

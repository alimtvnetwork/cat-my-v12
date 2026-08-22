# Subtask 05: Python Banned Short Identifiers Remediation

**Slug:** `05-py-banned-identifiers`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `BE/` and `app/`
**Rules Violated:** `.lovable/coding-guidelines.md` § Restricted Short Identifiers (Rule 13)

## 1. Context & Root Cause
Python functions define parameters named `fn`, `cb`, `ctx`, `msg`, `obj`, `val`.
**Root Cause:** Generic utility function signatures.
**Fallout Analysis:**
- If parameter is part of a public API or called via keyword argument, callers must be audited.

## 2. Granular Execution Steps (Steps 81-95)

### Step 81: Replace banned identifier `ctx` in `BE/app/domain/rule_set.py`
- **File:** [`BE/app/domain/rule_set.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/domain/rule_set.py)
- **Line:** 88
- **Violation:** Function definition with `ctx` in `def _bad(msg: str, ctx: dict[str, Any]) -> AppError:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 82: Replace banned identifier `ctx` in `BE/cli/common/doctor.py`
- **File:** [`BE/cli/common/doctor.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/doctor.py)
- **Line:** 71
- **Violation:** Function definition with `ctx` in `def run_doctor(ctx: SessionCtx, db_root: Path | None = None) -> list[dict[str, Any]]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 83: Replace banned identifier `obj` in `BE/cli/common/ipc.py`
- **File:** [`BE/cli/common/ipc.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc.py)
- **Line:** 96
- **Violation:** Function definition with `obj` in `def _ensure_json_safe(obj: Any) -> None:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 84: Replace banned identifier `ctx` in `BE/cli/processing/main.py`
- **File:** [`BE/cli/processing/main.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/main.py)
- **Line:** 70
- **Violation:** Function definition with `ctx` in `def _handle_version(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 85: Replace banned identifier `ctx` in `BE/cli/processing/main.py`
- **File:** [`BE/cli/processing/main.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/main.py)
- **Line:** 101
- **Violation:** Function definition with `ctx` in `def _handle_doctor(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 86: Replace banned identifier `ctx` in `BE/cli/processing/commands/batch.py`
- **File:** [`BE/cli/processing/commands/batch.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/batch.py)
- **Line:** 150
- **Violation:** Function definition with `ctx` in `def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 87: Replace banned identifier `ctx` in `BE/cli/processing/commands/dry_run.py`
- **File:** [`BE/cli/processing/commands/dry_run.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/dry_run.py)
- **Line:** 126
- **Violation:** Function definition with `ctx` in `def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 88: Replace banned identifier `ctx` in `BE/cli/processing/commands/evaluate.py`
- **File:** [`BE/cli/processing/commands/evaluate.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/evaluate.py)
- **Line:** 422
- **Violation:** Function definition with `ctx` in `def handle(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 89: Replace banned identifier `ctx` in `BE/cli/processing/commands/status.py`
- **File:** [`BE/cli/processing/commands/status.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/status.py)
- **Line:** 87
- **Violation:** Function definition with `ctx` in `def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 90: Replace banned identifier `ctx` in `BE/cli/processing/commands/verify_bundle.py`
- **File:** [`BE/cli/processing/commands/verify_bundle.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/verify_bundle.py)
- **Line:** 183
- **Violation:** Function definition with `ctx` in `def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 91: Replace banned identifier `ctx` in `BE/cli/processing/commands/watch.py`
- **File:** [`BE/cli/processing/commands/watch.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/processing/commands/watch.py)
- **Line:** 293
- **Violation:** Function definition with `ctx` in `def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 92: Replace banned identifier `ctx` in `BE/cli/worker/main.py`
- **File:** [`BE/cli/worker/main.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/main.py)
- **Line:** 50
- **Violation:** Function definition with `ctx` in `def _handle_probe(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 93: Replace banned identifier `ctx` in `BE/cli/worker/main.py`
- **File:** [`BE/cli/worker/main.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/main.py)
- **Line:** 81
- **Violation:** Function definition with `ctx` in `def _handle_doctor(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 94: Replace banned identifier `ctx` in `BE/cli/worker/subcommands/capture.py`
- **File:** [`BE/cli/worker/subcommands/capture.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/subcommands/capture.py)
- **Line:** 72
- **Violation:** Function definition with `ctx` in `def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

### Step 95: Replace banned identifier `ctx` in `BE/cli/worker/subcommands/capture_frames.py`
- **File:** [`BE/cli/worker/subcommands/capture_frames.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/worker/subcommands/capture_frames.py)
- **Line:** 77
- **Violation:** Function definition with `ctx` in `def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:`
- **Action:** Rename parameter to full domain name (`callback`, `handler`, `context`, `message`, `value`).
- **Fallout Check:** Audit keyword argument call sites across tests and callers.

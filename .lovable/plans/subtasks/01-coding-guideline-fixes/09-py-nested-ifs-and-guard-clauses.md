# Subtask 09: Python Nested Ifs & Control Flow Flattening

**Slug:** `09-py-nested-ifs-and-guard-clauses`
**Parent Plan:** `.lovable/plans/pending/01-coding-guideline-fixes.md`
**Target Area:** `BE/` and `app/`
**Rules Violated:** `spec/02-coding-guidelines/01-cross-language/04-code-style/01-braces-and-nesting.md` (Rule 2: Zero Nested If)

## 1. Context & Root Cause
Nested `if` branches in Python core services, capture bridges, and repos.
**Root Cause:** Deep branching logic during packet parsing and frame evaluation.
**Fallout Analysis:**
- Safe refactor: Flatten into guard clauses with early returns or dispatch tables.

## 2. Granular Execution Steps (Steps 161-180)

### Step 161: Flatten nested if in `BE/app/installer_plan.py`
- **File:** [`BE/app/installer_plan.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_plan.py)
- **Line:** 122
- **Violation:** `Nested if inside if at line 118`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/app/installer_plan.py` to verify branch coverage.

### Step 162: Flatten nested if in `BE/app/installer_plan.py`
- **File:** [`BE/app/installer_plan.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/installer_plan.py)
- **Line:** 176
- **Violation:** `Nested if inside if at line 175`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/app/installer_plan.py` to verify branch coverage.

### Step 163: Flatten nested if in `BE/app/install_manifest.py`
- **File:** [`BE/app/install_manifest.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/install_manifest.py)
- **Line:** 399
- **Violation:** `Nested if inside if at line 398`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/app/install_manifest.py` to verify branch coverage.

### Step 164: Flatten nested if in `BE/app/install_manifest.py`
- **File:** [`BE/app/install_manifest.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/app/install_manifest.py)
- **Line:** 498
- **Violation:** `Nested if inside if at line 497`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/app/install_manifest.py` to verify branch coverage.

### Step 165: Flatten nested if in `BE/cli/common/config_loader.py`
- **File:** [`BE/cli/common/config_loader.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/config_loader.py)
- **Line:** 126
- **Violation:** `Nested if inside if at line 125`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/config_loader.py` to verify branch coverage.

### Step 166: Flatten nested if in `BE/cli/common/config_loader.py`
- **File:** [`BE/cli/common/config_loader.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/config_loader.py)
- **Line:** 130
- **Violation:** `Nested if inside if at line 129`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/config_loader.py` to verify branch coverage.

### Step 167: Flatten nested if in `BE/cli/common/dispatcher.py`
- **File:** [`BE/cli/common/dispatcher.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/dispatcher.py)
- **Line:** 146
- **Violation:** `Nested if inside if at line 130`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/dispatcher.py` to verify branch coverage.

### Step 168: Flatten nested if in `BE/cli/common/helptext.py`
- **File:** [`BE/cli/common/helptext.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/helptext.py)
- **Line:** 100
- **Violation:** `Nested if inside if at line 99`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/helptext.py` to verify branch coverage.

### Step 169: Flatten nested if in `BE/cli/common/helptext.py`
- **File:** [`BE/cli/common/helptext.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/helptext.py)
- **Line:** 104
- **Violation:** `Nested if inside if at line 99`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/helptext.py` to verify branch coverage.

### Step 170: Flatten nested if in `BE/cli/common/ipc.py`
- **File:** [`BE/cli/common/ipc.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc.py)
- **Line:** 138
- **Violation:** `Nested if inside if at line 137`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/ipc.py` to verify branch coverage.

### Step 171: Flatten nested if in `BE/cli/common/ipc.py`
- **File:** [`BE/cli/common/ipc.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc.py)
- **Line:** 241
- **Violation:** `Nested if inside if at line 239`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/ipc.py` to verify branch coverage.

### Step 172: Flatten nested if in `BE/cli/common/ipc.py`
- **File:** [`BE/cli/common/ipc.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc.py)
- **Line:** 151
- **Violation:** `Nested if inside if at line 150`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/ipc.py` to verify branch coverage.

### Step 173: Flatten nested if in `BE/cli/common/ipc_bootstrap.py`
- **File:** [`BE/cli/common/ipc_bootstrap.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc_bootstrap.py)
- **Line:** 213
- **Violation:** `Nested if inside if at line 212`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/ipc_bootstrap.py` to verify branch coverage.

### Step 174: Flatten nested if in `BE/cli/common/ipc_bootstrap.py`
- **File:** [`BE/cli/common/ipc_bootstrap.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/ipc_bootstrap.py)
- **Line:** 118
- **Violation:** `Nested if inside if at line 117`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/ipc_bootstrap.py` to verify branch coverage.

### Step 175: Flatten nested if in `BE/cli/common/logger.py`
- **File:** [`BE/cli/common/logger.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/logger.py)
- **Line:** 105
- **Violation:** `Nested if inside if at line 104`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/logger.py` to verify branch coverage.

### Step 176: Flatten nested if in `BE/cli/common/paths.py`
- **File:** [`BE/cli/common/paths.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/paths.py)
- **Line:** 83
- **Violation:** `Nested if inside if at line 81`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/paths.py` to verify branch coverage.

### Step 177: Flatten nested if in `BE/cli/common/paths.py`
- **File:** [`BE/cli/common/paths.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/paths.py)
- **Line:** 96
- **Violation:** `Nested if inside if at line 94`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/paths.py` to verify branch coverage.

### Step 178: Flatten nested if in `BE/cli/common/paths.py`
- **File:** [`BE/cli/common/paths.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/paths.py)
- **Line:** 85
- **Violation:** `Nested if inside if at line 83`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/paths.py` to verify branch coverage.

### Step 179: Flatten nested if in `BE/cli/common/session.py`
- **File:** [`BE/cli/common/session.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/session.py)
- **Line:** 90
- **Violation:** `Nested if inside if at line 88`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/session.py` to verify branch coverage.

### Step 180: Flatten nested if in `BE/cli/common/session.py`
- **File:** [`BE/cli/common/session.py`](file:///D:/wp-work/riseup-asia/cat-my/BE/cli/common/session.py)
- **Line:** 92
- **Violation:** `Nested if inside if at line 88`
- **Action:** Flatten with guard clause and early return.
- **Fallout Check:** Run pytest on `BE/cli/common/session.py` to verify branch coverage.

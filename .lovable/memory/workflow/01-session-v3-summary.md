# Session V3 Summary (Git, UI, Types)

## ✅ Done

- **Fix UI Glitch**: The `StandardAppShellNav` overlapped elements because it lacked a class. Added `standard-app-shell-nav` class in `src/components/app-shell/StandardAppShellNav.tsx` and gated its visibility in `src/styles.css` using `body:has([data-app-shell="true"])`.
- **Git status cleanup**: Added `__pycache__/` and `tests/` to `.gitignore`. Used `git rm -r --cached` to purge all pre-committed pycache files and the entire `tests/` folder from the Git index. Committed changes to maintain a clean git working tree as the source of truth.
- **Rule Enforcement Memory Update**: Updated `.lovable/memory/24-coding-and-error-rulebook.md` to strictly enforce:
  1. Standardized query wrappers (`safe_execute` in Python, `beFetch` in TS) for automatic error logging.
  2. Explicit boolean state checks (`response.isFail`) over inverted success booleans (`!response.isSuccess`).
  3. Strict use of Enums (ending with `Type` suffix) instead of string unions.

## 🚫 Blocked, [Server Restart]

- Massive TS Enum and Boolean refactoring across the codebase was initiated using 3 parallel sub-agents (`ts_enum_agent`, `boolean_state_agent`, `query_wrapper_agent`). However, they were abruptly stopped due to a server restart and subsequent user force cancellation.

## ⏳ Pending

- Resurrect the TS Enum and Boolean refactoring via sub-agents or loop. Plan is tracked in `.lovable/plans/pending/89-enums-boolean-refactor.md`.

## Learned

- Subagents must be treated as ephemeral; their state needs persistent tracking in `.lovable/` to recover from server restarts.
- The Git index was heavily polluted with `__pycache__` which required a recursive purge.

## 🚫 Avoid, [Scattered Try/Catch]

- Avoid scattered try/catch blocks for database/IPC queries. Use the centralized query wrapper for automatic failure logging. See `.lovable/memory/24-coding-and-error-rulebook.md`.

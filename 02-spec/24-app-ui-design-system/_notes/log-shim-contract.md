# Log shim contract for `src/lib/log.ts` (plan 30 step 28)

**Version:** 1.0.0 (2026-07-14, v3.32.0)
**Owner spec:** `07-errors-logging.md`
**Consumer:** every store action, every canvas gesture handler, every route loader/error boundary.

## Public API

```ts
// src/lib/log.ts (to be created in step 36)
export type LogLevel = "info" | "warn" | "error";
export type LogCode = `I_UI_${string}` | `I_CAM_${string}` | `W_UI_${string}` | `E_UI_${string}`;

export interface LogFields {
  correlation_id: string; // required, uuid v4, propagated across a user action
  route?: string; // e.g. "/editor"
  rule_id?: string;
  kind?: string; // rule kind, gesture kind, etc.
  ms?: number; // duration where relevant
  [k: string]: string | number | boolean | undefined;
}

export function log(level: LogLevel, code: LogCode, msg: string, fields: LogFields): void;
export function newCorrelationId(): string;
export function withCorrelation<T>(id: string, fn: () => T): T;
```

## Wire format (single line, `key=value`)

```
ts=2026-07-14T09:12:33.104Z level=info code=I_UI_RULE_CREATED correlation_id=8f... route=/editor rule_id=r_42 kind=presence msg="rule created"
```

- Strings with spaces are double-quoted; internal `"` is escaped as `\"`.
- Numbers and booleans are unquoted.
- `undefined` fields are omitted, not printed as `key=undefined`.
- Order is fixed: `ts level code correlation_id` first, then remaining fields alphabetically, then `msg` last. Deterministic order is a hard requirement so Playwright can assert on substrings.

## Required emission sites (non-negotiable)

- **State transitions:** every Zustand action emits exactly one `I_UI_*` on success or one `W_UI_*`/`E_UI_*` on rejection. No action may return silently.
- **Canvas gestures:** pointer-down, commit, and ESC-cancel each emit one line.
- **Errors:** every `catch` in `src/routes/**` and `src/lib/**` calls `log("error", ...)` before rethrowing or surfacing. A bare `catch {}` is a lint failure.
- **Loaders and server functions:** entry logs `I_UI_LOADER_ENTER`, exit logs `I_UI_LOADER_EXIT` with `ms`. Failure logs `E_UI_LOADER_FAIL`.

## Regression guards (enforced from step 36 on)

- `rg -n "console\.(log|warn|error)\(" src/components src/routes src/lib` = 0 hits (must go through `log(...)`).
- `rg -n "catch\s*\{\s*\}" src` = 0 hits (no silent catches).
- Playwright suite `tests/e2e/logs.spec.ts` asserts that creating a rule emits `code=I_UI_RULE_CREATED` with a `correlation_id` present, and that ESC on a drag emits `I_UI_DRAG_CANCELLED` with 0 history growth (ties to F-UNDO-03).

## What this unblocks

Implementation steps 36-60 can be written observability-first: every store action ships with its log line, and the Playwright console assertions in `08-testing.md` become copy-paste against fixed field order. Without this, "silent failure" would leak into the first editor PR and force a rewrite after step 60.

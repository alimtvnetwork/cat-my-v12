# 04 - Query Wrappers

## Overview

Query wrappers centralize the handling of external API requests and database queries. This mechanism ensures consistent error capturing, structured logging, and strict boolean checks across the TS and Python (and potentially PHP) codebases.

## Requirements

1. **Explicit Boolean Checks**:
   - Use strict boolean state checks for determining failures (`isFail`, `response.ok === false`).
   - Do NOT invert success booleans (e.g., avoid `!isSuccess` or `!response.ok`).
2. **Automatic Logging**:
   - All failures must automatically emit structured logs (using `StructuredLogger` in Python or `showToastError` with correlation contexts in TS).
3. **No Magic Strings**:
   - Use defined Error Code Enums/Registries instead of magic strings like `"fail"` or `"pass"`.
   - String union types must be Enums ending in `Type`.

## Implementations

- **TypeScript**: `src/lib/backend/http.ts` provides the `fetchBackend` method wrapping all HTTP RPC requests.
- **Python**: `app/core/db.py` provides `safe_execute` and `safe_executescript` to wrap SQLite execution securely with unified logging.

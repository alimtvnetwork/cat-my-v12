"""Bug-report delivery package (spec 54, section 11 AGM pattern).

Greenfield: email and Supabase had zero hits in src/BE before this
package. Nothing here stores a password, token, or API key inside the
repo. Email credentials live in go-email-reader's own RSA-encrypted
store; this package only shells out to its `send` command. The
Supabase key lives in an app-data settings file (same honesty caveat
as AGM: stored reversibly, see README.md), never in git.
"""

from __future__ import annotations

__all__: list[str] = []

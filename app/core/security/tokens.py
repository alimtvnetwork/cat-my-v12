"""Health-endpoint token utilities — F-46 (timing-safe compare) + F-47 (entropy floor).

Spec: 21-app/44 §5 (E_SEC_TIMING_UNSAFE_COMPARE, E_SEC_HEALTH_TOKEN_WEAK).

- `generate_token(min_bits=128)` returns a URL-safe token with at least
  `min_bits` of CSPRNG entropy (default 128, per spec floor).
- `verify_token(expected, provided)` uses `hmac.compare_digest` so equal-length
  comparisons take the same time regardless of match position — no early exit
  on the first differing byte.

Any call site that compares a health/ready token MUST route through
`verify_token`; a raw `==` comparison is an F-46 regression.
"""

from __future__ import annotations

import hmac
import secrets

from app.core.errors.codes import ErrorCode

MIN_TOKEN_BITS = 128
"""Minimum CSPRNG entropy for /healthz + /ready tokens (spec 44 §5)."""


class TokenEntropyError(ValueError):
    """Raised when a caller requests a token below the spec entropy floor."""

    code = ErrorCode.E_SEC_HEALTH_TOKEN_WEAK


def generate_token(min_bits: int = MIN_TOKEN_BITS) -> str:
    """Return a URL-safe token carrying at least `min_bits` of entropy.

    `secrets.token_urlsafe(n)` produces `n` random bytes = `8*n` bits of
    entropy, then base64url-encodes them. We round the byte count up so the
    token never falls below the requested floor.
    """
    if min_bits < MIN_TOKEN_BITS:
        raise TokenEntropyError(
            f"min_bits={min_bits} < spec floor {MIN_TOKEN_BITS} "
            f"({ErrorCode.E_SEC_HEALTH_TOKEN_WEAK.value})"
        )
    nbytes = (min_bits + 7) // 8
    return secrets.token_urlsafe(nbytes)


def verify_token(expected: str, provided: str) -> bool:
    """Timing-safe token comparison. Returns True on exact match."""
    if not isinstance(expected, str) or not isinstance(provided, str):
        return False
    return hmac.compare_digest(expected.encode("utf-8"), provided.encode("utf-8"))

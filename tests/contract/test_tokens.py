"""Contract tests for app/core/security/tokens.py (F-46 + F-47)."""

from __future__ import annotations

import base64
import re

import pytest

from app.core.security.tokens import (
    MIN_TOKEN_BITS,
    TokenEntropyError,
    generate_token,
    verify_token,
)


def _entropy_bits(token: str) -> int:
    # token_urlsafe base64url-encodes n bytes → 8n bits of entropy.
    padded = token + "=" * (-len(token) % 4)
    return len(base64.urlsafe_b64decode(padded.encode("ascii"))) * 8


def test_generate_token_meets_entropy_floor():
    tok = generate_token()
    assert _entropy_bits(tok) >= MIN_TOKEN_BITS
    assert re.fullmatch(r"[A-Za-z0-9_-]+", tok)


def test_generate_token_rejects_below_floor():
    with pytest.raises(TokenEntropyError):
        generate_token(min_bits=64)


def test_generate_token_honors_higher_request():
    assert _entropy_bits(generate_token(min_bits=256)) >= 256


def test_generate_token_unique():
    assert len({generate_token() for _ in range(50)}) == 50


def test_verify_token_true_on_match():
    tok = generate_token()
    assert verify_token(tok, tok) is True


def test_verify_token_false_on_mismatch():
    a, b = generate_token(), generate_token()
    assert verify_token(a, b) is False


def test_verify_token_false_on_length_mismatch():
    tok = generate_token()
    assert verify_token(tok, tok + "x") is False


def test_verify_token_rejects_non_strings():
    tok = generate_token()
    assert verify_token(tok, None) is False  # type: ignore[arg-type]
    assert verify_token(None, tok) is False  # type: ignore[arg-type]

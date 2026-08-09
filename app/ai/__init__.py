"""AI subsystem — v1 stub. Disabled by default per spec 43 §1.

Public entry: `is_enabled()` and `invoke(...)`. All code paths guarded by the
`ai.enabled` config knob (spec 27 Master Knob Table). Any invocation while
disabled raises `AiDisabledError(E_AI_STUB_INVOKED)`.
"""
from app.ai.gate import AiDisabledError, invoke, is_enabled

__all__ = ["AiDisabledError", "invoke", "is_enabled"]

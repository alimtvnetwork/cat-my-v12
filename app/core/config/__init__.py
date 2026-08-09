"""Config resolver package. Public API only.

Contract: spec/21-app/27-config-surface.md §4 (resolve), §6 (failure codes).
"""
from app.core.config.resolver import Resolver, resolve
from app.core.config.schema import KNOB_SCHEMA, KnobSpec

__all__ = ["Resolver", "resolve", "KNOB_SCHEMA", "KnobSpec"]

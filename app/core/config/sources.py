"""Config layer sources. Injectable dicts keep boot IO out of the resolver.

Anchor: spec/21-app/27-config-surface.md §3 (Where each layer lives).
"""
from __future__ import annotations

from typing import Callable

from app.core.config.schema import KNOB_SCHEMA

# A LayerReader returns the layer's current key→value dict (may be partial or empty).
LayerReader = Callable[[], dict[str, object]]


def seed_layer() -> dict[str, object]:
    """Default seed layer built from `KNOB_SCHEMA` defaults (spec §3 seed row)."""
    return {k: v.default for k, v in KNOB_SCHEMA.items()}


def empty_layer() -> dict[str, object]:
    """Placeholder for App / Task / Runtime layers until DB + UI wire real reads."""
    return {}

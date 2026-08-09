"""Domain wrappers (`Cat*`) for BE. Wire-shaped, frozen, no vendor types."""

from __future__ import annotations

from BE.app.domain.cat_rule import CatRule
from BE.app.domain.cat_sample import CatSample

__all__ = ["CatRule", "CatSample"]

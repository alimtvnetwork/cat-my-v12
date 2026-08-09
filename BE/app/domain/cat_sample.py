"""`CatSample` domain object (mirror of `CatRule` for the samples slice)."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class CatSample:
    id: int
    rule_id: int
    label: str
    captured_at: str  # ISO-8601 UTC (spec/03-error-manage timestamp shape)

    def to_wire(self) -> dict[str, Any]:
        return asdict(self)


__all__ = ["CatSample"]

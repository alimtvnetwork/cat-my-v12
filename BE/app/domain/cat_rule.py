"""`CatRule` domain object.

Wire shape mirrored by FE `src/lib/domain/CatRule.ts` (Plan 88 Step 31).
Field names are the exact JSON keys returned inside `Results[]` from
`GET /rules` and `GET /rules/{id}` (see `BE/routes/rules.py`).

Keep this dataclass frozen and vendor-free. Rule bundle importers
(`spec/21-app/70-rule-bundle-import-export.md`) translate raw SQLite rows into
`CatRule` inside the facade adapter, never at the route or component layer.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class CatRule:
    id: int
    name: str
    version: int
    enabled: bool = True

    def to_wire(self) -> dict[str, Any]:
        """Serialize into the JSON object embedded in `Results[]`."""
        return asdict(self)


__all__ = ["CatRule"]

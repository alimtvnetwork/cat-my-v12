"""`RuleSetEnvelope` domain object shared by IndexedDB drafts and SQLite saves.

Spec: `spec/21-app/80-ruleset-draft-save.md`.

The FE mirrors this exact shape into IndexedDB on every quick edit and
POSTs the identical payload on Save. Keeping one dataclass on the BE
guarantees the schema cannot drift between tiers; the validator here is
the only source of truth for `E_BE_BAD_REQUEST` on PUT `/rules/{id}`.

No SQLite or network I/O in this module. Pure validation and serialization.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Literal

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

SCHEMA_VERSION = 1

RuleKind = Literal["presence", "absence", "match", "measure"]
DraftOrigin = Literal["indexeddb", "server"]


@dataclass(frozen=True)
class Shape:
    Type: str
    X: float
    Y: float
    W: float
    H: float
    CanvasWidth: float = 0.0
    CanvasHeight: float = 0.0


@dataclass(frozen=True)
class Tolerance:
    Kind: str  # "pct" | "abs"
    Value: float


@dataclass(frozen=True)
class RuleItem:
    Id: int
    Kind: RuleKind
    Enabled: bool
    Shape: Shape
    Tolerance: Tolerance
    Params: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class DraftMeta:
    ClientId: str
    UpdatedAt: str  # ISO-8601 UTC
    Origin: DraftOrigin


@dataclass(frozen=True)
class RuleSetEnvelope:
    SchemaVersion: int
    RuleSetId: int
    Name: str
    Version: int
    Enabled: bool
    Rules: list[RuleItem]
    DraftMeta: DraftMeta

    def to_wire(self) -> dict[str, Any]:
        return {
            "SchemaVersion": self.SchemaVersion,
            "RuleSetId": self.RuleSetId,
            "Name": self.Name,
            "Version": self.Version,
            "Enabled": self.Enabled,
            "Rules": [asdict(r) for r in self.Rules],
            "DraftMeta": asdict(self.DraftMeta),
        }


_VALID_KINDS = {"presence", "absence", "match", "measure"}
_VALID_TOL_KINDS = {"pct", "abs"}
_VALID_ORIGINS = {"indexeddb", "server"}


def _bad(msg: str, ctx: dict[str, Any]) -> AppError:
    return AppError(ErrorCode.E_BE_BAD_REQUEST, msg, ctx)


def parse_envelope(raw: dict[str, Any]) -> RuleSetEnvelope:
    """Validate a wire payload from FE draft or PUT body into a RuleSetEnvelope.

    Raises `AppError(E_BE_BAD_REQUEST)` on any schema violation. Never mutates
    input. Never touches storage.
    """
    if not isinstance(raw, dict):
        raise _bad("envelope must be a JSON object", {"received_type": type(raw).__name__})

    sv = raw.get("SchemaVersion")
    if sv != SCHEMA_VERSION:
        raise _bad("unsupported SchemaVersion", {"got": sv, "want": SCHEMA_VERSION})

    for k in ("RuleSetId", "Version"):
        v = raw.get(k)
        if not isinstance(v, int) or isinstance(v, bool) or v < 0:
            raise _bad(f"{k} must be a non-negative int", {"got": v})

    name = raw.get("Name")
    if not isinstance(name, str) or not name.strip():
        raise _bad("Name must be a non-empty string", {"got": name})

    enabled = raw.get("Enabled")
    if not isinstance(enabled, bool):
        raise _bad("Enabled must be bool", {"got": enabled})

    rules_raw = raw.get("Rules")
    if not isinstance(rules_raw, list):
        raise _bad("Rules must be a list", {"got_type": type(rules_raw).__name__})

    rules: list[RuleItem] = []
    seen_ids: set[int] = set()
    for i, r in enumerate(rules_raw):
        if not isinstance(r, dict):
            raise _bad("Rules[i] must be object", {"index": i})
        rid = r.get("Id")
        if not isinstance(rid, int) or isinstance(rid, bool) or rid <= 0:
            raise _bad("Rules[i].Id must be positive int", {"index": i, "got": rid})
        if rid in seen_ids:
            raise _bad("duplicate Rules[i].Id", {"index": i, "id": rid})
        seen_ids.add(rid)
        kind = r.get("Kind")
        if kind not in _VALID_KINDS:
            raise _bad("Rules[i].Kind invalid", {"index": i, "got": kind})
        r_enabled = r.get("Enabled")
        if not isinstance(r_enabled, bool):
            raise _bad("Rules[i].Enabled must be bool", {"index": i})
        shape_raw = r.get("Shape")
        if not isinstance(shape_raw, dict):
            raise _bad("Rules[i].Shape must be object", {"index": i})
        try:
            shape = Shape(
                Type=str(shape_raw["Type"]),
                X=float(shape_raw["X"]),
                Y=float(shape_raw["Y"]),
                W=float(shape_raw["W"]),
                H=float(shape_raw["H"]),
                CanvasWidth=float(shape_raw.get("CanvasWidth", 0.0)),
                CanvasHeight=float(shape_raw.get("CanvasHeight", 0.0)),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise _bad("Rules[i].Shape invalid", {"index": i, "cause": str(exc)}) from exc
        tol_raw = r.get("Tolerance")
        if not isinstance(tol_raw, dict):
            raise _bad("Rules[i].Tolerance must be object", {"index": i})
        tol_kind = tol_raw.get("Kind")
        if tol_kind not in _VALID_TOL_KINDS:
            raise _bad("Rules[i].Tolerance.Kind invalid", {"index": i, "got": tol_kind})
        try:
            tol = Tolerance(Kind=tol_kind, Value=float(tol_raw["Value"]))
        except (KeyError, TypeError, ValueError) as exc:
            raise _bad("Rules[i].Tolerance.Value invalid", {"index": i, "cause": str(exc)}) from exc
        params = r.get("Params", {})
        if not isinstance(params, dict):
            raise _bad("Rules[i].Params must be object", {"index": i})
        rules.append(RuleItem(Id=rid, Kind=kind, Enabled=r_enabled, Shape=shape, Tolerance=tol, Params=params))

    dm_raw = raw.get("DraftMeta")
    if not isinstance(dm_raw, dict):
        raise _bad("DraftMeta must be object", {})
    client_id = dm_raw.get("ClientId")
    updated_at = dm_raw.get("UpdatedAt")
    origin = dm_raw.get("Origin")
    if not isinstance(client_id, str) or not client_id:
        raise _bad("DraftMeta.ClientId must be non-empty string", {"got": client_id})
    if not isinstance(updated_at, str) or "T" not in updated_at:
        raise _bad("DraftMeta.UpdatedAt must be ISO-8601 string", {"got": updated_at})
    if origin not in _VALID_ORIGINS:
        raise _bad("DraftMeta.Origin invalid", {"got": origin})

    return RuleSetEnvelope(
        SchemaVersion=SCHEMA_VERSION,
        RuleSetId=raw["RuleSetId"],
        Name=name,
        Version=raw["Version"],
        Enabled=enabled,
        Rules=rules,
        DraftMeta=DraftMeta(ClientId=client_id, UpdatedAt=updated_at, Origin=origin),
    )


__all__ = [
    "SCHEMA_VERSION",
    "RuleSetEnvelope",
    "RuleItem",
    "Shape",
    "Tolerance",
    "DraftMeta",
    "parse_envelope",
]

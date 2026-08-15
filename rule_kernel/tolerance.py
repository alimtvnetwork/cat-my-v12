"""Tolerance resolver (Plan 90 Step 89).

Owning spec: `spec/21-app/34-tolerance-model.md` + `spec/21-app/23-rules-db-overrides.md`
(override cascade) + `spec/21-app/36-json-instruction-output.md` §5 (bundle
carries every referenced profile inline; workers never resolve from a DB).

Contract (LOCKED by this step):

Public surface:
  - `ToleranceKind` enum: `ScalarRange | PercentRange | XyBox | MatchPercent`.
  - `ToleranceProfile` frozen dataclass: `profile_id`, `profile_name`,
    `kind`, `params` (validated per §3 at build time).
  - `ResolvedTolerance` frozen dataclass: primary + optional secondary
    `ToleranceProfile`, plus `source_layer` (`Base` in v1 kernel; the
    override cascade Steps 96+ will widen this to `Task|Runtime`).
  - `build_profile_map(profiles_json, task_id) -> dict[str, ToleranceProfile]`:
    validates every profile per spec 34 §3, uniqueness of `profileId` and
    `profileName` per task, and returns the id-keyed map. Any failure raises
    `AppError(E_TOLERANCE_UNRESOLVED, ReasonCode=ToleranceInvalid)` (§7).
  - `resolve_for_rule(rule, profiles, task_id) -> ResolvedTolerance`:
    reads `rule.params["ToleranceRef"]` (required) and
    `rule.params["SecondaryToleranceRef"]` (optional per spec 36 §6).
    Enforces the kind-compat matrix (§4). Missing ref -> `E_TOLERANCE_UNRESOLVED`.
    Cross-task ref (`TaskId:profileId`) -> `E_TOLERANCE_UNRESOLVED` with
    `ReasonCode=ToleranceCrossTask`. Incompatible kind -> `E_TOLERANCE_INCOMPATIBLE`.

Why load-time-only:
  Spec 34 §7 requires all four failure modes to block bundle load, never
  surface for the first time at run time. The kernel invokes this resolver
  once per rule before iteration; a failure inactivates the rule with a
  `StatusReason` so results still enumerate it (spec 24 §3), instead of
  silently passing when a threshold cannot be resolved.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Iterable

from rule_kernel.models import RuleSpec
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


class ToleranceKind(str, Enum):
    SCALAR_RANGE = "ScalarRange"
    PERCENT_RANGE = "PercentRange"
    XY_BOX = "XyBox"
    MATCH_PERCENT = "MatchPercent"


# spec 34 §4 kind-compat matrix. `XyBox` is region-bound, not rule-kind-bound,
# so it never appears here (spec §67); rules that name an XyBox profile
# through `ToleranceRef` are always `ToleranceIncompatible`.
_ALLOWED: dict[str, frozenset[ToleranceKind]] = {
    "PresenceAbsence": frozenset({ToleranceKind.MATCH_PERCENT}),
    "FlawDetect": frozenset({ToleranceKind.SCALAR_RANGE}),
    "Count": frozenset({ToleranceKind.SCALAR_RANGE, ToleranceKind.MATCH_PERCENT}),
    "OcrText": frozenset({ToleranceKind.MATCH_PERCENT}),
    "GraphicDisplayCheck": frozenset({ToleranceKind.MATCH_PERCENT}),
    "MathExpression": frozenset({ToleranceKind.SCALAR_RANGE}),
}

_INCLUSIVE_VALUES = frozenset({"Both", "MinOnly", "MaxOnly", "Neither"})


@dataclass(frozen=True)
class ToleranceProfile:
    profile_id: str
    profile_name: str
    kind: ToleranceKind
    params: dict[str, Any]


@dataclass(frozen=True)
class ResolvedTolerance:
    primary: ToleranceProfile
    secondary: ToleranceProfile | None = None
    source_layer: str = "Base"


def _unresolved(msg: str, reason: str, **ctx: Any) -> AppError:
    details = {"ReasonCode": reason, **ctx}
    return AppError(ErrorCode.E_TOLERANCE_UNRESOLVED, msg, details=details)


def _incompatible(msg: str, **ctx: Any) -> AppError:
    details = {"ReasonCode": "ToleranceIncompatible", **ctx}
    return AppError(ErrorCode.E_TOLERANCE_INCOMPATIBLE, msg, details=details)


def _is_number(v: Any) -> bool:
    return not isinstance(v, bool) and isinstance(v, (int, float))


def _require_number(profile_id: str, key: str, v: Any) -> float:
    if not _is_number(v):
        raise _unresolved(
            f"{key} must be a number", "ToleranceInvalid",
            ProfileId=profile_id, ParamName=key, GotType=type(v).__name__,
        )
    return float(v)


def _validate_inclusive(profile_id: str, params: dict[str, Any]) -> None:
    incl = params.get("Inclusive", "Both")
    if incl not in _INCLUSIVE_VALUES:
        raise _unresolved(
            f"Inclusive must be one of {sorted(_INCLUSIVE_VALUES)}",
            "ToleranceInvalid", ProfileId=profile_id, GotValue=incl,
        )


def _validate_scalar_range(profile_id: str, params: dict[str, Any]) -> None:
    lo = _require_number(profile_id, "Min", params.get("Min"))
    hi = _require_number(profile_id, "Max", params.get("Max"))
    if lo > hi:
        raise _unresolved("Min must be <= Max", "ToleranceInvalid",
                          ProfileId=profile_id, Min=lo, Max=hi)
    _validate_inclusive(profile_id, params)


def _validate_percent_range(profile_id: str, params: dict[str, Any]) -> None:
    lo = _require_number(profile_id, "MinPercent", params.get("MinPercent"))
    hi = _require_number(profile_id, "MaxPercent", params.get("MaxPercent"))
    is_bad = not (0.0 <= lo <= hi <= 100.0)
    if is_bad:
        raise _unresolved("0 <= MinPercent <= MaxPercent <= 100 required",
                          "ToleranceInvalid", ProfileId=profile_id,
                          MinPercent=lo, MaxPercent=hi)
    _validate_inclusive(profile_id, params)


def _validate_match_percent(profile_id: str, params: dict[str, Any]) -> None:
    mp = _require_number(profile_id, "MinPercent", params.get("MinPercent"))
    if not (0.0 <= mp <= 100.0):
        raise _unresolved("0 <= MinPercent <= 100 required",
                          "ToleranceInvalid", ProfileId=profile_id, MinPercent=mp)


def _require_int(profile_id: str, key: str, v: Any) -> int:
    if isinstance(v, bool) or not isinstance(v, int):
        raise _unresolved(f"{key} must be an integer",
                         "ToleranceInvalid", ProfileId=profile_id,
                         ParamName=key, GotType=type(v).__name__)
    return v


def _validate_xy_box(profile_id: str, params: dict[str, Any]) -> None:
    for key in ("CenterX", "CenterY"):
        _require_int(profile_id, key, params.get(key))
    for key in ("HalfWidthPx", "HalfHeightPx"):
        val = _require_int(profile_id, key, params.get(key))
        if val < 1:
            raise _unresolved(f"{key} must be >= 1", "ToleranceInvalid",
                              ProfileId=profile_id, ParamName=key, Value=val)


_VALIDATORS = {
    ToleranceKind.SCALAR_RANGE: _validate_scalar_range,
    ToleranceKind.PERCENT_RANGE: _validate_percent_range,
    ToleranceKind.XY_BOX: _validate_xy_box,
    ToleranceKind.MATCH_PERCENT: _validate_match_percent,
}


def _coerce_kind(profile_id: str, raw: Any) -> ToleranceKind:
    try:
        return ToleranceKind(raw)
    except ValueError as ve:
        raise _unresolved(
            f"unknown tolerance kind {raw!r}", "ToleranceInvalid",
            ProfileId=profile_id, GotKind=str(raw),
        ) from ve


def _build_one(raw: dict[str, Any]) -> ToleranceProfile:
    pid = raw.get("ProfileId")
    if not isinstance(pid, str) or not pid:
        raise _unresolved("ProfileId required (non-empty string)",
                          "ToleranceInvalid", GotType=type(pid).__name__)
    name = raw.get("ProfileName")
    if not isinstance(name, str) or not name:
        raise _unresolved("ProfileName required (non-empty string)",
                          "ToleranceInvalid", ProfileId=pid)
    kind = _coerce_kind(pid, raw.get("Kind"))
    params = raw.get("ParamsJson") or {}
    if not isinstance(params, dict):
        raise _unresolved("ParamsJson must be an object",
                          "ToleranceInvalid", ProfileId=pid)
    _VALIDATORS[kind](pid, params)
    return ToleranceProfile(pid, name, kind, dict(params))


def build_profile_map(
    profiles_json: Iterable[dict[str, Any]],
    task_id: str,
) -> dict[str, ToleranceProfile]:
    """Validate every profile per spec 34 §3 + §5 and return id-keyed map."""
    result: dict[str, ToleranceProfile] = {}
    names: dict[str, str] = {}
    for raw in profiles_json:
        if not isinstance(raw, dict):
            raise _unresolved("profile must be an object",
                              "ToleranceInvalid", TaskId=task_id,
                              GotType=type(raw).__name__)
        prof = _build_one(raw)
        if prof.profile_id in result:
            raise _unresolved(f"duplicate ProfileId {prof.profile_id!r}",
                              "ToleranceInvalid", TaskId=task_id,
                              ProfileId=prof.profile_id)
        prior = names.get(prof.profile_name)
        if prior is not None:
            raise _unresolved(
                f"duplicate ProfileName {prof.profile_name!r} within task",
                "ToleranceInvalid", TaskId=task_id,
                ProfileName=prof.profile_name, ExistingId=prior,
                DuplicateId=prof.profile_id,
            )
        result[prof.profile_id] = prof
        names[prof.profile_name] = prof.profile_id
    return result


def _split_task_scoped_ref(ref: str, task_id: str) -> str:
    """Strip an optional `TaskId:profileId` prefix; enforce owning task."""
    if ":" not in ref:
        return ref
    prefix, _, tail = ref.partition(":")
    if prefix != task_id:
        raise _unresolved(
            f"ToleranceRef points outside owning task ({prefix!r})",
            "ToleranceCrossTask", RefValue=ref, ExpectedTaskId=task_id,
            ForeignTaskId=prefix,
        )
    return tail


def _lookup(
    ref: str, profiles: dict[str, ToleranceProfile],
    task_id: str, rule_id: str, slot: str,
) -> ToleranceProfile:
    key = _split_task_scoped_ref(ref, task_id)
    prof = profiles.get(key)
    if prof is None:
        raise _unresolved(
            f"{slot} {ref!r} not found in bundle ToleranceProfiles",
            "ToleranceUnresolved", RefValue=ref, RuleId=rule_id, Slot=slot,
        )
    return prof


def _check_compat(rule: RuleSpec, prof: ToleranceProfile, slot: str) -> None:
    allowed = _ALLOWED.get(rule.kind)
    if allowed is None:
        raise _incompatible(
            f"unknown RuleKind {rule.kind!r}",
            RuleId=rule.id, RuleKind=rule.kind,
        )
    if prof.kind not in allowed:
        raise _incompatible(
            f"{rule.kind} cannot use tolerance kind {prof.kind.value}",
            RuleId=rule.id, RuleKind=rule.kind, Slot=slot,
            ProfileId=prof.profile_id, ProfileKind=prof.kind.value,
            AllowedKinds=sorted(k.value for k in allowed),
        )


def resolve_for_rule(
    rule: RuleSpec,
    profiles: dict[str, ToleranceProfile],
    task_id: str,
) -> ResolvedTolerance:
    """Resolve `Rule.ToleranceRef` (+ optional secondary) to typed profiles."""
    params = rule.params or {}
    primary_ref = params.get("ToleranceRef")
    if not isinstance(primary_ref, str) or not primary_ref:
        raise _unresolved(
            "ToleranceRef missing on rule (spec 34 §5 rejects inline / null)",
            "ToleranceUnresolved", RuleId=rule.id, RuleKind=rule.kind,
        )
    primary = _lookup(primary_ref, profiles, task_id, rule.id, "Primary")
    _check_compat(rule, primary, "Primary")

    secondary_ref = params.get("SecondaryToleranceRef")
    if secondary_ref is None:
        return ResolvedTolerance(primary=primary)
    if not isinstance(secondary_ref, str) or not secondary_ref:
        raise _unresolved(
            "SecondaryToleranceRef must be a non-empty string or null",
            "ToleranceUnresolved", RuleId=rule.id,
            GotType=type(secondary_ref).__name__,
        )
    secondary = _lookup(secondary_ref, profiles, task_id, rule.id, "Secondary")
    _check_compat(rule, secondary, "Secondary")
    return ResolvedTolerance(primary=primary, secondary=secondary)


__all__ = [
    "ToleranceKind",
    "ToleranceProfile",
    "ResolvedTolerance",
    "build_profile_map",
    "resolve_for_rule",
]

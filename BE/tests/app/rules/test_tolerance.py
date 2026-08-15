"""Tolerance resolver + engine pre-flight tests (Plan 90 Step 89).

Covers spec `spec/21-app/34-tolerance-model.md`:
  §3 profile validation per kind (Scalar/Percent/XY/MatchPercent)
  §4 rule-kind -> tolerance-kind compat matrix
  §5 resolution + missing-profile handling
  §7 error taxonomy: ToleranceInvalid / Incompatible / Unresolved / CrossTask
Plus engine deactivation of rules whose tolerance cannot resolve.
"""

from __future__ import annotations

import pytest

from rule_kernel.engine import evaluate_bundle
from rule_kernel.models import (
    RuleBundle,
    RuleContext,
    RuleSpec,
    RuleStatus,
    Verdict,
)
from rule_kernel.tolerance import (
    ResolvedTolerance,
    ToleranceKind,
    ToleranceProfile,
    build_profile_map,
    resolve_for_rule,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


TASK_ID = "01TASK000000000000000000AB"


def _profile(pid: str, kind: str, params: dict, name: str | None = None) -> dict:
    return {
        "ProfileId": pid,
        "ProfileName": name or f"P_{pid}",
        "Kind": kind,
        "ParamsJson": params,
    }


def _mp(pid: str = "01P_MP_MIN80", min_pct: float = 80.0) -> dict:
    return _profile(pid, "MatchPercent", {"MinPercent": min_pct})


def _sr(pid: str = "01P_SR_1_10", lo: float = 1, hi: float = 10) -> dict:
    return _profile(pid, "ScalarRange", {"Min": lo, "Max": hi})


# ---- §3 profile validation ------------------------------------------------


def test_scalar_range_valid():
    m = build_profile_map([_sr()], TASK_ID)
    assert m["01P_SR_1_10"].kind is ToleranceKind.SCALAR_RANGE


def test_scalar_range_rejects_min_gt_max():
    with pytest.raises(AppError) as exc:
        build_profile_map([_sr(lo=10, hi=1)], TASK_ID)
    assert exc.value.code is ErrorCode.E_TOLERANCE_UNRESOLVED
    assert exc.value.details["ReasonCode"] == "ToleranceInvalid"


def test_scalar_range_rejects_non_numeric():
    with pytest.raises(AppError) as exc:
        build_profile_map([_profile("x", "ScalarRange",
                                    {"Min": "1", "Max": 2})], TASK_ID)
    assert exc.value.details["ReasonCode"] == "ToleranceInvalid"


def test_scalar_range_rejects_bool_as_number():
    with pytest.raises(AppError):
        build_profile_map([_profile("x", "ScalarRange",
                                    {"Min": True, "Max": 2})], TASK_ID)


def test_percent_range_valid():
    m = build_profile_map(
        [_profile("x", "PercentRange",
                  {"MinPercent": 10, "MaxPercent": 90, "Inclusive": "Both"})],
        TASK_ID,
    )
    assert m["x"].kind is ToleranceKind.PERCENT_RANGE


def test_percent_range_rejects_out_of_bounds():
    with pytest.raises(AppError):
        build_profile_map([_profile("x", "PercentRange",
                                    {"MinPercent": -1, "MaxPercent": 50})],
                          TASK_ID)


def test_percent_range_rejects_inverted():
    with pytest.raises(AppError):
        build_profile_map([_profile("x", "PercentRange",
                                    {"MinPercent": 60, "MaxPercent": 50})],
                          TASK_ID)


def test_percent_range_rejects_bad_inclusive():
    with pytest.raises(AppError):
        build_profile_map([_profile("x", "PercentRange",
                                    {"MinPercent": 10, "MaxPercent": 90,
                                     "Inclusive": "Yes"})],
                          TASK_ID)


def test_match_percent_valid():
    m = build_profile_map([_mp()], TASK_ID)
    assert m["01P_MP_MIN80"].kind is ToleranceKind.MATCH_PERCENT


def test_match_percent_rejects_over_100():
    with pytest.raises(AppError):
        build_profile_map([_mp(min_pct=101)], TASK_ID)


def test_xy_box_valid():
    m = build_profile_map(
        [_profile("x", "XyBox",
                  {"CenterX": 10, "CenterY": 20,
                   "HalfWidthPx": 5, "HalfHeightPx": 6})],
        TASK_ID,
    )
    assert m["x"].kind is ToleranceKind.XY_BOX


def test_xy_box_rejects_zero_half_extent():
    with pytest.raises(AppError):
        build_profile_map(
            [_profile("x", "XyBox",
                      {"CenterX": 0, "CenterY": 0,
                       "HalfWidthPx": 0, "HalfHeightPx": 1})],
            TASK_ID,
        )


def test_xy_box_rejects_float_center():
    with pytest.raises(AppError):
        build_profile_map(
            [_profile("x", "XyBox",
                      {"CenterX": 1.5, "CenterY": 0,
                       "HalfWidthPx": 1, "HalfHeightPx": 1})],
            TASK_ID,
        )


def test_unknown_kind_rejected():
    with pytest.raises(AppError) as exc:
        build_profile_map([_profile("x", "Wobble", {})], TASK_ID)
    assert exc.value.details["ReasonCode"] == "ToleranceInvalid"


def test_missing_profile_id():
    with pytest.raises(AppError):
        build_profile_map([{"ProfileName": "n", "Kind": "MatchPercent",
                            "ParamsJson": {"MinPercent": 1}}], TASK_ID)


def test_duplicate_profile_id_rejected():
    with pytest.raises(AppError) as exc:
        build_profile_map([_mp("p1"), _mp("p1", 90)], TASK_ID)
    assert exc.value.details["ReasonCode"] == "ToleranceInvalid"
    assert "duplicate ProfileId" in str(exc.value)


def test_distinct_default_names_pass():
    m = build_profile_map([_mp("p1"), _mp("p2", 90)], TASK_ID)
    assert set(m.keys()) == {"p1", "p2"}



def test_duplicate_profile_name_rejected_explicit():
    a = _profile("p1", "MatchPercent", {"MinPercent": 80}, name="same")
    b = _profile("p2", "MatchPercent", {"MinPercent": 90}, name="same")
    with pytest.raises(AppError) as exc:
        build_profile_map([a, b], TASK_ID)
    assert exc.value.details["ReasonCode"] == "ToleranceInvalid"


# ---- §4 compat matrix + §5 resolution -------------------------------------


def _rule(kind: str, ref: str = "01P_MP_MIN80",
          secondary: str | None = None, rid: str = "r1") -> RuleSpec:
    params: dict = {"ToleranceRef": ref}
    if secondary is not None:
        params["SecondaryToleranceRef"] = secondary
    return RuleSpec(id=rid, name=f"n_{rid}", kind=kind, params=params)


def test_resolve_match_percent_for_presence():
    profs = build_profile_map([_mp()], TASK_ID)
    rt = resolve_for_rule(_rule("PresenceAbsence"), profs, TASK_ID)
    assert isinstance(rt, ResolvedTolerance)
    assert rt.primary.kind is ToleranceKind.MATCH_PERCENT
    assert rt.secondary is None


def test_resolve_missing_ref_is_unresolved():
    profs = build_profile_map([_mp()], TASK_ID)
    r = RuleSpec(id="r", name="n", kind="PresenceAbsence", params={})
    with pytest.raises(AppError) as exc:
        resolve_for_rule(r, profs, TASK_ID)
    assert exc.value.code is ErrorCode.E_TOLERANCE_UNRESOLVED
    assert exc.value.details["ReasonCode"] == "ToleranceUnresolved"


def test_resolve_unknown_ref_is_unresolved():
    profs = build_profile_map([_mp()], TASK_ID)
    with pytest.raises(AppError) as exc:
        resolve_for_rule(_rule("PresenceAbsence", ref="does-not-exist"),
                         profs, TASK_ID)
    assert exc.value.details["ReasonCode"] == "ToleranceUnresolved"


def test_resolve_incompatible_kind():
    profs = build_profile_map([_sr()], TASK_ID)
    with pytest.raises(AppError) as exc:
        resolve_for_rule(_rule("PresenceAbsence", ref="01P_SR_1_10"),
                         profs, TASK_ID)
    assert exc.value.code is ErrorCode.E_TOLERANCE_INCOMPATIBLE


def test_resolve_cross_task_ref_rejected():
    profs = build_profile_map([_mp()], TASK_ID)
    r = _rule("PresenceAbsence", ref="OTHER_TASK:01P_MP_MIN80")
    with pytest.raises(AppError) as exc:
        resolve_for_rule(r, profs, TASK_ID)
    assert exc.value.details["ReasonCode"] == "ToleranceCrossTask"


def test_resolve_task_scoped_ref_matches_owning_task():
    profs = build_profile_map([_mp()], TASK_ID)
    r = _rule("PresenceAbsence", ref=f"{TASK_ID}:01P_MP_MIN80")
    rt = resolve_for_rule(r, profs, TASK_ID)
    assert rt.primary.profile_id == "01P_MP_MIN80"


def test_resolve_count_supports_secondary_match_percent():
    profs = build_profile_map([_sr("01P_SR"), _mp("01P_MP")], TASK_ID)
    r = _rule("Count", ref="01P_SR", secondary="01P_MP")
    rt = resolve_for_rule(r, profs, TASK_ID)
    assert rt.primary.kind is ToleranceKind.SCALAR_RANGE
    assert rt.secondary is not None
    assert rt.secondary.kind is ToleranceKind.MATCH_PERCENT


def test_resolve_secondary_incompatible():
    profs = build_profile_map([_sr("01P_SR"),
                                _profile("01P_XY", "XyBox",
                                         {"CenterX": 0, "CenterY": 0,
                                          "HalfWidthPx": 1,
                                          "HalfHeightPx": 1})],
                              TASK_ID)
    r = _rule("Count", ref="01P_SR", secondary="01P_XY")
    with pytest.raises(AppError) as exc:
        resolve_for_rule(r, profs, TASK_ID)
    assert exc.value.code is ErrorCode.E_TOLERANCE_INCOMPATIBLE
    assert exc.value.details["Slot"] == "Secondary"


def test_resolve_unknown_rule_kind_is_incompatible():
    profs = build_profile_map([_mp()], TASK_ID)
    r = _rule("Wobble")
    with pytest.raises(AppError) as exc:
        resolve_for_rule(r, profs, TASK_ID)
    assert exc.value.code is ErrorCode.E_TOLERANCE_INCOMPATIBLE


# ---- engine pre-flight ---------------------------------------------------


def _ctx(profiles: list | None = None, task_id: str = TASK_ID) -> RuleContext:
    md: dict = {}
    if profiles is not None:
        md["ToleranceProfiles"] = profiles
        md["TaskId"] = task_id
    return RuleContext(run_id="run1", frame_path="/dev/null",
                       evaluated_at="2026-07-21T00:00:00Z", metadata=md)


def _passing_pa_rule(rid: str, ref: str) -> RuleSpec:
    # Rule kind that resolves without an evaluator entry (no bound region).
    # We only care the engine reaches the predicate; result verdict shape
    # is asserted only for the SKIPPED-inactivation path below.
    return RuleSpec(id=rid, name=rid, kind="PresenceAbsence",
                    status=RuleStatus.ACTIVE,
                    params={"ToleranceRef": ref})


def test_engine_deactivates_rule_when_ref_missing():
    good = _passing_pa_rule("r_ok", "01P_MP_MIN80")
    bad = _passing_pa_rule("r_bad", "missing")
    bundle = RuleBundle(bundle_id="b1", version=1, mode="full",
                        rules=(good, bad))
    result = evaluate_bundle(_ctx([_mp()]), bundle)

    inact = [j for j in result.judgments if j.rule_id == "r_bad"]
    assert len(inact) == 1
    j = inact[0]
    assert j.verdict is Verdict.SKIPPED
    assert j.details["StatusReason"] == "ToleranceUnresolved"
    assert j.details["ErrorCode"] == "E_TOLERANCE_UNRESOLVED"
    # counters count r_bad as inactive, not active
    assert result.inactive == 1
    assert result.active == 1


def test_engine_deactivates_on_incompatible_kind():
    r = _passing_pa_rule("r", "01P_SR_1_10")
    bundle = RuleBundle(bundle_id="b1", version=1, mode="full", rules=(r,))
    result = evaluate_bundle(_ctx([_sr()]), bundle)
    j = result.judgments[0]
    assert j.verdict is Verdict.SKIPPED
    assert j.details["ErrorCode"] == "E_TOLERANCE_INCOMPATIBLE"
    assert result.inactive == 1
    assert result.active == 0


def test_engine_skips_preflight_when_profiles_absent():
    # Legacy call site (no ToleranceProfiles in metadata) MUST NOT raise
    # even if rules omit ToleranceRef entirely - preserves Steps 79-88 tests.
    r = RuleSpec(id="r", name="r", kind="PresenceAbsence",
                 status=RuleStatus.INACTIVE, params={})
    bundle = RuleBundle(bundle_id="b1", version=1, mode="full", rules=(r,))
    result = evaluate_bundle(_ctx(None), bundle)
    assert result.total == 1
    assert result.inactive == 1


def test_engine_injects_resolved_tolerances_into_metadata():
    """Evaluators must be able to read the typed window without re-parsing.

    We assert this by injecting a probe evaluator via the predicates
    registry that captures its RuleContext.
    """
    from rule_kernel import predicates as reg

    captured: dict = {}

    def probe(ctx: RuleContext, rule: RuleSpec):
        captured["metadata_keys"] = sorted(ctx.metadata.keys())
        captured["resolved"] = ctx.metadata["ResolvedTolerances"][rule.id]
        return _pass_judgment(rule)

    from rule_kernel.models import RuleJudgment as _RJ

    def _pass_judgment(rule):
        return _RJ(rule_id=rule.id, verdict=Verdict.PASS, message="ok",
                   details={"ReasonCode": "Ok"})

    original = reg._REGISTRY.get("PresenceAbsence")  # type: ignore[attr-defined]
    reg._REGISTRY["PresenceAbsence"] = probe  # type: ignore[attr-defined]
    try:
        r = _passing_pa_rule("r", "01P_MP_MIN80")
        bundle = RuleBundle(bundle_id="b1", version=1, mode="full", rules=(r,))
        evaluate_bundle(_ctx([_mp()]), bundle)
    finally:
        if original is None:
            reg._REGISTRY.pop("PresenceAbsence", None)  # type: ignore[attr-defined]
        else:
            reg._REGISTRY["PresenceAbsence"] = original  # type: ignore[attr-defined]

    assert "ResolvedTolerances" in captured["metadata_keys"]
    assert "PriorJudgments" in captured["metadata_keys"]
    assert isinstance(captured["resolved"], ResolvedTolerance)
    assert captured["resolved"].primary.kind is ToleranceKind.MATCH_PERCENT


def test_engine_deactivation_is_not_short_circuit():
    """Spec 24 §3: inactive rules don't count toward pass/fail/error and
    MUST NOT trigger short-circuit stop. Confirm subsequent active rules
    still evaluate in short-circuit mode when a preceding rule inactivated."""
    bad = _passing_pa_rule("bad", "missing")
    ok = _passing_pa_rule("ok", "01P_MP_MIN80")
    bundle = RuleBundle(bundle_id="b1", version=1, mode="short-circuit",
                        rules=(bad, ok))

    # Register a passing probe for PresenceAbsence
    from rule_kernel import predicates as reg
    from rule_kernel.models import RuleJudgment as _RJ

    def probe(ctx, rule):
        return _RJ(rule_id=rule.id, verdict=Verdict.PASS, message="",
                   details={"ReasonCode": "Ok"})

    original = reg._REGISTRY.get("PresenceAbsence")  # type: ignore[attr-defined]
    reg._REGISTRY["PresenceAbsence"] = probe  # type: ignore[attr-defined]
    try:
        result = evaluate_bundle(_ctx([_mp()]), bundle)
    finally:
        if original is None:
            reg._REGISTRY.pop("PresenceAbsence", None)  # type: ignore[attr-defined]
        else:
            reg._REGISTRY["PresenceAbsence"] = original  # type: ignore[attr-defined]

    assert not result.stopped_early
    verdicts = {j.rule_id: j.verdict for j in result.judgments}
    assert verdicts["bad"] is Verdict.SKIPPED
    assert verdicts["ok"] is Verdict.PASS
    assert result.active == 1 and result.inactive == 1

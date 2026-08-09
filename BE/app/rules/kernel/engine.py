"""Pure `evaluate_bundle` entrypoint (Plan 90 Step 79, extended Step 81).

Kernel invariants (mirrored by tests):

  1. `mode` MUST be "full" or "short-circuit" (spec 49 §4). Anything
     else raises `AppError(E_RULE_BUNDLE_INVALID)`.
  2. `RuleSet` counters obey spec 24 §3:
        total == active + silent + inactive
        pass_count + fail_count + error_count <= active
     Silent rules are evaluated + emitted as judgments but do NOT
     contribute to pass/fail/error counters or overall verdict.
     Inactive rules are skipped entirely.
  3. Overall `verdict`:
        - Error if any Active rule errored (highest precedence).
        - Fail if any Active rule failed.
        - Pass otherwise.
     Precedence follows spec 22 §4 (Error > Fail > Pass).
  4. `mode="short-circuit"` early-exits Active-rule iteration at first
     FAIL or ERROR. Remaining rules (including Silent) are skipped.
  5. Kernel is clock-free: `evaluated_at` comes from `RuleContext`.
  6. Predicate lookup goes through `predicates.get(kind)`. Unknown
     kinds surface as `AppError(E_RULE_EVAL_FAILED,
     ReasonCode=RuleUnsupported)`, captured as an Error judgment - never
     swallowed silently.
"""

from __future__ import annotations

import logging
from dataclasses import replace

_log = logging.getLogger(__name__)

from BE.app.rules.kernel import predicates as _predicates
from BE.app.rules.kernel import telemetry as _telemetry
from BE.app.rules.kernel import tolerance as _tolerance
from BE.app.rules.kernel.models import (
    RuleBundle,
    RuleContext,
    RuleJudgment,
    RuleResult,
    RuleSpec,
    RuleStatus,
    Verdict,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_VALID_MODES = frozenset({"full", "short-circuit"})
_TOLERANCE_FAILURE_CODES = frozenset({
    ErrorCode.E_TOLERANCE_UNRESOLVED,
    ErrorCode.E_TOLERANCE_INCOMPATIBLE,
})


def _count_by_status(bundle: RuleBundle) -> tuple[int, int, int, int]:
    total = len(bundle.rules)
    active = sum(1 for r in bundle.rules if r.status is RuleStatus.ACTIVE)
    silent = sum(1 for r in bundle.rules if r.status is RuleStatus.SILENT)
    inactive = sum(1 for r in bundle.rules if r.status is RuleStatus.INACTIVE)
    return total, active, inactive, silent


def _validate_bundle(bundle: RuleBundle) -> None:
    if bundle.mode not in _VALID_MODES:
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            f"bundle.mode must be one of {sorted(_VALID_MODES)}, got {bundle.mode!r}",
            details={"BundleId": bundle.bundle_id, "Mode": bundle.mode},
        )


def _dispatch(ctx: RuleContext, rule: RuleSpec) -> tuple[RuleJudgment, str]:
    """Return (judgment, PredicateVersion). AppError -> Error judgment."""
    try:
        predicate = _predicates.get(rule.kind)
    except AppError as ae:
        return _error_judgment(rule, ae), _telemetry.KERNEL_PREDICATE_VERSION
    version = _telemetry.predicate_version(predicate)
    try:
        return predicate(ctx, rule), version
    except AppError as ae:
        return _error_judgment(rule, ae), version


def _error_judgment(rule: RuleSpec, ae: AppError) -> RuleJudgment:
    details = dict(ae.details or {})
    details.setdefault("ReasonCode", "RuleBadInput")
    details.setdefault("RuleId", rule.id)
    details.setdefault("RuleKind", rule.kind)
    return RuleJudgment(
        rule_id=rule.id,
        verdict=Verdict.ERROR,
        message=str(ae),
        details=details,
    )


def _evaluate_one(ctx: RuleContext, rule: RuleSpec) -> RuleJudgment:
    """Dispatch + attach telemetry (LatencyMs, PredicateVersion, RoiHash).

    Telemetry lands on EVERY judgment (Pass, Fail, Error) so downstream
    persistence (Step 96) and release audit (Step 111+) have a uniform
    schema regardless of outcome. RoiHash is omitted when the frame or
    SearchRegion is absent/invalid: those cases already surface as an
    Error judgment via the predicate, so a missing hash is not silent
    failure.
    """
    start = _telemetry.perf_now_ms()
    judgment, version = _dispatch(ctx, rule)
    latency_ms = round(_telemetry.perf_now_ms() - start, 4)
    roi = _telemetry.try_roi_hash(ctx, rule)
    details = dict(judgment.details)
    details["LatencyMs"] = latency_ms
    details["PredicateVersion"] = version
    if roi is not None:
        details["RoiHash"] = roi
    judgment = replace(judgment, details=details)
    if rule.timeout_ms is not None and latency_ms > rule.timeout_ms:
        return _timeout_judgment(rule, judgment, latency_ms)
    return judgment


def _timeout_judgment(
    rule: RuleSpec, judgment: RuleJudgment, latency_ms: float,
) -> RuleJudgment:
    """Convert an over-budget judgment into a timeout Error (spec 33 §5).

    The predicate ran to completion (Python cannot preempt CPU-bound
    numpy work reliably), but the spec-mandated budget was exceeded:
    surface it loudly with `ErrorCode=E_RULE_TIMEOUT` so upstream (CLI
    IPC, TaskDB writer, FE overlay) can flag budget regressions instead
    of silently accepting a slow rule. Original telemetry is preserved
    for post-mortem.
    """
    details = dict(judgment.details)
    details["ErrorCode"] = ErrorCode.E_RULE_TIMEOUT.value
    details["ReasonCode"] = "RuleTimeout"
    details["TimeoutMs"] = rule.timeout_ms
    details["ActualLatencyMs"] = latency_ms
    details["OriginalVerdict"] = judgment.verdict.value
    details["RuleId"] = rule.id
    details["RuleKind"] = rule.kind
    _log.warning(
        "rule.timeout rule_id=%s kind=%s budget_ms=%s actual_ms=%s",
        rule.id, rule.kind, rule.timeout_ms, latency_ms,
    )
    return RuleJudgment(
        rule_id=rule.id,
        verdict=Verdict.ERROR,
        message=f"rule exceeded TimeoutMs={rule.timeout_ms}ms (actual={latency_ms}ms)",
        details=details,
    )


def _skipped_judgment(rule: RuleSpec) -> RuleJudgment:
    """Emit an explicit `Skipped` judgment for a rule that never ran.

    Downstream persistence (Step 96) and FE (Step 131+) can then
    distinguish "not evaluated because a prior rule short-circuited"
    from "not present in the bundle". Silent skipped rules also get
    this marker (they were emitted-when-not-skipped, so their absence
    from `judgments` would be a wire regression).
    """
    return RuleJudgment(
        rule_id=rule.id,
        verdict=Verdict.SKIPPED,
        message="skipped: short-circuit stop upstream",
        details={
            "ReasonCode": "ShortCircuitStop",
            "RuleId": rule.id,
            "RuleKind": rule.kind,
            "RuleStatus": rule.status.value,
        },
    )


def _tolerance_inactivation(rule: RuleSpec, ae: AppError) -> RuleJudgment:
    """SKIPPED judgment carrying spec 34 §7 reason for a deactivated rule."""
    details = dict(ae.details or {})
    details.setdefault("ReasonCode", "ToleranceUnresolved")
    details.setdefault("RuleId", rule.id)
    details.setdefault("RuleKind", rule.kind)
    details["RuleStatus"] = RuleStatus.INACTIVE.value
    details["StatusReason"] = details["ReasonCode"]
    details["ErrorCode"] = ae.code.value
    return RuleJudgment(
        rule_id=rule.id,
        verdict=Verdict.SKIPPED,
        message=str(ae),
        details=details,
    )


def _preflight_tolerances(
    ctx: RuleContext, bundle: RuleBundle,
) -> tuple[dict[str, "_tolerance.ResolvedTolerance"], dict[str, RuleJudgment]]:
    """Resolve every non-Inactive rule's ToleranceRef per spec 34 §5.

    Opt-in: if `ctx.metadata["ToleranceProfiles"]` is absent, skip entirely
    so legacy call sites (Steps 79-88 tests) keep passing. When present,
    every failure inactivates the offending rule at run time rather than
    silently passing (§7 requires E_TOLERANCE_* to block, not swallow).
    """
    profiles_json = ctx.metadata.get("ToleranceProfiles")
    if profiles_json is None:
        return {}, {}
    task_id = ctx.metadata.get("TaskId") or bundle.bundle_id
    profiles = _tolerance.build_profile_map(profiles_json, task_id)
    resolved: dict[str, _tolerance.ResolvedTolerance] = {}
    inactivated: dict[str, RuleJudgment] = {}
    for rule in bundle.rules:
        if rule.status is RuleStatus.INACTIVE:
            continue
        try:
            resolved[rule.id] = _tolerance.resolve_for_rule(rule, profiles, task_id)
        except AppError as ae:
            if ae.code not in _TOLERANCE_FAILURE_CODES:
                raise
            inactivated[rule.id] = _tolerance_inactivation(rule, ae)
    return resolved, inactivated


def _effective_counts(
    bundle: RuleBundle, inactivated: dict[str, RuleJudgment],
) -> tuple[int, int, int, int]:
    total = len(bundle.rules)
    active = 0
    silent = 0
    inactive = 0
    for r in bundle.rules:
        if r.id in inactivated or r.status is RuleStatus.INACTIVE:
            inactive += 1
        elif r.status is RuleStatus.SILENT:
            silent += 1
        else:
            active += 1
    return total, active, inactive, silent


def evaluate_bundle(ctx: RuleContext, bundle: RuleBundle) -> RuleResult:
    """Evaluate `bundle` against the frame described by `ctx`.

    Pure function: no I/O, no vendor calls. `perf_now_ms` is used ONLY
    to measure aggregate wall-time for the whole bundle - predicates
    remain clock-free and unit-testable via `RuleContext.evaluated_at`.
    """
    _validate_bundle(bundle)
    resolved_tol, inactivated = _preflight_tolerances(ctx, bundle)
    total, active, inactive, silent = _effective_counts(bundle, inactivated)

    judgments: list[RuleJudgment] = []
    pass_count = 0
    fail_count = 0
    error_count = 0
    skipped_count = 0
    short_circuit = bundle.mode == "short-circuit"
    stop_reason: str | None = None
    stop_at_rule_id: str | None = None

    # Per-run prior-judgment view (spec 33 §6 forward-ref ban) plus resolved
    # tolerances (spec 34 §5) so evaluators can read the typed window without
    # re-parsing bundle metadata. Both keys are engine-owned; caller metadata
    # is preserved verbatim via `**ctx.metadata`.
    prior: dict[str, RuleJudgment] = {}
    run_ctx = replace(ctx, metadata={
        **ctx.metadata,
        "PriorJudgments": prior,
        "ResolvedTolerances": resolved_tol,
    })

    bundle_start = _telemetry.perf_now_ms()
    stop_index: int | None = None
    for index, rule in enumerate(bundle.rules):
        if rule.status is RuleStatus.INACTIVE:
            continue
        if rule.id in inactivated:
            judgment = inactivated[rule.id]
            judgments.append(judgment)
            prior[rule.id] = judgment
            continue

        judgment = _evaluate_one(run_ctx, rule)
        judgments.append(judgment)
        prior[rule.id] = judgment

        if rule.status is RuleStatus.SILENT:
            continue

        if judgment.verdict is Verdict.PASS:
            pass_count += 1
        elif judgment.verdict is Verdict.FAIL:
            fail_count += 1
            if short_circuit:
                stop_reason = "FirstFail"
                stop_at_rule_id = rule.id
                stop_index = index
                break
        else:  # ERROR
            error_count += 1
            if short_circuit:
                stop_reason = "FirstError"
                stop_at_rule_id = rule.id
                stop_index = index
                break

    if stop_index is not None:
        for rule in bundle.rules[stop_index + 1 :]:
            if rule.status is RuleStatus.INACTIVE:
                continue
            if rule.id in inactivated:
                continue
            judgments.append(_skipped_judgment(rule))
            skipped_count += 1

    total_latency_ms = round(_telemetry.perf_now_ms() - bundle_start, 4)

    if error_count > 0:
        overall = Verdict.ERROR
    elif fail_count > 0:
        overall = Verdict.FAIL
    else:
        overall = Verdict.PASS

    return RuleResult(
        verdict=overall,
        run_id=ctx.run_id,
        frame_path=ctx.frame_path,
        evaluated_at=ctx.evaluated_at,
        mode=bundle.mode,
        total=total,
        active=active,
        inactive=inactive,
        silent=silent,
        pass_count=pass_count,
        fail_count=fail_count,
        error_count=error_count,
        judgments=tuple(judgments),
        skipped_count=skipped_count,
        stopped_early=stop_index is not None,
        stop_reason=stop_reason,
        stop_at_rule_id=stop_at_rule_id,
        total_latency_ms=total_latency_ms,
    )


__all__ = ["evaluate_bundle"]

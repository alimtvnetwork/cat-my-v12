"""Bundle loader for the rule kernel (Plan 90 Step 80).

Parses the "loose" JSON bundle shape used by `processing-cli`
(`{schemaVersion, validationMode?, rules:[...]}`) into a validated
`RuleBundle`. Anchors:

- `spec/21-app/33-rule-catalog.md` §3 (closed `RuleKind`) and §3a
  (closed `Status` {Active, Inactive, Silent}).
- `spec/21-app/49-validation-order.md` §4 mode mapping:
    validationMode: "parallel"   -> mode = "full"
    validationMode: "sequential" -> mode = "short-circuit"
    missing / unknown            -> mode = "full" (safe default,
    surfaced via a Problem so the anomaly is visible).
- `spec/21-app/60-rule-acceptance-contract.md` §"Condition shape".

Contract: collect ALL problems, then raise ONE
`AppError(E_RULE_BUNDLE_INVALID)` with `details.Problems[]` so
`verify-bundle` (Step 62) and the FE rules editor can render one
actionable list. Never fall back to a partial `RuleBundle` on error.
"""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path
from typing import Any

from BE.app.rules.kernel.models import RuleBundle, RuleSpec, RuleStatus
from BE.app.rules.kernel.problems import BundleProblemCode as PC
from BE.app.rules.kernel.tolerance import build_profile_map, resolve_for_rule
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_RULE_KINDS = frozenset({
    "PresenceAbsence", "FlawDetect", "Count",
    "OcrText", "GraphicDisplayCheck", "MathExpression",
})
_STATUS_MAP = {"Active": RuleStatus.ACTIVE,
               "Silent": RuleStatus.SILENT,
               "Inactive": RuleStatus.INACTIVE}
_PRESENCE = frozenset({"present", "absent", "ignore"})
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
_MODE_MAP = {"parallel": "full", "sequential": "short-circuit"}


def _problem(path: str, code: PC, message: str, **extra: Any) -> dict[str, Any]:
    if not isinstance(code, PC):
        raise TypeError(f"_problem code must be BundleProblemCode, got {type(code).__name__}: {code!r}")
    p: dict[str, Any] = {"At": path, "Code": code.value, "Message": message}
    if extra:
        p["Details"] = extra
    return p


def _raise_invalid(path: Path, problems: list[dict[str, Any]], message: str) -> None:
    raise AppError(
        ErrorCode.E_RULE_BUNDLE_INVALID, message,
        {"Path": str(path), "Problems": problems,
         "ProblemCount": len(problems)},
    )


def _read_json(path: Path) -> Any:
    if not path.exists() or not path.is_file():
        _raise_invalid(path, [_problem("<file>", PC.BundleFileMissing,
                                       "bundle path does not exist or is not a file")],
                       f"bundle not found: {path}")
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        _raise_invalid(path, [_problem("<file>", PC.BundleReadError, str(exc))],
                       f"bundle unreadable: {path}")
        raise  # unreachable, appeases type-checkers
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        _raise_invalid(path, [_problem("<root>", PC.BundleJsonInvalid, exc.msg,
                                       Line=exc.lineno, Col=exc.colno)],
                       f"bundle is not valid JSON: {exc.msg}")


def _classify_status(rule: dict[str, Any]) -> RuleStatus:
    st = rule.get("status")
    if st in _STATUS_MAP:
        return _STATUS_MAP[st]
    if rule.get("enabled") is False:
        return RuleStatus.INACTIVE
    return RuleStatus.ACTIVE



def _validate_conditions(raw: Any, rid: str, idx: int) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    at = f"rules[{idx}].params.acceptanceConditions"
    if not isinstance(raw, str):
        return [_problem(at, PC.AcceptanceConditionsNotString,
                         "acceptanceConditions must be a JSON string",
                         RuleId=rid, Type=type(raw).__name__)]
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        return [_problem(at, PC.AcceptanceConditionsJsonInvalid,
                         f"acceptanceConditions is not parseable JSON: {exc.msg}",
                         RuleId=rid, Line=exc.lineno, Col=exc.colno)]
    if not isinstance(parsed, list):
        return [_problem(at, PC.AcceptanceConditionsNotArray,
                         "acceptanceConditions must parse to a JSON array",
                         RuleId=rid, Type=type(parsed).__name__)]
    for j, cond in enumerate(parsed):
        out.extend(_validate_condition(cond, rid, at, j))
    return out


def _validate_condition(cond: Any, rid: str, at: str, j: int) -> list[dict[str, Any]]:
    cat = f"{at}[{j}]"
    if not isinstance(cond, dict):
        return [_problem(cat, PC.AcceptanceConditionNotObject,
                         "condition must be a JSON object", RuleId=rid)]
    out: list[dict[str, Any]] = []
    presence = cond.get("presence", "ignore")
    if presence not in _PRESENCE:
        out.append(_problem(f"{cat}.presence", PC.AcceptancePresenceInvalid,
                            f"presence must be one of {sorted(_PRESENCE)}",
                            RuleId=rid, Got=presence))
    color = cond.get("targetColor", "")
    if color != "" and not (isinstance(color, str) and _HEX.match(color)):
        out.append(_problem(f"{cat}.targetColor", PC.AcceptanceTargetColorInvalid,
                            "targetColor must be empty or '#rrggbb'",
                            RuleId=rid, Got=color))
    sim = cond.get("similarityPct", 80)
    if not (isinstance(sim, int) and not isinstance(sim, bool) and 0 <= sim <= 100):
        out.append(_problem(f"{cat}.similarityPct", PC.AcceptanceSimilarityOutOfRange,
                            "similarityPct must be an integer in [0..100]",
                            RuleId=rid, Got=sim))
    return out


def _validate_rule(rule: Any, idx: int, strict_kind: bool) -> tuple[RuleSpec | None, int | None, list[dict[str, Any]]]:
    at = f"rules[{idx}]"
    if not isinstance(rule, dict):
        return None, None, [_problem(at, PC.RuleNotObject,
                                     "rule must be a JSON object",
                                     Type=type(rule).__name__)]
    problems: list[dict[str, Any]] = []
    rid = rule.get("id")
    if not isinstance(rid, str) or not rid.strip():
        problems.append(_problem(f"{at}.id", PC.RuleIdMissing,
                                 "rule.id must be a non-empty string"))
        rid = None
    kind = rule.get("kind")
    if kind is None and strict_kind:
        problems.append(_problem(f"{at}.kind", PC.RuleKindMissing,
                                 "rule.kind is required in strict mode", RuleId=rid))
    elif kind is not None and kind not in _RULE_KINDS:
        problems.append(_problem(f"{at}.kind", PC.RuleKindUnknown,
                                 f"rule.kind must be one of {sorted(_RULE_KINDS)}",
                                 RuleId=rid, Got=kind))
    status_raw = rule.get("status", "Active")
    if status_raw not in _STATUS_MAP:
        problems.append(_problem(f"{at}.status", PC.RuleStatusInvalid,
                                 f"rule.status must be one of {sorted(_STATUS_MAP)}",
                                 RuleId=rid, Got=status_raw))
    order_raw = rule.get("orderIndex", rule.get("OrderIndex"))
    order_index: int | None = None
    if order_raw is not None:
        if isinstance(order_raw, bool) or not isinstance(order_raw, int):
            problems.append(_problem(f"{at}.orderIndex", PC.RuleOrderIndexInvalid,
                                     "orderIndex must be an integer",
                                     RuleId=rid, Got=order_raw))
        else:
            order_index = order_raw
    params = rule.get("params")
    if params is not None and not isinstance(params, dict):
        problems.append(_problem(f"{at}.params", PC.RuleParamsNotObject,
                                 "rule.params must be a JSON object",
                                 RuleId=rid, Type=type(params).__name__))
        params = None
    elif isinstance(params, dict) and "acceptanceConditions" in params:
        problems.extend(_validate_conditions(
            params["acceptanceConditions"], rid or f"<idx:{idx}>", idx))
    timeout_raw = rule.get("timeoutMs", rule.get("TimeoutMs"))
    timeout_ms: int | None = None
    if timeout_raw is not None:
        if isinstance(timeout_raw, bool) or not isinstance(timeout_raw, int) or timeout_raw <= 0:
            problems.append(_problem(f"{at}.timeoutMs", PC.RuleTimeoutMsInvalid,
                                     "timeoutMs must be a positive integer (ms)",
                                     RuleId=rid, Got=timeout_raw))
        else:
            timeout_ms = timeout_raw
    if rid is None or problems:
        return None, order_index, problems
    spec = RuleSpec(id=rid, name=str(rule.get("name", rid)),
                    kind=str(kind) if isinstance(kind, str) else "",
                    status=_classify_status(rule),
                    params=params or {},
                    timeout_ms=timeout_ms)
    return spec, order_index, problems


def _resolve_mode(raw: Any, problems: list[dict[str, Any]]) -> str:
    if raw is None:
        return "full"
    if isinstance(raw, str) and raw in _MODE_MAP:
        return _MODE_MAP[raw]
    problems.append(_problem(
        "validationMode", PC.ValidationModeUnknown,
        f"validationMode must be one of {sorted(_MODE_MAP)}; defaulted to 'parallel'",
        Got=raw))
    return "full"


def _extract_math_refs(expr: str) -> list[tuple[str, str]]:
    """Return `(ruleId, outputKey)` pairs found in a MathExpression string.

    Mirrors `BE/app/rules/evaluators/math_expression.py::_extract_rule_ref` so
    the loader-time DAG check uses the exact same reference grammar the
    runtime evaluator does (spec 33 §6). Unparseable expressions are treated
    as ref-free here: `MathExpression` params validation (Step 88) rejects
    them at evaluation time with `RuleBadInput`.
    """
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        return []
    refs: list[tuple[str, str]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Attribute):
            inner = node.value
            if isinstance(inner.value, ast.Name) and inner.value.id == "Rule":
                refs.append((inner.attr, node.attr))
    return refs


def _build_ref_graph(specs: list[RuleSpec]) -> dict[str, list[tuple[str, str]]]:
    """Return `{ruleId: [(refRuleId, outputKey), ...]}` for MathExpression rules."""
    graph: dict[str, list[tuple[str, str]]] = {}
    for spec in specs:
        if spec.kind != "MathExpression":
            continue
        expr = spec.params.get("Expression") if isinstance(spec.params, dict) else None
        if not isinstance(expr, str):
            continue
        graph[spec.id] = _extract_math_refs(expr)
    return graph


def _validate_ref_cycles(specs: list[RuleSpec],
                         problems: list[dict[str, Any]]) -> set[frozenset[str]]:
    """Detect cycles in the MathExpression ref graph via iterative DFS.

    Emits one `RuleRefCycle` problem per distinct cycle (deduped by the
    frozenset of participating rule ids so A->B->A and B->A->B collapse).
    Returns the set of participating id-sets so `_validate_dag` can suppress
    duplicate `RuleRefForward` noise on edges inside a reported cycle.
    """
    graph = _build_ref_graph(specs)
    idx_by_id = {spec.id: i for i, spec in enumerate(specs)}
    reported: set[frozenset[str]] = set()
    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[str, int] = {rid: WHITE for rid in graph}
    for start in list(graph):
        if color[start] != WHITE:
            continue
        stack: list[tuple[str, int]] = [(start, 0)]
        path: list[str] = [start]
        color[start] = GRAY
        while stack:
            node, ei = stack[-1]
            edges = graph.get(node, [])
            if ei >= len(edges):
                color[node] = BLACK
                stack.pop()
                if path and path[-1] == node:
                    path.pop()
                continue
            stack[-1] = (node, ei + 1)
            nxt, _key = edges[ei]
            if nxt not in graph:
                continue  # non-Math target; forward/missing handled elsewhere
            if color[nxt] == GRAY and nxt in path:
                start_i = path.index(nxt)
                chain = path[start_i:] + [nxt]
                if len(chain) <= 2:
                    # Self-reference (len==1 cycle): leave for RuleRefForward
                    # so authors get the pre-existing single-edge diagnostic.
                    continue
                chain = path[start_i:] + [nxt]
                cycle_key = frozenset(chain[:-1])
                if cycle_key not in reported:
                    reported.add(cycle_key)
                    anchor = min(chain[:-1], key=lambda r: idx_by_id.get(r, 0))
                    at = f"rules[{idx_by_id.get(anchor, 0)}].params.Expression"
                    problems.append(_problem(
                        at, PC.RuleRefCycle,
                        "MathExpression rules form a reference cycle "
                        "(spec 33 §6)",
                        Chain=chain, RuleIds=sorted(cycle_key)))
                continue
            if color[nxt] == BLACK:
                continue
            color[nxt] = GRAY
            path.append(nxt)
            stack.append((nxt, 0))
    return reported


def _validate_dag(specs: list[RuleSpec], order: list[int],
                  problems: list[dict[str, Any]]) -> None:
    """Enforce spec 33 §6: MathExpression refs must point at rules with a
    strictly lower `orderIndex`. Missing ref target -> RuleRefMissing.
    Self-ref or forward-ref -> RuleRefForward. Cycles are reported first
    as `RuleRefCycle`; edges inside a reported cycle skip the forward-ref
    emission to avoid duplicate noise.
    """
    cycles = _validate_ref_cycles(specs, problems)
    in_cycle: set[str] = set().union(*cycles) if cycles else set()
    pos = {spec.id: order[i] for i, spec in enumerate(specs)}
    for i, spec in enumerate(specs):
        if spec.kind != "MathExpression":
            continue
        expr = spec.params.get("Expression") if isinstance(spec.params, dict) else None
        if not isinstance(expr, str):
            continue
        for (ref_id, key) in _extract_math_refs(expr):
            at = f"rules[{i}].params.Expression"
            if ref_id not in pos:
                problems.append(_problem(
                    at, PC.RuleRefMissing,
                    f"MathExpression references unknown rule {ref_id!r}",
                    RuleId=spec.id, RefRuleId=ref_id, OutputKey=key))
                continue
            if pos[ref_id] >= pos[spec.id]:
                if spec.id in in_cycle and ref_id in in_cycle:
                    continue
                problems.append(_problem(
                    at, PC.RuleRefForward,
                    "MathExpression may only reference rules with a strictly "
                    "lower orderIndex (spec 33 §6)",
                    RuleId=spec.id, RefRuleId=ref_id, OutputKey=key,
                    RefOrderIndex=pos[ref_id], SelfOrderIndex=pos[spec.id]))


def _validate_tolerances(specs: list[RuleSpec], profiles_raw: list[Any],
                         task_id: str, problems: list[dict[str, Any]]) -> tuple[dict[str, Any], ...]:
    """Validate `toleranceProfiles` and per-rule `ToleranceRef` at load time.

    Returns the raw profile dicts (frozen tuple) so the CLI can forward them
    into `ctx.metadata["ToleranceProfiles"]` unchanged. Any resolver failure
    is folded into `problems[]` so the bundle rejects with one list, not the
    first raise.
    """
    if not profiles_raw:
        return ()
    dicts: list[dict[str, Any]] = []
    for j, prof in enumerate(profiles_raw):
        if not isinstance(prof, dict):
            problems.append(_problem(
                f"toleranceProfiles[{j}]", PC.ToleranceProfileNotObject,
                "profile must be a JSON object", Type=type(prof).__name__))
            continue
        dicts.append(prof)
    try:
        pmap = build_profile_map(dicts, task_id)
    except AppError as exc:
        problems.append(_problem(
            "toleranceProfiles", PC.ToleranceProfilesInvalid, exc.message,
            **(exc.details or {})))
        return tuple(dicts)
    for i, spec in enumerate(specs):
        params = spec.params if isinstance(spec.params, dict) else {}
        if "ToleranceRef" not in params and "SecondaryToleranceRef" not in params:
            continue
        try:
            resolve_for_rule(spec, pmap, task_id)
        except AppError as exc:
            extra = {k: v for k, v in (exc.details or {}).items()
                     if k not in ("RuleId", "ErrorCode")}
            problems.append(_problem(
                f"rules[{i}].params.ToleranceRef", PC.RuleToleranceUnresolved,
                exc.message, RuleId=spec.id, ErrorCode=exc.code.value, **extra))
    return tuple(dicts)


def load_bundle(path: str | Path, *, strict_kind: bool = False) -> RuleBundle:
    """Load `path` into a validated `RuleBundle`.

    Raises `AppError(E_RULE_BUNDLE_INVALID)` with `details.Problems[]`
    when the bundle violates the acceptance contract. Never returns a
    partially-valid bundle: even one problem aborts.
    """
    bundle_path = Path(path).expanduser()
    data = _read_json(bundle_path)
    problems: list[dict[str, Any]] = []
    if not isinstance(data, dict):
        _raise_invalid(bundle_path, [_problem(
            "<root>", PC.BundleRootNotObject,
            "bundle root must be a JSON object", Type=type(data).__name__,
        )], "bundle root is not a JSON object")
        raise AssertionError  # unreachable
    schema_version = data.get("schemaVersion")
    if not isinstance(schema_version, int) or isinstance(schema_version, bool):
        problems.append(_problem("schemaVersion", PC.SchemaVersionInvalid,
                                 "schemaVersion must be an integer",
                                 Got=schema_version))
        schema_version = 0
    raw_rules = data.get("rules", [])
    if not isinstance(raw_rules, list):
        problems.append(_problem("rules", PC.RulesNotArray,
                                 "rules must be a JSON array",
                                 Type=type(raw_rules).__name__))
        raw_rules = []
    mode = _resolve_mode(data.get("validationMode"), problems)
    task_id_raw = data.get("taskId") or data.get("TaskId") or ""
    if task_id_raw and not isinstance(task_id_raw, str):
        problems.append(_problem("taskId", PC.TaskIdInvalid,
                                 "taskId must be a string",
                                 Type=type(task_id_raw).__name__))
        task_id_raw = ""
    profiles_raw = data.get("toleranceProfiles", []) or []
    if not isinstance(profiles_raw, list):
        problems.append(_problem("toleranceProfiles", PC.ToleranceProfilesNotArray,
                                 "toleranceProfiles must be a JSON array",
                                 Type=type(profiles_raw).__name__))
        profiles_raw = []
    specs, seen, orders = _collect_specs(raw_rules, strict_kind, problems)
    # Order-index uniqueness (spec 36 §6) is enforced when any provided.
    provided = [(i, o) for i, o in enumerate(orders) if o is not None]
    if provided:
        by_val: dict[int, int] = {}
        for i, val in provided:
            if val in by_val:
                problems.append(_problem(
                    f"rules[{i}].orderIndex", PC.RuleOrderIndexDuplicate,
                    "orderIndex must be unique within the bundle",
                    OrderIndex=val, PrevIndex=by_val[val]))
            else:
                by_val[val] = i
        if len(provided) != len(orders):
            missing = [i for i, o in enumerate(orders) if o is None]
            for i in missing:
                problems.append(_problem(
                    f"rules[{i}].orderIndex", PC.RuleOrderIndexMissing,
                    "orderIndex is required for every rule when any rule sets it",
                    RuleId=specs[i].id if i < len(specs) else None))
    eval_order = [(o if o is not None else i) for i, o in enumerate(orders)]
    tolerance_dicts = _validate_tolerances(
        specs, profiles_raw, str(task_id_raw), problems,
    )
    _validate_dag(specs, eval_order, problems)
    if problems:
        _raise_invalid(bundle_path, problems,
                       f"bundle failed acceptance contract: {len(problems)} problem(s)")
    bundle_id = str(data.get("bundleId") or bundle_path.stem)
    return RuleBundle(
        bundle_id=bundle_id, version=int(schema_version),
        mode=mode, rules=tuple(specs),
        task_id=str(task_id_raw), tolerance_profiles=tolerance_dicts,
    )


def _collect_specs(raw_rules: list[Any], strict_kind: bool,
                   problems: list[dict[str, Any]]) -> tuple[list[RuleSpec], dict[str, int], list[int | None]]:
    specs: list[RuleSpec] = []
    seen: dict[str, int] = {}
    orders: list[int | None] = []
    for i, rule in enumerate(raw_rules):
        spec, order_index, rule_problems = _validate_rule(rule, i, strict_kind)
        problems.extend(rule_problems)
        if spec is None:
            continue
        if spec.id in seen:
            problems.append(_problem(
                f"rules[{i}].id", PC.RuleIdDuplicate,
                f"duplicate rule.id (also at rules[{seen[spec.id]}])",
                RuleId=spec.id, PrevIndex=seen[spec.id]))
            continue
        seen[spec.id] = i
        specs.append(spec)
        orders.append(order_index)
    return specs, seen, orders


__all__ = ["load_bundle"]

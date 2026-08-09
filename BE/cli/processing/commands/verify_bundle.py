"""Plan 90 Step 62 - `processing-cli verify-bundle` subcommand.

Anchors:
- `spec/21-app/75-processing-cli.md` §Acceptance #4: `verify-bundle`
  exits non-zero with `E_RULE_BUNDLE_INVALID` when the bundle violates
  the acceptance contract.
- `spec/21-app/33-rule-catalog.md` §3 (closed `RuleKind` enum) and §3a
  (closed `Status` enum {Active, Inactive, Silent}).
- `spec/21-app/60-rule-acceptance-contract.md` §"Condition shape":
  `acceptanceConditions` is a JSON string in `rule.params`; each entry
  must have `presence in {present,absent,ignore}`, `targetColor` empty
  or `#rrggbb`, and integer `similarityPct` 0..100.
- Honesty rule: unlike `evaluate` (which short-circuits at the first
  `_read_bundle` failure), `verify-bundle` MUST collect ALL problems
  before raising, so the FE rules editor (Step 66) can render one
  actionable list, not force the author to fix issues one-by-one.

Scope note: today `evaluate`/`batch`/`watch`/`dry-run` consume the
"loose" JSON bundle (`{schemaVersion, rules:[...]}`). The full ZIP
`.catrules` container per `spec/21-app/70` is Plan 16 scope, not
Plan 90. This subcommand validates the same loose JSON that the rest
of the Processing CLI actually reads. Ratcheting to the ZIP layout is
tracked with the Plan 16 milestone and will land as a follow-on kind
argument (`--format catrules`) without breaking this contract.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# Closed enums (spec 33 §3 + §3a). Order-preserved for reporting.
_RULE_KINDS = (
    "PresenceAbsence", "FlawDetect", "Count",
    "OcrText", "GraphicDisplayCheck", "MathExpression",
)
_STATUSES = ("Active", "Inactive", "Silent")
_PRESENCE = ("present", "absent", "ignore")
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--bundle", required=True,
                        help="Path to the rule bundle JSON to validate.")
    parser.add_argument("--strict-kind", action="store_true",
                        help="Treat missing rule.kind as an error "
                             "(default: allowed for forward-compat).")


# ---- validation helpers ---------------------------------------------------

def _problem(path: str, code: str, message: str, **extra: Any) -> dict[str, Any]:
    p = {"At": path, "Code": code, "Message": message}
    if extra:
        p["Details"] = extra
    return p


def _validate_acceptance_conditions(
    raw: Any, rule_id: str, rule_idx: int,
) -> list[dict[str, Any]]:
    problems: list[dict[str, Any]] = []
    at = f"rules[{rule_idx}].params.acceptanceConditions"
    if not isinstance(raw, str):
        problems.append(_problem(
            at, "AcceptanceConditionsNotString",
            "acceptanceConditions must be a JSON string per spec 60 §Condition shape",
            RuleId=rule_id, Type=type(raw).__name__,
        ))
        return problems
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        problems.append(_problem(
            at, "AcceptanceConditionsJsonInvalid",
            f"acceptanceConditions is not parseable JSON: {exc.msg}",
            RuleId=rule_id, Line=exc.lineno, Col=exc.colno,
        ))
        return problems
    if not isinstance(parsed, list):
        problems.append(_problem(
            at, "AcceptanceConditionsNotArray",
            "acceptanceConditions must parse to a JSON array",
            RuleId=rule_id, Type=type(parsed).__name__,
        ))
        return problems
    for j, cond in enumerate(parsed):
        cat = f"{at}[{j}]"
        if not isinstance(cond, dict):
            problems.append(_problem(
                cat, "AcceptanceConditionNotObject",
                "condition must be a JSON object", RuleId=rule_id,
            ))
            continue
        presence = cond.get("presence", "ignore")
        if presence not in _PRESENCE:
            problems.append(_problem(
                f"{cat}.presence", "AcceptancePresenceInvalid",
                f"presence must be one of {_PRESENCE}",
                RuleId=rule_id, Got=presence,
            ))
        color = cond.get("targetColor", "")
        if color != "" and not (isinstance(color, str) and _HEX.match(color)):
            problems.append(_problem(
                f"{cat}.targetColor", "AcceptanceTargetColorInvalid",
                "targetColor must be empty or '#rrggbb'",
                RuleId=rule_id, Got=color,
            ))
        sim = cond.get("similarityPct", 80)
        if not (isinstance(sim, int) and not isinstance(sim, bool)
                and 0 <= sim <= 100):
            problems.append(_problem(
                f"{cat}.similarityPct", "AcceptanceSimilarityOutOfRange",
                "similarityPct must be an integer in [0..100]",
                RuleId=rule_id, Got=sim,
            ))
    return problems


def _validate_rule(rule: Any, idx: int, strict_kind: bool) -> tuple[str | None, list[dict[str, Any]]]:
    problems: list[dict[str, Any]] = []
    at = f"rules[{idx}]"
    if not isinstance(rule, dict):
        problems.append(_problem(at, "RuleNotObject",
                                 "rule must be a JSON object",
                                 Type=type(rule).__name__))
        return None, problems

    rid = rule.get("id")
    if not isinstance(rid, str) or not rid.strip():
        problems.append(_problem(f"{at}.id", "RuleIdMissing",
                                 "rule.id must be a non-empty string"))
        rid = None

    kind = rule.get("kind")
    if kind is None:
        if strict_kind:
            problems.append(_problem(f"{at}.kind", "RuleKindMissing",
                                     "rule.kind is required in strict mode",
                                     RuleId=rid))
    elif kind not in _RULE_KINDS:
        problems.append(_problem(f"{at}.kind", "RuleKindUnknown",
                                 f"rule.kind must be one of {_RULE_KINDS}",
                                 RuleId=rid, Got=kind))

    status = rule.get("status", "Active")
    if status not in _STATUSES:
        problems.append(_problem(f"{at}.status", "RuleStatusInvalid",
                                 f"rule.status must be one of {_STATUSES}",
                                 RuleId=rid, Got=status))

    params = rule.get("params")
    if params is not None and not isinstance(params, dict):
        problems.append(_problem(f"{at}.params", "RuleParamsNotObject",
                                 "rule.params must be a JSON object",
                                 RuleId=rid, Type=type(params).__name__))
    elif isinstance(params, dict) and "acceptanceConditions" in params:
        problems.extend(_validate_acceptance_conditions(
            params["acceptanceConditions"], rid or f"<idx:{idx}>", idx,
        ))

    return rid, problems


def _classify_status(rule: dict[str, Any]) -> str:
    st = rule.get("status", "Active")
    if st in ("Inactive", "Silent"):
        return st
    if rule.get("enabled") is False:
        return "Inactive"
    return "Active"


# ---- handler --------------------------------------------------------------

def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    bundle_path = Path(ns.bundle).expanduser()
    problems: list[dict[str, Any]] = []

    if not bundle_path.exists() or not bundle_path.is_file():
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            f"bundle not found: {bundle_path}",
            {"Path": str(bundle_path), "Problems": [
                _problem("<file>", "BundleFileMissing",
                         "bundle path does not exist or is not a file"),
            ]},
        )
    try:
        raw_text = bundle_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            f"bundle unreadable: {bundle_path}",
            {"Path": str(bundle_path), "Problems": [
                _problem("<file>", "BundleReadError", str(exc)),
            ]},
        ) from exc
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            f"bundle is not valid JSON: {exc.msg}",
            {"Path": str(bundle_path), "Problems": [
                _problem("<root>", "BundleJsonInvalid", exc.msg,
                         Line=exc.lineno, Col=exc.colno),
            ]},
        ) from exc

    if not isinstance(data, dict):
        problems.append(_problem("<root>", "BundleRootNotObject",
                                 "bundle root must be a JSON object",
                                 Type=type(data).__name__))
        data = {}

    schema_version = data.get("schemaVersion")
    if not isinstance(schema_version, int) or isinstance(schema_version, bool):
        problems.append(_problem("schemaVersion", "SchemaVersionInvalid",
                                 "schemaVersion must be an integer",
                                 Got=schema_version))

    rules = data.get("rules", [])
    if not isinstance(rules, list):
        problems.append(_problem("rules", "RulesNotArray",
                                 "rules must be a JSON array",
                                 Type=type(rules).__name__))
        rules = []

    seen_ids: dict[str, int] = {}
    for i, rule in enumerate(rules):
        rid, rule_problems = _validate_rule(rule, i, bool(ns.strict_kind))
        problems.extend(rule_problems)
        if rid is not None:
            if rid in seen_ids:
                problems.append(_problem(
                    f"rules[{i}].id", "RuleIdDuplicate",
                    f"duplicate rule.id (also at rules[{seen_ids[rid]}])",
                    RuleId=rid, PrevIndex=seen_ids[rid],
                ))
            else:
                seen_ids[rid] = i

    counts = {"Active": 0, "Inactive": 0, "Silent": 0}
    kinds: dict[str, int] = {}
    for rule in rules:
        if not isinstance(rule, dict):
            continue
        counts[_classify_status(rule)] = counts.get(_classify_status(rule), 0) + 1
        k = rule.get("kind")
        if isinstance(k, str):
            kinds[k] = kinds.get(k, 0) + 1

    if problems:
        ctx.logger.log(
            "ERROR", "verify_bundle.invalid",
            f"{len(problems)} problem(s) in {bundle_path.name}",
            code=ErrorCode.E_RULE_BUNDLE_INVALID.value,
            ctx={"Path": str(bundle_path), "ProblemCount": len(problems)},
        )
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            f"bundle failed acceptance contract: {len(problems)} problem(s)",
            {"Path": str(bundle_path), "Problems": problems,
             "ProblemCount": len(problems)},
        )

    summary = {
        "BundlePath": str(bundle_path),
        "SchemaVersion": schema_version,
        "RuleCount": len(rules),
        "ActiveCount": counts["Active"],
        "InactiveCount": counts["Inactive"],
        "SilentCount": counts["Silent"],
        "Kinds": kinds,
    }
    ctx.logger.log(
        "INFO", "verify_bundle.ok",
        f"bundle valid: {len(rules)} rule(s) in {bundle_path.name}",
        ctx=summary,
    )
    return summary

"""Problem[] taxonomy guard (Plan 90 Step 94).

Pins that every `_problem(...)` call site in `BE/app/rules/kernel/loader.py`
passes a `BundleProblemCode` enum member (via `PC.<name>`) instead of a
free-form string, and that every enum member is actually reachable from
at least one call site. Together these two checks prove the closed set is
both a floor (no drift) and a ceiling (no dead codes).
"""

from __future__ import annotations

import ast
from pathlib import Path

from rule_kernel.problems import ALL_CODES, BundleProblemCode

_LOADER = Path("BE/app/rules/kernel/loader.py")


def _collect_problem_calls() -> list[ast.Call]:
    tree = ast.parse(_LOADER.read_text(encoding="utf-8"))
    calls: list[ast.Call] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) \
                and node.func.id == "_problem":
            calls.append(node)
    return calls


def test_enum_values_are_pascal_case_and_match_names() -> None:
    for member in BundleProblemCode:
        assert member.name == member.value, member
        assert member.value[:1].isupper(), member.value


def test_every_problem_call_uses_enum_member() -> None:
    calls = _collect_problem_calls()
    assert calls, "expected at least one _problem() call in loader.py"
    for call in calls:
        # Signature: _problem(path, code, message, **extra)
        assert len(call.args) >= 2, ast.dump(call)
        code_arg = call.args[1]
        # Must be `PC.<name>` (ast.Attribute with value=Name('PC'))
        assert isinstance(code_arg, ast.Attribute), (
            f"line {call.lineno}: code must be PC.<name>, got "
            f"{ast.dump(code_arg)}"
        )
        assert isinstance(code_arg.value, ast.Name) and code_arg.value.id == "PC", (
            f"line {call.lineno}: code must be qualified as PC.<name>, got "
            f"{ast.dump(code_arg)}"
        )
        assert code_arg.attr in BundleProblemCode.__members__, (
            f"line {call.lineno}: PC.{code_arg.attr} is not a registered "
            f"BundleProblemCode member"
        )


def test_every_registered_code_is_reachable() -> None:
    calls = _collect_problem_calls()
    used = {
        c.args[1].attr for c in calls
        if isinstance(c.args[1], ast.Attribute)
        and isinstance(c.args[1].value, ast.Name)
        and c.args[1].value.id == "PC"
    }
    unused = set(BundleProblemCode.__members__) - used
    assert not unused, (
        f"registered but unreachable BundleProblemCode members "
        f"(remove or wire up): {sorted(unused)}"
    )


def test_runtime_guard_rejects_string_code() -> None:
    from rule_kernel.loader import _problem
    import pytest
    with pytest.raises(TypeError, match="BundleProblemCode"):
        _problem("<x>", "RuleKindUnknown", "should fail")  # type: ignore[arg-type]


def test_all_codes_matches_enum() -> None:
    assert ALL_CODES == frozenset(m.value for m in BundleProblemCode)
    assert len(ALL_CODES) == len(BundleProblemCode)

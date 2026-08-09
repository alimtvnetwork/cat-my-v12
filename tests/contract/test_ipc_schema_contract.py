"""Contract tests: every real IPC example payload validates against $defs.

Parametrized over:
  * every ``<!-- ipc:ref=X --> \\n ```json ... ``` `` block found under ``spec/``
    (must validate cleanly)
  * every block under ``linter-scripts/fixtures/ipc-examples/good/``
    (positive fixture, must validate cleanly)
  * every block under ``linter-scripts/fixtures/ipc-examples/bad/``
    (negative fixture, must produce at least one error)

Reuses the validator/loader from ``linter-scripts/check-ipc-examples.py``
so this suite catches the same drift CI catches, at the payload level.
"""

from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
CHECKER = ROOT / "linter-scripts" / "check-ipc-examples.py"
SCHEMA_DIR = ROOT / "spec" / "21-app" / "shell" / "schemas" / "ipc"
FIXTURE_GOOD = ROOT / "linter-scripts" / "fixtures" / "ipc-examples" / "good"
FIXTURE_BAD = ROOT / "linter-scripts" / "fixtures" / "ipc-examples" / "bad"


def _load_checker():
    spec = importlib.util.spec_from_file_location("_ipc_checker", CHECKER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


CHK = _load_checker()
BLOCK_RE: re.Pattern[str] = CHK.BLOCK_RE


def _extract(md_root: Path, schema_dir: Path) -> list[tuple[str, str, dict, dict, dict]]:
    """Return [(rel_path, ref, payload, roots, ref_index_entry), ...]."""
    out: list[tuple[str, str, dict, dict, dict]] = []
    if not md_root.exists() or not schema_dir.exists():
        return out
    ref_index, roots = CHK.build_ref_index(schema_dir)
    for md in sorted(md_root.rglob("*.md")):
        try:
            text = md.read_text(encoding="utf-8")
        except OSError:
            continue
        for match in BLOCK_RE.finditer(text):
            ref = match.group("ref")
            try:
                payload = json.loads(match.group("body"))
            except json.JSONDecodeError as exc:
                pytest.fail(f"{md}: invalid JSON in ipc:ref={ref}: {exc}")
            out.append((
                str(md.relative_to(ROOT)),
                ref,
                payload,
                roots,
                ref_index.get(ref, ("", {})),
            ))
    return out


SPEC_CASES = _extract(ROOT / "spec", SCHEMA_DIR)
GOOD_CASES = _extract(
    FIXTURE_GOOD, FIXTURE_GOOD / "spec" / "21-app" / "shell" / "schemas" / "ipc"
)
BAD_CASES = _extract(
    FIXTURE_BAD, FIXTURE_BAD / "spec" / "21-app" / "shell" / "schemas" / "ipc"
)


def _validate(ref: str, payload: dict, roots: dict, entry: tuple[str, dict]) -> list[str]:
    schema_file, node = entry
    if not schema_file:
        return [f"no schema $defs entry for '{ref}'"]
    errors: list[str] = []
    CHK.validate(roots[schema_file], node, payload, ref, errors)
    return errors


@pytest.mark.parametrize(
    ("source", "ref", "payload", "roots", "entry"),
    SPEC_CASES + GOOD_CASES,
    ids=[f"{s}::{r}" for s, r, *_ in SPEC_CASES + GOOD_CASES] or ["<none>"],
)
def test_valid_payloads(source, ref, payload, roots, entry) -> None:
    errors = _validate(ref, payload, roots, entry)
    assert not errors, f"{source} :: {ref} failed:\n  " + "\n  ".join(errors)


@pytest.mark.parametrize(
    ("source", "ref", "payload", "roots", "entry"),
    BAD_CASES,
    ids=[f"{s}::{r}" for s, r, *_ in BAD_CASES] or ["<none>"],
)
def test_bad_fixtures_fail(source, ref, payload, roots, entry) -> None:
    errors = _validate(ref, payload, roots, entry)
    assert errors, f"{source} :: {ref} was expected to fail validation but passed"


def test_at_least_one_case_discovered() -> None:
    assert SPEC_CASES or GOOD_CASES or BAD_CASES, (
        "no ipc:ref example blocks found under spec/ or fixtures/"
    )

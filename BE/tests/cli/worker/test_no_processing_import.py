"""Boundary scan: ``worker-cli`` MUST NOT transitively import processing code.

Root cause guarded: if `BE.cli.processing.*` (rule loader, evaluator kernel,
result writer) leaks into the `worker-cli` module graph, the capture bundle
gains rule-engine weight, and camera hosts without rule assets crash on
import. This test pins spec/21-app/74 §Boundary as the mirror of Step 69.

Fresh interpreter is required because sibling suites already load processing
code, so an in-process check would false-pass.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[4]

FORBIDDEN = (
    "BE.cli.processing",
    "BE.cli.processing.main",
    "BE.cli.processing.commands",
    "BE.cli.processing.commands.evaluate",
    "BE.cli.processing.commands.watch",
    "BE.cli.processing.commands.batch",
    "BE.cli.processing.commands.verify_bundle",
)


def _load_worker_modules() -> set[str]:
    """Import ``BE.cli.worker.main`` in a subprocess; return sys.modules keys."""
    script = (
        "import json, sys\n"
        "import BE.cli.worker.main  # noqa: F401\n"
        "from BE.cli.worker import subcommands as _subs  # noqa: F401\n"
        "import pkgutil\n"
        "for m in pkgutil.iter_modules(_subs.__path__, _subs.__name__ + '.'):\n"
        "    __import__(m.name)\n"
        "print(json.dumps(sorted(sys.modules.keys())))\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        text=True,
        check=True,
        cwd=str(_REPO_ROOT),
    )
    return set(json.loads(result.stdout.strip().splitlines()[-1]))


def test_worker_cli_does_not_import_processing_modules() -> None:
    loaded = _load_worker_modules()
    leaked = sorted(m for m in loaded if m in FORBIDDEN or m.startswith("BE.cli.processing"))
    assert not leaked, (
        f"worker-cli transitively imported forbidden processing modules: {leaked}. "
        "Move any shared helper into BE.cli.common or lazy-import inside the "
        "processing-owning subcommand."
    )


def test_worker_cli_does_not_import_rule_engine() -> None:
    loaded = _load_worker_modules()
    leaked = sorted(
        m for m in loaded
        if m.startswith("BE.app.rules") or m.startswith("BE.rule_engine")
    )
    assert not leaked, (
        f"worker-cli pulled rule-engine modules: {leaked}. Rule evaluation is "
        "processing-cli territory only."
    )

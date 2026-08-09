#!/usr/bin/env python3
"""Fail CI when the calibration report regresses vs the known-good baseline.

Compares ``worker/calibration-report.json`` (current) against
``worker/calibration-baseline.json`` (last known-good) and fails if, for any
kind that appears in the baseline:

  * ``separation.margin`` dropped by more than ``--margin-tol`` (default 0.05)
    below the baseline value.
  * ``separation.midpoint`` moved by more than ``--midpoint-tol`` (default
    0.10) from the baseline value in either direction.
  * ``separation.separable`` flipped from ``true`` to ``false``.
  * The kind is missing from the current report entirely.

Additional guards:

  * ``separation.margin`` in the current report is never allowed to fall
    below ``--margin-floor`` (default 0.15), regardless of baseline drift,
    because sub-floor margins indicate the scorer can no longer separate
    pass from fail cleanly.

Exit codes:
  0  no regressions
  1  one or more regressions detected
  2  usage / IO error

Refresh the baseline after an intentional scorer change with:

    python3 linter-scripts/check-calibration-regression.py --update-baseline
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CURRENT = REPO_ROOT / "worker" / "calibration-report.json"
DEFAULT_BASELINE = REPO_ROOT / "worker" / "calibration-baseline.json"


@dataclass(frozen=True)
class Thresholds:
    margin_tol: float
    midpoint_tol: float
    margin_floor: float


def _load(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        print(f"error: file not found: {path}", file=sys.stderr)
        sys.exit(2)
    except json.JSONDecodeError as exc:
        print(f"error: invalid JSON in {path}: {exc}", file=sys.stderr)
        sys.exit(2)


def _sep(entry: dict[str, Any]) -> dict[str, Any]:
    sep = entry.get("separation") or {}
    if not isinstance(sep, dict):
        return {}
    return sep


def compare(
    baseline: dict[str, Any],
    current: dict[str, Any],
    thr: Thresholds,
) -> list[str]:
    """Return a list of human-readable regression messages (empty = ok)."""
    problems: list[str] = []
    base_kinds = (baseline.get("per_kind") or {})
    curr_kinds = (current.get("per_kind") or {})

    for kind in sorted(base_kinds.keys()):
        base = base_kinds[kind]
        curr = curr_kinds.get(kind)
        if curr is None:
            problems.append(f"[{kind}] missing from current report (baseline had it).")
            continue

        b_sep = _sep(base)
        c_sep = _sep(curr)
        b_margin = b_sep.get("margin")
        c_margin = c_sep.get("margin")
        b_mid = b_sep.get("midpoint")
        c_mid = c_sep.get("midpoint")
        b_separable = bool(b_sep.get("separable"))
        c_separable = bool(c_sep.get("separable"))

        # margin drop vs baseline
        if isinstance(b_margin, (int, float)) and isinstance(c_margin, (int, float)):
            drop = float(b_margin) - float(c_margin)
            if drop > thr.margin_tol:
                problems.append(
                    f"[{kind}] margin dropped by {drop:.4f} "
                    f"(baseline {b_margin:.4f} -> current {c_margin:.4f}, "
                    f"tolerance {thr.margin_tol:.4f})."
                )
            if float(c_margin) < thr.margin_floor:
                problems.append(
                    f"[{kind}] margin {c_margin:.4f} is below floor "
                    f"{thr.margin_floor:.4f}."
                )

        # midpoint drift vs baseline (either direction)
        if isinstance(b_mid, (int, float)) and isinstance(c_mid, (int, float)):
            delta = abs(float(c_mid) - float(b_mid))
            if delta > thr.midpoint_tol:
                problems.append(
                    f"[{kind}] midpoint drifted by {delta:.4f} "
                    f"(baseline {b_mid:.4f} -> current {c_mid:.4f}, "
                    f"tolerance {thr.midpoint_tol:.4f})."
                )

        # separability flip
        if b_separable and not c_separable:
            problems.append(
                f"[{kind}] separable flipped from true to false."
            )

    return problems


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--current", type=Path, default=DEFAULT_CURRENT,
                        help="Path to the current calibration report JSON.")
    parser.add_argument("--baseline", type=Path, default=DEFAULT_BASELINE,
                        help="Path to the known-good baseline JSON.")
    parser.add_argument("--margin-tol", type=float,
                        default=float(os.environ.get("CAL_MARGIN_TOL", "0.05")),
                        help="Max allowed drop in margin vs baseline (default 0.05).")
    parser.add_argument("--midpoint-tol", type=float,
                        default=float(os.environ.get("CAL_MIDPOINT_TOL", "0.10")),
                        help="Max allowed drift in midpoint vs baseline (default 0.10).")
    parser.add_argument("--margin-floor", type=float,
                        default=float(os.environ.get("CAL_MARGIN_FLOOR", "0.15")),
                        help="Absolute floor for margin regardless of baseline "
                             "(default 0.15).")
    parser.add_argument("--update-baseline", action="store_true",
                        help="Copy current report over baseline and exit 0.")
    args = parser.parse_args(argv)

    if args.update_baseline:
        if not args.current.exists():
            print(f"error: current report not found at {args.current}",
                  file=sys.stderr)
            return 2
        args.baseline.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(args.current, args.baseline)
        print(f"updated baseline: {args.baseline} <- {args.current}")
        return 0

    thr = Thresholds(
        margin_tol=args.margin_tol,
        midpoint_tol=args.midpoint_tol,
        margin_floor=args.margin_floor,
    )
    baseline = _load(args.baseline)
    current = _load(args.current)

    problems = compare(baseline, current, thr)
    if problems:
        print("Calibration regression detected:", file=sys.stderr)
        for msg in problems:
            print(f"  - {msg}", file=sys.stderr)
        print(
            "\nIf this drift is intentional, refresh the baseline:\n"
            "  python3 linter-scripts/check-calibration-regression.py "
            "--update-baseline",
            file=sys.stderr,
        )
        return 1

    print(
        f"Calibration ok: margin_tol={thr.margin_tol}, "
        f"midpoint_tol={thr.midpoint_tol}, margin_floor={thr.margin_floor}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
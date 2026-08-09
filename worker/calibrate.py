"""Calibration pass for the validation scorer.

Loads `worker/fixtures/labels.json`, runs the scorers in `scorer.py`
against each fixture ROI, then sweeps thresholds in [0, 1] to find the
cutoff that maximises F1 per rule kind. Prints a summary table and
writes `worker/calibration-report.json` with the raw scores, chosen
thresholds, and confusion counts.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from scorer import run_rule  # noqa: E402

ROOT = Path(__file__).parent
FIXTURES = ROOT / "fixtures"


def load_roi(image_path: Path, roi: Dict[str, int]) -> np.ndarray:
    img = np.array(Image.open(image_path).convert("RGB"))
    x, y, w, h = roi["x"], roi["y"], roi["width"], roi["height"]
    return img[y:y + h, x:x + w]


def sweep(scores_labels: List[tuple[float, str]]) -> Dict[str, Any]:
    best = {"threshold": 0.5, "f1": 0.0, "tp": 0, "fp": 0, "tn": 0, "fn": 0}
    for t in np.linspace(0.0, 1.0, 101):
        tp = fp = tn = fn = 0
        for s, lab in scores_labels:
            pred = "pass" if s >= t else "fail"
            if pred == "pass" and lab == "pass":
                tp += 1
            elif pred == "pass" and lab == "fail":
                fp += 1
            elif pred == "fail" and lab == "fail":
                tn += 1
            else:
                fn += 1
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        if f1 > best["f1"]:
            best = {"threshold": round(float(t), 2), "f1": round(f1, 3),
                    "tp": tp, "fp": fp, "tn": tn, "fn": fn}
    return best


def distribution(values: List[float]) -> Dict[str, Any]:
    """Summary stats plus a 10-bin histogram over [0, 1] for thresholding."""
    if not values:
        return {"n": 0, "min": None, "max": None, "mean": None, "std": None,
                "p05": None, "p25": None, "p50": None, "p75": None, "p95": None,
                "histogram": [0] * 10, "raw": []}
    arr = np.asarray(values, dtype=float)
    hist, _ = np.histogram(arr, bins=10, range=(0.0, 1.0))
    return {
        "n": int(arr.size),
        "min": round(float(arr.min()), 4),
        "max": round(float(arr.max()), 4),
        "mean": round(float(arr.mean()), 4),
        "std": round(float(arr.std()), 4),
        "p05": round(float(np.percentile(arr, 5)), 4),
        "p25": round(float(np.percentile(arr, 25)), 4),
        "p50": round(float(np.percentile(arr, 50)), 4),
        "p75": round(float(np.percentile(arr, 75)), 4),
        "p95": round(float(np.percentile(arr, 95)), 4),
        "histogram": [int(x) for x in hist],
        "raw": [round(float(v), 4) for v in arr.tolist()],
    }


def separation_threshold(pass_scores: List[float], fail_scores: List[float]) -> Dict[str, Any]:
    """Midpoint between the fail-max and pass-min gives the maximally
    robust cutoff when the two distributions are separable. Returned
    alongside a `margin` so callers can flag near-overlapping kinds."""
    if not pass_scores or not fail_scores:
        return {"midpoint": None, "margin": None, "separable": False}
    p_min = float(min(pass_scores))
    f_max = float(max(fail_scores))
    margin = round(p_min - f_max, 4)
    return {
        "midpoint": round((p_min + f_max) / 2.0, 4),
        "margin": margin,
        "separable": margin > 0,
        "pass_min": round(p_min, 4),
        "fail_max": round(f_max, 4),
    }


def main() -> None:
    labels_path = FIXTURES / "labels.json"
    if not labels_path.exists():
        print("fixtures missing - run `python worker/fixtures/build.py` first")
        sys.exit(1)
    fixtures = json.loads(labels_path.read_text())

    per_kind: Dict[str, List[tuple[float, str]]] = {}
    detail: List[Dict[str, Any]] = []

    for f in fixtures:
        roi_arr = load_roi(FIXTURES / f["path"], f["roi"])
        score, debug = run_rule(f["kind"], roi_arr, f.get("params"))
        per_kind.setdefault(f["kind"], []).append((score, f["expected"]))
        clean_debug = {k: (float(v) if isinstance(v, (np.floating,)) else v)
                       for k, v in debug.items()}
        detail.append({"name": f["name"], "kind": f["kind"], "score": round(float(score), 3),
                       "expected": f["expected"], "debug": clean_debug})

    report: Dict[str, Any] = {"per_kind": {}, "detail": detail}
    print(f"{'kind':<6}{'n':>4}{'thr':>7}{'f1':>7}  {'sep':>7}  confusion (tp/fp/tn/fn)")
    for kind, pairs in sorted(per_kind.items()):
        best = sweep(pairs)
        pass_scores = [s for s, lab in pairs if lab == "pass"]
        fail_scores = [s for s, lab in pairs if lab == "fail"]
        sep = separation_threshold(pass_scores, fail_scores)
        report["per_kind"][kind] = {
            "n": len(pairs),
            **best,
            "separation": sep,
            "distributions": {
                "pass": distribution(pass_scores),
                "fail": distribution(fail_scores),
            },
        }
        margin_str = f"{sep['margin']:+.2f}" if sep["margin"] is not None else "  n/a"
        print(f"{kind:<6}{len(pairs):>4}{best['threshold']:>7}{best['f1']:>7}  "
              f"{margin_str:>7}  {best['tp']}/{best['fp']}/{best['tn']}/{best['fn']}")

    out = ROOT / "calibration-report.json"
    out.write_text(json.dumps(report, indent=2))
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
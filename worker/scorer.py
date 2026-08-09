"""
Rule scorers for the validation worker calibration pass.

Pure numpy/Pillow so it runs anywhere (Fly, CI, local) without cv2 or
tesseract. Each scorer takes a cropped ROI (numpy HxWx3 uint8) plus the
rule's `params` dict and returns `(score: float in [0,1], debug: dict)`.

Rule kinds (matches `RuleInput.kind` in `app.py`):
  C - Colour presence: mean HSV distance to target colour
  R - Reference/pixel-match: mean absolute diff vs reference swatch
  K - Contrast/edge density: fraction of edge pixels (Sobel proxy)
  S - Shape/fill: fraction of foreground pixels after threshold
  E - Emptiness: 1 - (fraction of non-background pixels)
"""
from __future__ import annotations

from typing import Any, Dict, Tuple

import numpy as np

Score = Tuple[float, Dict[str, Any]]


def _rgb_to_hsv(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0] / 255.0, rgb[..., 1] / 255.0, rgb[..., 2] / 255.0
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    mask = d > 1e-6
    rc = np.where(mask & (mx == r), ((g - b) / np.where(d == 0, 1, d)) % 6, 0)
    gc = np.where(mask & (mx == g), ((b - r) / np.where(d == 0, 1, d)) + 2, 0)
    bc = np.where(mask & (mx == b), ((r - g) / np.where(d == 0, 1, d)) + 4, 0)
    h = (rc + gc + bc) * 60.0
    s = np.where(mx > 0, d / np.where(mx == 0, 1, mx), 0)
    v = mx
    return np.stack([h, s, v], axis=-1)


def score_colour(roi: np.ndarray, params: Dict[str, Any]) -> Score:
    target = params.get("targetRgb") or [255, 0, 0]
    tol = float(params.get("tolerance", 40))
    diff = np.linalg.norm(roi.astype(np.float32) - np.array(target, dtype=np.float32), axis=-1)
    match = float((diff < tol).mean())
    return match, {"mean_diff": float(diff.mean()), "match_fraction": match, "tolerance": tol}


def score_reference(roi: np.ndarray, params: Dict[str, Any]) -> Score:
    ref = params.get("referenceRgb")
    if ref is None:
        return 0.0, {"error": "no reference"}
    ref_arr = np.array(ref, dtype=np.float32)
    diff = np.abs(roi.astype(np.float32) - ref_arr).mean()
    # 0 diff -> 1.0, 60+ mean-diff -> 0.0
    score = max(0.0, 1.0 - diff / 60.0)
    return score, {"mean_abs_diff": float(diff)}


def score_edges(roi: np.ndarray, _params: Dict[str, Any]) -> Score:
    gray = roi.mean(axis=-1)
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))
    # Pad to same shape then combine
    e = np.zeros_like(gray)
    e[:, :-1] += gx
    e[:-1, :] += gy
    frac = float((e > 40).mean())
    return min(1.0, frac * 4.0), {"edge_fraction": frac}


def score_shape(roi: np.ndarray, params: Dict[str, Any]) -> Score:
    thresh = float(params.get("threshold", 128))
    gray = roi.mean(axis=-1)
    fg = float((gray < thresh).mean())
    target = float(params.get("expectedFill", 0.5))
    # Closer to expectedFill -> higher score
    score = max(0.0, 1.0 - abs(fg - target) * 2.0)
    return score, {"fill_fraction": fg, "expected": target}


def score_empty(roi: np.ndarray, params: Dict[str, Any]) -> Score:
    bg = params.get("backgroundRgb") or [255, 255, 255]
    tol = float(params.get("tolerance", 25))
    diff = np.linalg.norm(roi.astype(np.float32) - np.array(bg, dtype=np.float32), axis=-1)
    non_bg = float((diff > tol).mean())
    return 1.0 - non_bg, {"non_background_fraction": non_bg}


SCORERS = {
    "C": score_colour,
    "R": score_reference,
    "K": score_edges,
    "S": score_shape,
    "E": score_empty,
}


def run_rule(kind: str, roi: np.ndarray, params: Dict[str, Any] | None) -> Score:
    fn = SCORERS.get(kind)
    if fn is None:
        return 0.0, {"error": f"unknown kind {kind}"}
    return fn(roi, params or {})
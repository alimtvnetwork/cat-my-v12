"""Reusable template matching helpers for the rule kernel (Plan 90 Step 87).

Extracted from `BE/app/rules/evaluators/count.py` so `GraphicDisplayCheck`
(spec 33 §3.5) can reuse the same normalized cross-correlation core
without copy-paste drift. Pure numpy, no scipy.

Public API:
  - `luma(sub)`: unweighted channel mean for 3-channel frames, passthrough
    for 2D. Returns float64.
  - `ncc_score_map(luma_sub, luma_pat)`: score in [0, 1] per candidate
    top-left. Zero-variance windows/patterns score 0; negative correlation
    clipped to 0.
  - `nms_peaks(scores, min_score, ph, pw, cap)`: greedy non-max suppression.

Kept in `BE/app/rules/kernel/` (not `evaluators/`) so multiple evaluators
can import without triggering evaluator-registration side effects.
"""

from __future__ import annotations

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view


def luma(sub: np.ndarray) -> np.ndarray:
    if sub.ndim == 2:
        return sub.astype(np.float64, copy=False)
    return sub.mean(axis=2).astype(np.float64, copy=False)


def ncc_score_map(luma_sub: np.ndarray, luma_pat: np.ndarray) -> np.ndarray:
    ph, pw = luma_pat.shape
    windows = sliding_window_view(luma_sub, (ph, pw))
    win_mean = windows.mean(axis=(2, 3), keepdims=True)
    pat_mean = float(luma_pat.mean())
    win_dev = windows - win_mean
    pat_dev = luma_pat - pat_mean
    num = (win_dev * pat_dev).sum(axis=(2, 3))
    win_norm = np.sqrt((win_dev ** 2).sum(axis=(2, 3)))
    pat_norm = float(np.sqrt((pat_dev ** 2).sum()))
    denom = win_norm * pat_norm
    scores = np.zeros_like(num, dtype=np.float64)
    ok = denom > 1e-12
    scores[ok] = num[ok] / denom[ok]
    np.clip(scores, 0.0, 1.0, out=scores)
    return scores


def nms_peaks(scores: np.ndarray, min_score: float,
              ph: int, pw: int, cap: int) -> list[tuple[int, int, float]]:
    work = scores.copy()
    peaks: list[tuple[int, int, float]] = []
    sh, sw = work.shape
    while len(peaks) < cap:
        idx = int(work.argmax())
        y, x = divmod(idx, sw)
        best = float(work[y, x])
        if best < min_score:
            break
        peaks.append((y, x, best))
        y0 = max(0, y - (ph - 1))
        y1 = min(sh, y + ph)
        x0 = max(0, x - (pw - 1))
        x1 = min(sw, x + pw)
        work[y0:y1, x0:x1] = -1.0
    return peaks


__all__ = ["luma", "ncc_score_map", "nms_peaks"]

"""Per-rule telemetry helpers (Plan 90 Step 83).

Owning spec: `spec/21-app/24-runsession-record.md` §4 (per-rule audit
trail requires latency + ROI content hash + predicate build id so
operators can answer "which rules are slow", "did the ROI change
between runs", "which build produced this Fail").

Pure helpers: no I/O, no vendor. `perf_now_ms` uses a monotonic clock
(injected into the engine, not called from evaluators) so the kernel's
"clock-free" invariant is preserved at the predicate boundary. `roi_hash`
is a stable SHA-256 of the ROI bytes plus dtype + shape so different
dtypes with identical bytes are not aliased.
"""

from __future__ import annotations

import hashlib
import time
from typing import Any

import numpy as np

from rule_kernel.models import RuleContext, RuleSpec
from rule_kernel.roi import slice_search_region
from BE.errors.apperror import AppError

# Bumped whenever any predicate's judgment semantics change so the
# audit trail can distinguish rebuilds. Kernel-wide default; individual
# predicates MAY override via `__predicate_version__` attribute.
KERNEL_PREDICATE_VERSION = "1"


def perf_now_ms() -> float:
    """Monotonic wall-time in milliseconds. Injected by the engine only."""
    return time.perf_counter() * 1000.0


def roi_hash(sub: np.ndarray) -> str:
    """Stable content hash of an ROI view. Includes dtype + shape."""
    h = hashlib.sha256()
    h.update(str(sub.dtype).encode("ascii"))
    h.update(b"|")
    h.update(",".join(str(d) for d in sub.shape).encode("ascii"))
    h.update(b"|")
    h.update(np.ascontiguousarray(sub).tobytes())
    return h.hexdigest()


def try_roi_hash(ctx: RuleContext, rule: RuleSpec) -> str | None:
    """Best-effort ROI hash for telemetry.

    Returns None when the frame or SearchRegion is absent/invalid: those
    conditions ALREADY surface as an Error judgment via the predicate,
    so silently skipping the hash here does not hide a bug.
    """
    try:
        sub = slice_search_region(ctx, rule)
    except AppError:
        return None
    return roi_hash(sub)


def predicate_version(fn: Any) -> str:
    return str(getattr(fn, "__predicate_version__", KERNEL_PREDICATE_VERSION))


__all__ = [
    "KERNEL_PREDICATE_VERSION",
    "perf_now_ms",
    "predicate_version",
    "roi_hash",
    "try_roi_hash",
]

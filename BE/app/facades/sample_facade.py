"""`SampleFacade`: mirror of `rule_facade.py` for the samples slice.

Same Protocol / in-memory / vendor triad, same accessor pattern. Kept as a
sibling file (not merged) so the two slices can diverge in later plan steps
(sample capture will grow write methods before rules do).

Plan 90 Step 144: added `upsert_sample` and `delete_sample` write ops so the
samples slice has a persistence contract before HTTP routes (Step 145) or a
SQLite backing (Step 146) are wired. Both providers stay in lockstep with the
Protocol via the module-load `isinstance` checks below, which fail fast at
import time rather than at first request.
"""

from __future__ import annotations

from typing import Iterable, Protocol, runtime_checkable

from BE.app.domain.cat_sample import CatSample
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


@runtime_checkable
class SampleFacade(Protocol):
    def list_samples(self) -> list[CatSample]: ...
    def get_sample(self, sample_id: int) -> CatSample: ...
    def upsert_sample(self, sample: CatSample) -> CatSample: ...
    def delete_sample(self, sample_id: int) -> None: ...


class InMemorySampleFacade:
    def __init__(self, seed: Iterable[CatSample] | None = None) -> None:
        self._by_id: dict[int, CatSample] = {s.id: s for s in (seed or ())}

    def list_samples(self) -> list[CatSample]:
        return sorted(self._by_id.values(), key=lambda s: s.id)

    def get_sample(self, sample_id: int) -> CatSample:
        sample = self._by_id.get(sample_id)
        if sample is None:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"sample {sample_id} not found",
                {"sample_id": sample_id, "provider": "InMemorySampleFacade"},
            )
        return sample

    def upsert_sample(self, sample: CatSample) -> CatSample:
        # Validate before mutating so a bad payload leaves store untouched.
        if not isinstance(sample.id, int) or sample.id <= 0:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                "sample.id must be a positive integer",
                {"provider": "InMemorySampleFacade", "op": "upsert_sample", "sample_id": sample.id},
            )
        if not isinstance(sample.rule_id, int) or sample.rule_id <= 0:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                "sample.rule_id must be a positive integer",
                {"provider": "InMemorySampleFacade", "op": "upsert_sample", "sample_id": sample.id},
            )
        if not sample.label or not sample.label.strip():
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                "sample.label must be non-empty",
                {"provider": "InMemorySampleFacade", "op": "upsert_sample", "sample_id": sample.id},
            )
        self._by_id[sample.id] = sample
        return sample

    def delete_sample(self, sample_id: int) -> None:
        if sample_id not in self._by_id:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"sample {sample_id} not found",
                {"sample_id": sample_id, "provider": "InMemorySampleFacade", "op": "delete_sample"},
            )
        del self._by_id[sample_id]


class VendorSampleFacade:
    def list_samples(self) -> list[CatSample]:
        raise AppError(
            ErrorCode.E_SDK_INIT_FAILED,
            "VendorSampleFacade not initialised",
            {"provider": "VendorSampleFacade", "op": "list_samples"},
        )

    def get_sample(self, sample_id: int) -> CatSample:
        raise AppError(
            ErrorCode.E_SDK_INIT_FAILED,
            "VendorSampleFacade not initialised",
            {"provider": "VendorSampleFacade", "op": "get_sample", "sample_id": sample_id},
        )

    def upsert_sample(self, sample: CatSample) -> CatSample:
        raise AppError(
            ErrorCode.E_SDK_INIT_FAILED,
            "VendorSampleFacade not initialised",
            {"provider": "VendorSampleFacade", "op": "upsert_sample", "sample_id": sample.id},
        )

    def delete_sample(self, sample_id: int) -> None:
        raise AppError(
            ErrorCode.E_SDK_INIT_FAILED,
            "VendorSampleFacade not initialised",
            {"provider": "VendorSampleFacade", "op": "delete_sample", "sample_id": sample_id},
        )


# Import-time drift guards: any missing/renamed method fails module load
# instead of surfacing as an AttributeError inside a request handler.
assert isinstance(InMemorySampleFacade(), SampleFacade), "InMemorySampleFacade drifted"
assert isinstance(VendorSampleFacade(), SampleFacade), "VendorSampleFacade drifted"


_active: SampleFacade = InMemorySampleFacade()


def get_sample_facade() -> SampleFacade:
    return _active


def set_sample_facade(facade: SampleFacade) -> None:
    global _active
    _active = facade


__all__ = [
    "InMemorySampleFacade",
    "SampleFacade",
    "VendorSampleFacade",
    "get_sample_facade",
    "set_sample_facade",
]

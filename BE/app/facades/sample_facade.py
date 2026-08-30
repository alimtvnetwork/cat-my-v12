"""`SampleFacade`: mirror of `rule_facade.py` for the samples slice (aliased to `BE.repos.samples_repo`).

Preserves backwards-compatibility for existing tests/modules importing from `BE.app.facades`.
"""

from __future__ import annotations

from BE.repos.samples_repo import (
    InMemorySamplesRepo as InMemorySampleFacade,
    SamplesRepo as SampleFacade,
    VendorSamplesRepo as VendorSampleFacade,
    get_samples_repo as get_sample_facade,
    set_samples_repo as set_sample_facade,
)

__all__ = [
    "InMemorySampleFacade",
    "SampleFacade",
    "VendorSampleFacade",
    "get_sample_facade",
    "set_sample_facade",
]

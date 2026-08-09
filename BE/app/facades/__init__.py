"""Facade seam for domain slices (rules, samples).

Same shape as `BE.sdk_facade` (Protocol + in-memory + vendor adapters) but
scoped to persisted domain data rather than hardware/blob SDKs.

Per spec 52 the vendor adapter is the ONLY module allowed to import a raw
storage SDK (SQLite bundle reader, cloud DB client, etc.). Routes import
`get_rule_facade()` / `get_sample_facade()` and receive a `RuleFacade` /
`SampleFacade` Protocol; the concrete class stays a private detail.
"""

from __future__ import annotations

from BE.app.facades.rule_facade import (
    InMemoryRuleFacade,
    RuleFacade,
    VendorRuleFacade,
    get_rule_facade,
    set_rule_facade,
)
from BE.app.facades.sample_facade import (
    InMemorySampleFacade,
    SampleFacade,
    VendorSampleFacade,
    get_sample_facade,
    set_sample_facade,
)

__all__ = [
    "InMemoryRuleFacade",
    "InMemorySampleFacade",
    "RuleFacade",
    "SampleFacade",
    "VendorRuleFacade",
    "VendorSampleFacade",
    "get_rule_facade",
    "get_sample_facade",
    "set_rule_facade",
    "set_sample_facade",
]

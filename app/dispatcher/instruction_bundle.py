"""Instruction Bundle builder (spec 36 §Envelope).

Workers never read task.db or rules.db at eval time. The Dispatcher resolves
the override cascade (spec 23) and hands each worker a fully-baked bundle.
Canonical JSON keys are PascalCase; SourceHash is SHA-256 over the sorted,
whitespace-free serialization of Regions + ToleranceProfiles + Rules.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any, TypedDict

INSTRUCTION_SCHEMA_VERSION = 1


class InstructionBundle(TypedDict):
    SchemaVersion: int
    InstructionId: str
    TaskId: str
    RunSessionId: str
    GeneratedAt: str
    OverrideLayerApplied: str
    SourceHash: str
    Image: dict[str, Any]
    Regions: list[dict[str, Any]]
    ToleranceProfiles: list[dict[str, Any]]
    Rules: list[dict[str, Any]]


def compute_source_hash(regions: list[dict[str, Any]],
                        tolerance_profiles: list[dict[str, Any]],
                        rules: list[dict[str, Any]]) -> str:
    payload = {"Regions": regions, "ToleranceProfiles": tolerance_profiles, "Rules": rules}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return "sha256-" + hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def build_bundle(
    *,
    instruction_id: str,
    task_id: str,
    run_session_id: str,
    generated_at: str,
    override_layer: str,
    image: dict[str, Any],
    regions: list[dict[str, Any]],
    tolerance_profiles: list[dict[str, Any]],
    rules: list[dict[str, Any]],
) -> InstructionBundle:
    return {
        "SchemaVersion": INSTRUCTION_SCHEMA_VERSION,
        "InstructionId": instruction_id,
        "TaskId": task_id,
        "RunSessionId": run_session_id,
        "GeneratedAt": generated_at,
        "OverrideLayerApplied": override_layer,
        "SourceHash": compute_source_hash(regions, tolerance_profiles, rules),
        "Image": image,
        "Regions": regions,
        "ToleranceProfiles": tolerance_profiles,
        "Rules": rules,
    }

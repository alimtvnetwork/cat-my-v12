"""Config resolver. Precedence: runtime > task > app > seed.

Anchor: spec/21-app/27-config-surface.md §4 (contract), §6 (failure codes).
Guideline: no `!`; positive conditions only; ≤ 15-line functions.
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.config.schema import KNOB_SCHEMA, KnobSpec
from app.core.config.sources import LayerReader, empty_layer, seed_layer
from app.core.errors.codes import ErrorCode

log = logging.getLogger(__name__)


class ConfigError(RuntimeError):
    code: str = ErrorCode.E_CONFIG_MISSING.value

    def __init__(self, code: ErrorCode, key: str, detail: str = "") -> None:
        super().__init__(f"{code.value} key={key} {detail}".strip())
        self.code = code.value
        self.key = key


def _known(key: str) -> KnobSpec:
    spec = KNOB_SCHEMA.get(key)
    if spec is None:
        log.error("config.resolve unknown key=%s", key)
        raise ConfigError(ErrorCode.E_CONFIG_MISSING, key, "unknown key")
    return spec


class Resolver:
    """Holds layer readers so callers can `.resolve(key)` without threading state."""

    def __init__(
        self,
        runtime: LayerReader = empty_layer,
        task: LayerReader = empty_layer,
        app: LayerReader = empty_layer,
        seed: LayerReader = seed_layer,
    ) -> None:
        self._layers: tuple[tuple[str, LayerReader], ...] = (
            ("runtime", runtime), ("task", task), ("app", app), ("seed", seed),
        )

    def resolve(self, key: str) -> tuple[Any, str]:
        spec = _known(key)
        for name, reader in self._layers:
            layer = reader()
            hit = layer.get(key)
            if hit is not None:
                log.debug("config.resolve key=%s layer=%s", key, name)
                return hit, name
        raise ConfigError(ErrorCode.E_CONFIG_MISSING, key, f"no layer set (spec.default={spec.default!r})")


def resolve(key: str) -> Any:
    """Module-level convenience: seed-only resolver. Value only (source dropped)."""
    value, _ = Resolver().resolve(key)
    return value

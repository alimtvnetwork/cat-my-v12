"""Trigger source abstraction (spec 14 §Trigger Sources, Q-01).

Two concrete sources ship in v1: SOFTWARE_TIMER, GPIO_EDGE. Both implement
`TriggerSource` so Supervisor picks one per Task without knowing the impl.
"""
from __future__ import annotations

from typing import Callable, Protocol

EdgeCallback = Callable[[], None]


class TriggerMode:
    SOFTWARE_TIMER = "SOFTWARE_TIMER"
    GPIO_EDGE = "GPIO_EDGE"
    MANUAL = "MANUAL"


class TriggerSource(Protocol):
    """Common interface for every trigger implementation."""

    mode: str

    def start(self) -> None: ...

    def stop(self) -> None: ...

    def on_edge(self, cb: EdgeCallback) -> None: ...

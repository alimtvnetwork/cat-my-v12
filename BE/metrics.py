from typing import Any
import collections

_counters: dict[str, int] = collections.defaultdict(int)

def inc_counter(name: str, value: int = 1) -> None:
    _counters[name] += value

def get_counter(name: str) -> int:
    return _counters[name]

def reset_metrics() -> None:
    _counters.clear()

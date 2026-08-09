"""Per-Kind Pydantic payload models for IPC (Plan 90 Step 24).

One source of truth for `spec/21-app/76-cli-log-and-ipc.md` §"Payload shapes".
All fields are PascalCase and frozen; extra fields are forbidden so a typo on
the producer side surfaces as `E_IPC_PAYLOAD_INVALID` at the boundary, not
as a silent no-op on the consumer.

The `Error` Kind has no payload model on purpose: per spec line 114 the
message carries only the Universal Envelope; `Payload` MUST be `null`.
That contract is enforced in `BE/cli/common/ipc.py::send`.
"""

from __future__ import annotations

from typing import Final

from pydantic import BaseModel, ConfigDict, Field


class _Frozen(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class Roi(_Frozen):
    X: int = Field(ge=0)
    Y: int = Field(ge=0)
    W: int = Field(gt=0)
    H: int = Field(gt=0)


class FrameReadyPayload(_Frozen):
    """Emitted by worker-cli after a Frame is stored via StorageFacade.put."""

    FramePath: str = Field(min_length=1)
    Serial: str = Field(min_length=1)
    ExposureUs: int = Field(ge=0)
    Gain: float = Field(ge=0.0)
    Roi: Roi
    CapturedAt: str = Field(min_length=1)  # ISO-8601 UTC per envelope rules


class ResultReadyPayload(_Frozen):
    """Emitted by processing-cli after a rule bundle evaluates a Frame.

    Plan 90 Step 92 (spec 21-app/33 §5, 03-error-manage/02-error-architecture):
    `ErrorCount` and top-level `ErrorCode` promote per-rule error taxonomy
    (e.g. `E_RULE_TIMEOUT`) into the IPC envelope so downstream watchers
    and the FE `GlobalErrorModal` can alert without re-reading the JSONL.
    Both are optional (default 0 / None) so pre-Step 92 producers stay
    wire-compatible.
    """

    ResultsPath: str = Field(min_length=1)
    RunId: str = Field(min_length=1)
    FrameSeq: int = Field(ge=0)
    Decision: str = Field(min_length=1)  # e.g. "pass"|"fail"|"inconclusive"
    RuleCount: int = Field(ge=0)
    PassCount: int = Field(ge=0)
    FailCount: int = Field(ge=0)
    ErrorCount: int = Field(default=0, ge=0)
    ErrorCode: str | None = Field(default=None, min_length=1)



class HeartbeatPayload(_Frozen):
    """Emitted every 5s while a long-running CLI subcommand is active."""

    Uptime: float = Field(ge=0.0)  # seconds since session start
    MemoryMb: float = Field(ge=0.0)
    LastEvent: str  # may be empty at session start


# Kind -> model registry. `Error` intentionally absent; see module docstring.
PAYLOAD_MODELS: Final[dict[str, type[_Frozen]]] = {
    "FrameReady": FrameReadyPayload,
    "ResultReady": ResultReadyPayload,
    "Heartbeat": HeartbeatPayload,
}

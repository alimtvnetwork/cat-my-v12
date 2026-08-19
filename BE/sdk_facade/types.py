from dataclasses import dataclass
from typing import Any


@dataclass
class CameraDeviceInfo:
    serial: str
    model: str
    vendor: str
    interface: str
    ip_or_bus: str | None
    firmware: str | None

@dataclass
class FrameEnvelope:
    data: Any  # e.g., np.ndarray of shape (H, W, 3)
    ts_ns: int
    frame_id: int

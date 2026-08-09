from dataclasses import dataclass
from typing import Optional, Any

@dataclass
class CameraDeviceInfo:
    serial: str
    model: str
    vendor: str
    interface: str
    ip_or_bus: Optional[str]
    firmware: Optional[str]

@dataclass
class FrameEnvelope:
    data: Any  # e.g., np.ndarray of shape (H, W, 3)
    ts_ns: int
    frame_id: int

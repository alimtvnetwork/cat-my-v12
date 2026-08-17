from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from BE.envelope import Envelope, success

router = APIRouter(prefix="/camera", tags=["camera"])

class CaptureRequest(BaseModel):
    cameraId: str

class CameraStatusResponse(BaseModel):
    status: str
    message: Optional[str] = None

class ReferenceImage(BaseModel):
    id: str
    url: str
    width: Optional[int] = None
    height: Optional[int] = None

@router.post("/capture", response_model=Envelope)
async def capture_image(req: CaptureRequest):
    img = ReferenceImage(
        id=f"ref-capture-{req.cameraId}",
        url="/assets/seeds/default-pcb.jpg",
        width=1920,
        height=1080
    )
    return success(img.model_dump(), requested_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))

@router.get("/status", response_model=Envelope)
async def get_camera_status(cameraId: str):
    status = CameraStatusResponse(
        status="connected",
        message="Hardware camera connected"
    )
    return success(status.model_dump(), requested_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))

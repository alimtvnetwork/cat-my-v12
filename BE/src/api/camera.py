from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from BE.envelope import Envelope, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

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
    if req.cameraId == "fault" or req.cameraId == "error":
        raise AppError(ErrorCode.E_CAMERA_FAULT, "Camera hardware fault detected")
        
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

class LightingRequest(BaseModel):
    exposureMs: Optional[float] = None
    gainDb: Optional[float] = None
    whiteBalanceK: Optional[float] = None
    programPreset: Optional[str] = None
    isFlashlight1On: Optional[bool] = None
    isFlashlight2On: Optional[bool] = None
    lightCorrection: Optional[int] = None

@router.put("/lighting", response_model=Envelope)
async def update_lighting(req: LightingRequest):
    return success(req.model_dump(), requested_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))


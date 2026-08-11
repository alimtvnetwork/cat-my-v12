from fastapi import APIRouter
from BE.src.models.envelope import Envelope
from BE.src.models.system import SystemStatus

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/status", response_model=Envelope[SystemStatus])
def get_system_status():
    status = SystemStatus(uptime=1000, version="1.0.0", status="ok")
    return Envelope.ok(data=status)

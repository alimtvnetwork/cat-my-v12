from fastapi import APIRouter

from BE.envelope import Envelope
from BE.models.system import SystemStatus

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/status")
def get_status():
    return Envelope.ok(data=SystemStatus(uptime=0.0, version="1.0", status="ok"))

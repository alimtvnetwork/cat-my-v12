from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from BE.src.models.envelope import Envelope

router = APIRouter(prefix="/images", tags=["images"])

class ReferenceImage(BaseModel):
    id: str
    url: str
    width: Optional[int] = None
    height: Optional[int] = None

class SetReferenceRequest(BaseModel):
    projectId: str
    imageId: str

@router.get("/reference", response_model=Envelope)
async def get_reference_image(projectId: str):
    img = ReferenceImage(
        id="ref-default-pcb-1",
        url="/assets/seeds/default-pcb.jpg",
        width=1920,
        height=1080
    )
    return Envelope(isSuccess=True, isFail=False, status="ok", data=[img.dict()])

@router.put("/reference", response_model=Envelope)
async def set_reference_image(req: SetReferenceRequest):
    return Envelope(isSuccess=True, isFail=False, status="ok", data=[])

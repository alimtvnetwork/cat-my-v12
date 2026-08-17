from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from BE.envelope import Envelope, success, failure
from BE.db.connections import get_task_conn

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
    requested_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn = get_task_conn()
    cur = conn.safe_execute(
        "SELECT ImageId, Url, Width, Height FROM ReferenceImage WHERE ProjectId = ?",
        (projectId,)
    )
    if cur.isFail:
        return failure(code="E_DB_ERROR", message="Failed to fetch reference image", requested_at=requested_at, http_status=500)
    
    row = cur.fetchone()
    if row is None:
        img = ReferenceImage(
            id="ref-default-pcb-1",
            url="/assets/seeds/default-pcb.jpg",
            width=1920,
            height=1080
        )
        return success(img.model_dump(), requested_at=requested_at)
    
    img = ReferenceImage(
        id=row[0],
        url=row[1],
        width=row[2],
        height=row[3]
    )
    return success(img.model_dump(), requested_at=requested_at)

@router.put("/reference", response_model=Envelope)
async def set_reference_image(req: SetReferenceRequest):
    requested_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn = get_task_conn()
    cur = conn.safe_execute(
        """
        INSERT INTO ReferenceImage (ProjectId, ImageId, Url, Width, Height, UpdatedAt)
        VALUES (?, ?, ?, ?, ?, unixepoch())
        ON CONFLICT(ProjectId) DO UPDATE SET
            ImageId=excluded.ImageId,
            Url=excluded.Url,
            Width=excluded.Width,
            Height=excluded.Height,
            UpdatedAt=unixepoch()
        """,
        (req.projectId, req.imageId, "/assets/seeds/default-pcb.jpg", 1920, 1080)
    )
    if cur.isFail:
        return failure(code="E_DB_ERROR", message="Failed to set reference image", requested_at=requested_at, http_status=500)
        
    return success([], requested_at=requested_at)

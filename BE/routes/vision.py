"""Vision image utility routes."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from BE.app.domain.white_box_marking import MarkingOptions, SearchRegion, mark_white_boxes
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success

router = APIRouter(prefix="/vision")


class SearchRegionRequest(BaseModel):
    X: int = Field(ge=0)
    Y: int = Field(ge=0)
    Width: int = Field(gt=0)
    Height: int = Field(gt=0)


class WhiteBoxRequest(BaseModel):
    Width: int = Field(gt=0)
    Height: int = Field(gt=0)
    RgbaBase64: str
    WhiteThreshold: int | None = Field(default=None, ge=0, le=255)
    MinAreaPx: int | None = Field(default=None, ge=1)
    SearchRegion: SearchRegionRequest | None = None


@router.post("/white-box-marking")
async def post_white_box_marking(request: Request, payload: WhiteBoxRequest) -> JSONResponse:
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    result = mark_white_boxes(
        width=payload.Width,
        height=payload.Height,
        rgba_base64=payload.RgbaBase64,
        options=MarkingOptions(
            white_threshold=payload.WhiteThreshold,
            min_area_px=payload.MinAreaPx,
            search_region=_to_search_region(payload.SearchRegion),
        ),
    )
    body = {
        "Width": result.width,
        "Height": result.height,
        "RgbaBase64": result.rgba_base64,
        "Boxes": [asdict(box) for box in result.boxes],
    }
    envelope = success(body, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


def _to_search_region(region: SearchRegionRequest | None) -> SearchRegion | None:
    if region is None:
        return None
    return SearchRegion(x=region.X, y=region.Y, width=region.Width, height=region.Height)


__all__ = ["router"]

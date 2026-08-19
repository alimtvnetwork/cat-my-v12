
from pydantic import BaseModel


class RegionModel(BaseModel):
    regionId: str
    name: str
    shapeKind: str
    geometryJson: str
    parentRegionId: str | None = None
    isActive: bool = True
    canvasWidth: float | None = None
    canvasHeight: float | None = None

class RuleModel(BaseModel):
    ruleId: str
    regionId: str
    ruleKind: str
    paramsJson: str
    toleranceJson: str
    isActive: bool = True

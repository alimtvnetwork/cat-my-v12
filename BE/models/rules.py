from pydantic import BaseModel
from typing import Optional, Dict, Any

class RegionModel(BaseModel):
    regionId: str
    name: str
    shapeKind: str
    geometryJson: str
    parentRegionId: Optional[str] = None
    isActive: bool = True
    canvasWidth: Optional[float] = None
    canvasHeight: Optional[float] = None

class RuleModel(BaseModel):
    ruleId: str
    regionId: str
    ruleKind: str
    paramsJson: str
    toleranceJson: str
    isActive: bool = True

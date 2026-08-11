from pydantic import BaseModel

class CameraModel(BaseModel):
    id: str
    name: str
    status: str

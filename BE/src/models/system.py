from pydantic import BaseModel

class SystemStatus(BaseModel):
    uptime: int
    version: str
    status: str

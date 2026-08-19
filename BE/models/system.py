from pydantic import BaseModel


class SystemStatus(BaseModel):
    uptime: float
    version: str
    status: str

from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")

class Envelope(BaseModel, Generic[T]):
    isSuccess: bool
    isFail: bool
    status: str
    data: Optional[T] = None
    error: Optional[Any] = None

    @classmethod
    def ok(cls, data: T) -> "Envelope[T]":
        return cls(isSuccess=True, isFail=False, status="ok", data=data)

    @classmethod
    def fail(cls, status: str, error: Any = None) -> "Envelope[T]":
        return cls(isSuccess=False, isFail=True, status=status, error=error)

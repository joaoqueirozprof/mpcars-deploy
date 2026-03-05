from typing import TypeVar, Generic, List, Any
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response schema.

    Attributes:
        items: List of items for the current page
        total: Total number of items across all pages
        page: Current page number
        per_page: Number of items per page
    """
    items: List[T]
    total: int
    page: int
    per_page: int

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """
    Generic message response schema.

    Attributes:
        message: Response message
        success: Whether the operation was successful
    """
    message: str
    success: bool

    model_config = ConfigDict(from_attributes=True)


class ErrorResponse(BaseModel):
    """
    Error response schema.

    Attributes:
        error: Error message
        status_code: HTTP status code
        detail: Additional error details (optional)
    """
    error: str
    status_code: int
    detail: str = None

    model_config = ConfigDict(from_attributes=True)

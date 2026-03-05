from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class UsuarioBase(BaseModel):
    """Base usuario schema with common fields."""
    email: EmailStr
    nome: str


class UsuarioCreate(UsuarioBase):
    """Schema for creating a new usuario."""
    senha: str


class UsuarioUpdate(BaseModel):
    """Schema for updating an existing usuario."""
    email: Optional[EmailStr] = None
    nome: Optional[str] = None
    senha: Optional[str] = None
    is_admin: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class UsuarioResponse(UsuarioBase):
    """Schema for usuario response with additional fields."""
    id: int
    is_admin: bool = False
    data_cadastro: datetime

    model_config = ConfigDict(from_attributes=True)

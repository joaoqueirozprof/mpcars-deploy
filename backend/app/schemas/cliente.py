from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class ClienteBase(BaseModel):
    """Base cliente schema with common fields."""
    nome: str
    email: EmailStr
    telefone: str
    documento: str
    cnh: Optional[str] = None
    data_cnh_validade: Optional[datetime] = None
    endereco: str
    cidade: str
    estado: str
    cep: str
    ativo: bool = True


class ClienteCreate(ClienteBase):
    """Schema for creating a new cliente."""
    pass


class ClienteUpdate(BaseModel):
    """Schema for updating an existing cliente."""
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    documento: Optional[str] = None
    cnh: Optional[str] = None
    data_cnh_validade: Optional[datetime] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    ativo: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class ClienteResponse(ClienteBase):
    """Schema for cliente response with additional fields."""
    id: int
    data_cadastro: datetime

    model_config = ConfigDict(from_attributes=True)

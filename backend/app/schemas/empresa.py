from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class EmpresaBase(BaseModel):
    """Base empresa schema with common fields."""
    nome: str
    razao_social: str
    cnpj: str
    endereco: str
    numero: str
    bairro: str
    cidade: str
    estado: str = "RN"
    cep: str
    telefone: str
    email: EmailStr
    responsavel: str
    ativa: bool = True
    valor_km_extra_padrao: float = 1.0
    observacoes: Optional[str] = None


class EmpresaCreate(EmpresaBase):
    """Schema for creating a new empresa."""
    pass


class EmpresaUpdate(BaseModel):
    """Schema for updating an existing empresa."""
    nome: Optional[str] = None
    razao_social: Optional[str] = None
    cnpj: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    responsavel: Optional[str] = None
    ativa: Optional[bool] = None
    valor_km_extra_padrao: Optional[float] = None
    observacoes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EmpresaResponse(EmpresaBase):
    """Schema for empresa response with additional fields."""
    id: int
    data_cadastro: datetime

    model_config = ConfigDict(from_attributes=True)

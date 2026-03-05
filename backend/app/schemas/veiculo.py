from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class VeiculoBase(BaseModel):
    """Base veiculo schema with common fields."""
    placa: str
    marca: str
    modelo: str
    ano: int
    cor: str
    status: str = "Disponível"
    quilometragem: int = 0
    valor_diaria: Decimal
    combustivel: str
    tipo_veiculo: str
    empresa_id: int
    ativo: bool = True


class VeiculoCreate(VeiculoBase):
    """Schema for creating a new veiculo."""
    pass


class VeiculoUpdate(BaseModel):
    """Schema for updating an existing veiculo."""
    placa: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano: Optional[int] = None
    cor: Optional[str] = None
    status: Optional[str] = None
    quilometragem: Optional[int] = None
    valor_diaria: Optional[Decimal] = None
    combustivel: Optional[str] = None
    tipo_veiculo: Optional[str] = None
    empresa_id: Optional[int] = None
    ativo: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class VeiculoStatusUpdate(BaseModel):
    """Schema for updating only the status of a veiculo."""
    status: str

    model_config = ConfigDict(from_attributes=True)


class VeiculoResponse(VeiculoBase):
    """Schema for veiculo response with additional fields."""
    id: int
    data_cadastro: datetime

    model_config = ConfigDict(from_attributes=True)

from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class ContratoBase(BaseModel):
    """Base contrato schema with common fields."""
    cliente_id: int
    veiculo_id: int
    data_inicio: datetime
    data_fim: datetime
    valor_diaria: Decimal
    quilometragem_inicial: int
    quilometragem_final: Optional[int] = None
    status: str = "Ativo"
    observacoes: Optional[str] = None


class ContratoCreate(ContratoBase):
    """Schema for creating a new contrato."""
    pass


class ContratoUpdate(BaseModel):
    """Schema for updating an existing contrato."""
    cliente_id: Optional[int] = None
    veiculo_id: Optional[int] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
    valor_diaria: Optional[Decimal] = None
    quilometragem_inicial: Optional[int] = None
    quilometragem_final: Optional[int] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ContratoFinalizarRequest(BaseModel):
    """Schema for finalizing a contrato."""
    quilometragem_final: int
    observacoes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ContratoResponse(ContratoBase):
    """Schema for contrato response with additional fields."""
    id: int
    data_cadastro: datetime
    valor_total: Optional[Decimal] = None
    dias_aluguel: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ContratoDetailedResponse(ContratoResponse):
    """Schema for detailed contrato response with related data."""
    cliente_nome: Optional[str] = None
    veiculo_placa: Optional[str] = None
    veiculo_modelo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

from typing import Optional
from datetime import date, time
from pydantic import BaseModel, ConfigDict


class ContratoCreate(BaseModel):
    """Schema for creating a new contrato - flexible to accept frontend data."""
    cliente_id: int
    veiculo_id: int
    empresa_id: Optional[int] = None
    motorista_id: Optional[int] = None
    tipo_locacao: str = "Cliente"
    data_saida: date
    hora_saida: Optional[time] = None
    data_entrada: Optional[date] = None
    hora_entrada: Optional[time] = None
    data_prevista_devolucao: Optional[date] = None
    km_saida: float = 0
    km_entrada: Optional[float] = None
    km_livres_dia: Optional[float] = None
    quantidade_diarias: int = 1
    valor_diaria: float
    valor_hora_extra: Optional[float] = None
    valor_km_excedente: Optional[float] = None
    valor_caucao: Optional[float] = None
    subtotal: Optional[float] = None
    avarias: float = 0
    desconto: float = 0
    total: Optional[float] = None
    despesas_extras: float = 0
    status: str = "Ativo"
    observacoes: Optional[str] = None


class ContratoUpdate(BaseModel):
    """Schema for updating an existing contrato."""
    cliente_id: Optional[int] = None
    veiculo_id: Optional[int] = None
    empresa_id: Optional[int] = None
    tipo_locacao: Optional[str] = None
    data_saida: Optional[date] = None
    data_entrada: Optional[date] = None
    data_prevista_devolucao: Optional[date] = None
    km_saida: Optional[float] = None
    km_entrada: Optional[float] = None
    quantidade_diarias: Optional[int] = None
    valor_diaria: Optional[float] = None
    valor_caucao: Optional[float] = None
    subtotal: Optional[float] = None
    total: Optional[float] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ContratoFinalizarRequest(BaseModel):
    """Schema for finalizing a contrato."""
    km_entrada: float = 0
    data_entrada: Optional[date] = None
    observacoes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ContratoResponse(BaseModel):
    """Not used directly - we serialize manually."""
    pass


class ContratoDetailedResponse(BaseModel):
    """Not used directly - we serialize manually."""
    pass

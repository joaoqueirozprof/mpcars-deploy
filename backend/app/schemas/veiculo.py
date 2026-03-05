from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, field_validator


class VeiculoCreate(BaseModel):
    """Schema for creating a new veiculo."""
    marca: str
    modelo: str
    placa: str
    ano: int
    cor: str
    combustivel: str
    empresa_id: Optional[int] = None
    km_atual: Optional[float] = 0
    preco_compra: Optional[float] = 0
    data_compra: Optional[date] = None
    status: Optional[str] = "Disponível"
    tipo_veiculo: Optional[str] = "Passeio"
    chassi: Optional[str] = None
    renavam: Optional[str] = None
    valor_venal: Optional[float] = 0
    km_referencia: Optional[float] = 0
    valor_km_extra: Optional[float] = 1.0
    km_inicio_empresa: Optional[float] = 0
    macaco: Optional[bool] = False
    estepe: Optional[bool] = False
    ferram: Optional[bool] = False
    triangulo: Optional[bool] = False
    documento: Optional[bool] = False
    extintor: Optional[bool] = False
    calotas: Optional[bool] = False
    tapetes: Optional[bool] = False
    cd_player: Optional[bool] = False
    observacoes: Optional[str] = None

    @field_validator("empresa_id", mode="before")
    @classmethod
    def parse_empresa_id(cls, v):
        if v is None or v == "" or v == "null":
            return None
        return int(v)

    @field_validator("chassi", "renavam", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        return v

    @field_validator("km_atual", "preco_compra", "valor_venal", "km_referencia",
                     "valor_km_extra", "km_inicio_empresa", mode="before")
    @classmethod
    def parse_float_fields(cls, v):
        if v is None or v == "" or v == "null":
            return 0
        return float(v)

    @field_validator("ano", mode="before")
    @classmethod
    def parse_ano(cls, v):
        if v is None or v == "" or v == "null":
            return 2024
        return int(v)


class VeiculoUpdate(BaseModel):
    """Schema for updating an existing veiculo."""
    marca: Optional[str] = None
    modelo: Optional[str] = None
    placa: Optional[str] = None
    ano: Optional[int] = None
    cor: Optional[str] = None
    combustivel: Optional[str] = None
    empresa_id: Optional[int] = None
    km_atual: Optional[float] = None
    preco_compra: Optional[float] = None
    data_compra: Optional[date] = None
    status: Optional[str] = None
    tipo_veiculo: Optional[str] = None
    chassi: Optional[str] = None
    renavam: Optional[str] = None
    valor_venal: Optional[float] = None
    km_referencia: Optional[float] = None
    valor_km_extra: Optional[float] = None
    km_inicio_empresa: Optional[float] = None
    macaco: Optional[bool] = None
    estepe: Optional[bool] = None
    ferram: Optional[bool] = None
    triangulo: Optional[bool] = None
    documento: Optional[bool] = None
    extintor: Optional[bool] = None
    calotas: Optional[bool] = None
    tapetes: Optional[bool] = None
    cd_player: Optional[bool] = None
    observacoes: Optional[str] = None

    @field_validator("empresa_id", mode="before")
    @classmethod
    def parse_empresa_id(cls, v):
        if v is None or v == "" or v == "null":
            return None
        return int(v)

    @field_validator("chassi", "renavam", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        return v

    model_config = ConfigDict(from_attributes=True)


class VeiculoStatusUpdate(BaseModel):
    """Schema for updating only the status of a veiculo."""
    status: str

    model_config = ConfigDict(from_attributes=True)


class VeiculoResponse(BaseModel):
    """Schema for veiculo response with all fields."""
    id: int
    marca: str
    modelo: str
    placa: str
    ano: int
    cor: str
    combustivel: str
    empresa_id: Optional[int] = None
    km_atual: float
    preco_compra: float
    data_compra: Optional[date]
    status: str
    tipo_veiculo: str
    chassi: Optional[str]
    renavam: Optional[str]
    valor_venal: float
    km_referencia: float
    valor_km_extra: float
    km_inicio_empresa: float
    macaco: bool
    estepe: bool
    ferram: bool
    triangulo: bool
    documento: bool
    extintor: bool
    calotas: bool
    tapetes: bool
    cd_player: bool
    observacoes: Optional[str]
    data_cadastro: datetime

    model_config = ConfigDict(from_attributes=True)

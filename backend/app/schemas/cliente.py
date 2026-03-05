from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, ConfigDict


class ClienteCreate(BaseModel):
    """Schema for creating a new cliente."""
    nome: str
    cpf_cnpj: str
    tipo_cliente: Optional[str] = "Pessoa Física"
    endereco_comercial: Optional[str] = None
    numero_comercial: Optional[str] = None
    bairro_comercial: Optional[str] = None
    cep_comercial: Optional[str] = None
    cidade_comercial: Optional[str] = None
    estado_comercial: Optional[str] = None
    endereco_residencial: Optional[str] = None
    numero_residencial: Optional[str] = None
    bairro_residencial: Optional[str] = None
    cep_residencial: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    pais: Optional[str] = "Brasil"
    telefone: Optional[str] = None
    telefone2: Optional[str] = None
    email: Optional[str] = None
    hotel: Optional[str] = None
    apto: Optional[str] = None
    cnh: Optional[str] = None
    cnh_emitida: Optional[date] = None
    cnh_categoria: Optional[str] = None
    cnh_validade: Optional[date] = None
    data_primeira_habilitacao: Optional[date] = None
    rg: Optional[str] = None
    orgao_emissor: Optional[str] = None
    data_emissao_rg: Optional[date] = None
    empresa_id: Optional[int] = None
    observacoes: Optional[str] = None


class ClienteUpdate(BaseModel):
    """Schema for updating an existing cliente."""
    nome: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    tipo_cliente: Optional[str] = None
    endereco_comercial: Optional[str] = None
    numero_comercial: Optional[str] = None
    bairro_comercial: Optional[str] = None
    cep_comercial: Optional[str] = None
    cidade_comercial: Optional[str] = None
    estado_comercial: Optional[str] = None
    endereco_residencial: Optional[str] = None
    numero_residencial: Optional[str] = None
    bairro_residencial: Optional[str] = None
    cep_residencial: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    pais: Optional[str] = None
    telefone: Optional[str] = None
    telefone2: Optional[str] = None
    email: Optional[str] = None
    hotel: Optional[str] = None
    apto: Optional[str] = None
    cnh: Optional[str] = None
    cnh_emitida: Optional[date] = None
    cnh_categoria: Optional[str] = None
    cnh_validade: Optional[date] = None
    data_primeira_habilitacao: Optional[date] = None
    rg: Optional[str] = None
    orgao_emissor: Optional[str] = None
    data_emissao_rg: Optional[date] = None
    empresa_id: Optional[int] = None
    observacoes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ClienteResponse(BaseModel):
    """Schema for cliente response with all fields."""
    id: int
    nome: str
    cpf_cnpj: str
    tipo_cliente: str
    endereco_comercial: Optional[str]
    numero_comercial: Optional[str]
    bairro_comercial: Optional[str]
    cep_comercial: Optional[str]
    cidade_comercial: Optional[str]
    estado_comercial: Optional[str]
    endereco_residencial: Optional[str]
    numero_residencial: Optional[str]
    bairro_residencial: Optional[str]
    cep_residencial: Optional[str]
    cidade: Optional[str]
    estado: Optional[str]
    pais: str
    telefone: Optional[str]
    telefone2: Optional[str]
    email: Optional[str]
    hotel: Optional[str]
    apto: Optional[str]
    cnh: Optional[str]
    cnh_emitida: Optional[date]
    cnh_categoria: Optional[str]
    cnh_validade: Optional[date]
    data_primeira_habilitacao: Optional[date]
    rg: Optional[str]
    orgao_emissor: Optional[str]
    data_emissao_rg: Optional[date]
    empresa_id: Optional[int]
    observacoes: Optional[str]
    data_cadastro: datetime

    model_config = ConfigDict(from_attributes=True)

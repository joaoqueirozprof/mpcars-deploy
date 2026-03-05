"""
Client model for MPCARS.
"""
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Cliente(Base):
    """Client model for car rental system."""

    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf_cnpj: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    tipo_cliente: Mapped[str] = mapped_column(String(50), default="Pessoa Física", nullable=False)

    # Commercial Address
    endereco_comercial: Mapped[str | None] = mapped_column(String(255))
    numero_comercial: Mapped[str | None] = mapped_column(String(10))
    bairro_comercial: Mapped[str | None] = mapped_column(String(100))
    cep_comercial: Mapped[str | None] = mapped_column(String(10))
    cidade_comercial: Mapped[str | None] = mapped_column(String(100))
    estado_comercial: Mapped[str | None] = mapped_column(String(2))

    # Residential Address
    endereco_residencial: Mapped[str | None] = mapped_column(String(255))
    numero_residencial: Mapped[str | None] = mapped_column(String(10))
    bairro_residencial: Mapped[str | None] = mapped_column(String(100))
    cep_residencial: Mapped[str | None] = mapped_column(String(10))
    cidade: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(2))
    pais: Mapped[str] = mapped_column(String(100), default="Brasil", nullable=False)

    # Contact Information
    telefone: Mapped[str | None] = mapped_column(String(20))
    telefone2: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    hotel: Mapped[str | None] = mapped_column(String(255))
    apto: Mapped[str | None] = mapped_column(String(10))

    # Driver's License Information
    cnh: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    cnh_emitida: Mapped[date | None] = mapped_column(Date)
    cnh_categoria: Mapped[str | None] = mapped_column(String(2))
    cnh_validade: Mapped[date | None] = mapped_column(Date)
    data_primeira_habilitacao: Mapped[date | None] = mapped_column(Date)

    # ID Information
    rg: Mapped[str | None] = mapped_column(String(20))
    orgao_emissor: Mapped[str | None] = mapped_column(String(10))
    data_emissao_rg: Mapped[date | None] = mapped_column(Date)

    # Foreign Key
    empresa_id: Mapped[int | None] = mapped_column(ForeignKey("empresas.id"), nullable=True)

    # Additional
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    empresa = relationship("Empresa", back_populates="clientes")
    contratos = relationship("Contrato", back_populates="cliente")

    def __repr__(self) -> str:
        return f"<Cliente(id={self.id}, nome={self.nome}, cpf_cnpj={self.cpf_cnpj})>"

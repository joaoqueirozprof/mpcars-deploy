"""
Contract and related models for MPCARS.
"""
from datetime import datetime, date, time
from sqlalchemy import String, Integer, DateTime, Date, Time, ForeignKey, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Contrato(Base):
    """Contract model for vehicle rentals."""

    __tablename__ = "contratos"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Foreign Keys
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    empresa_id: Mapped[int | None] = mapped_column(ForeignKey("empresas.id"), nullable=True)
    motorista_id: Mapped[int | None] = mapped_column(ForeignKey("clientes.id"), nullable=True)

    # Rental Details
    tipo_locacao: Mapped[str] = mapped_column(String(50), default="Cliente", nullable=False)
    data_saida: Mapped[date] = mapped_column(Date, nullable=False)
    hora_saida: Mapped[time | None] = mapped_column(Time)
    data_entrada: Mapped[date | None] = mapped_column(Date)
    hora_entrada: Mapped[time | None] = mapped_column(Time)
    data_prevista_devolucao: Mapped[date] = mapped_column(Date, nullable=False)

    # Kilometers
    km_saida: Mapped[float] = mapped_column(Float, nullable=False)
    km_entrada: Mapped[float | None] = mapped_column(Float)
    km_livres_dia: Mapped[float | None] = mapped_column(Float)
    km_percorridos: Mapped[float | None] = mapped_column(Float)

    # Rental Charges
    quantidade_diarias: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    valor_diaria: Mapped[float] = mapped_column(Float, nullable=False)
    valor_hora_extra: Mapped[float | None] = mapped_column(Float)
    valor_km_excedente: Mapped[float | None] = mapped_column(Float)
    hora_extra: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    km_excedente: Mapped[float] = mapped_column(Float, default=0, nullable=False)

    # Financial Summary
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    avarias: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    desconto: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    total: Mapped[float] = mapped_column(Float, nullable=False)
    despesas_extras: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    prorrogacoes_valor: Mapped[float] = mapped_column(Float, default=0, nullable=False)

    # Fuel
    combustivel_saida: Mapped[str | None] = mapped_column(String(50))
    combustivel_entrada: Mapped[str | None] = mapped_column(String(50))

    # Credit Card Information
    cartao_tipo: Mapped[str | None] = mapped_column(String(50))
    cartao_numero: Mapped[str | None] = mapped_column(String(20))
    cartao_codigo: Mapped[str | None] = mapped_column(String(10))
    cartao_preaut: Mapped[str | None] = mapped_column(String(50))
    cartao_validade: Mapped[str | None] = mapped_column(String(10))
    cartao_valor: Mapped[float | None] = mapped_column(Float)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="Ativo", nullable=False)

    # Additional
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    cliente = relationship("Cliente", back_populates="contratos", foreign_keys=[cliente_id])
    veiculo = relationship("Veiculo", back_populates="contratos")
    empresa = relationship("Empresa", back_populates="contratos")
    quilometragens = relationship("Quilometragem", back_populates="contrato", cascade="all, delete-orphan")
    despesas = relationship("DespesaContrato", back_populates="contrato", cascade="all, delete-orphan")
    prorrogacoes = relationship("ProrrogacaoContrato", back_populates="contrato", cascade="all, delete-orphan")
    check_ins_outs = relationship("CheckinCheckout", back_populates="contrato", cascade="all, delete-orphan")
    multas = relationship("Multa", back_populates="contrato")

    def __repr__(self) -> str:
        return f"<Contrato(id={self.id}, cliente_id={self.cliente_id}, veiculo_id={self.veiculo_id})>"


class Quilometragem(Base):
    """Mileage details for contracts."""

    __tablename__ = "quilometragem"

    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[int] = mapped_column(ForeignKey("contratos.id"), nullable=False)
    discriminacao: Mapped[str] = mapped_column(String(255), nullable=False)
    quantidade: Mapped[float] = mapped_column(Float, nullable=False)
    preco_unitario: Mapped[float] = mapped_column(Float, nullable=False)
    preco_total: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    contrato = relationship("Contrato", back_populates="quilometragens")

    def __repr__(self) -> str:
        return f"<Quilometragem(id={self.id}, contrato_id={self.contrato_id})>"


class DespesaContrato(Base):
    """Expenses associated with contracts."""

    __tablename__ = "despesas_contrato"

    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[int] = mapped_column(ForeignKey("contratos.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    data_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    responsavel: Mapped[str | None] = mapped_column(String(255))
    observacoes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    contrato = relationship("Contrato", back_populates="despesas")

    def __repr__(self) -> str:
        return f"<DespesaContrato(id={self.id}, contrato_id={self.contrato_id})>"


class ProrrogacaoContrato(Base):
    """Contract extensions/renewals."""

    __tablename__ = "prorrogacoes_contrato"

    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[int] = mapped_column(ForeignKey("contratos.id"), nullable=False)
    data_prevista_anterior: Mapped[date] = mapped_column(Date, nullable=False)
    data_prevista_nova: Mapped[date] = mapped_column(Date, nullable=False)
    motivo: Mapped[str] = mapped_column(String(255), nullable=False)
    diarias_adicionais: Mapped[int] = mapped_column(Integer, nullable=False)
    valor_adicional: Mapped[float] = mapped_column(Float, nullable=False)
    data_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    contrato = relationship("Contrato", back_populates="prorrogacoes")

    def __repr__(self) -> str:
        return f"<ProrrogacaoContrato(id={self.id}, contrato_id={self.contrato_id})>"

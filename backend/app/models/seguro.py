"""
Insurance models for MPCARS.
"""
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Seguro(Base):
    """Insurance policies for vehicles."""

    __tablename__ = "seguros"

    id: Mapped[int] = mapped_column(primary_key=True)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    seguradora: Mapped[str] = mapped_column(String(255), nullable=False)
    numero_apolice: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    tipo_seguro: Mapped[str] = mapped_column(String(100), default="Completo", nullable=False)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    valor: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    valor_franquia: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    cobertura: Mapped[str | None] = mapped_column(Text)
    quantidade_parcelas: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Ativo", nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    veiculo = relationship("Veiculo", back_populates="seguros")
    parcelas = relationship("ParcelaSeguro", back_populates="seguro", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Seguro(id={self.id}, veiculo_id={self.veiculo_id}, numero_apolice={self.numero_apolice})>"


class ParcelaSeguro(Base):
    """Insurance policy payment installments."""

    __tablename__ = "parcelas_seguro"

    id: Mapped[int] = mapped_column(primary_key=True)
    seguro_id: Mapped[int] = mapped_column(ForeignKey("seguros.id"), nullable=False)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    numero_parcela: Mapped[int] = mapped_column(Integer, nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    data_pagamento: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="Pendente", nullable=False)
    mes_referencia: Mapped[str | None] = mapped_column(String(10))
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    seguro = relationship("Seguro", back_populates="parcelas")

    def __repr__(self) -> str:
        return f"<ParcelaSeguro(id={self.id}, seguro_id={self.seguro_id}, numero_parcela={self.numero_parcela})>"

"""
IPVA (Vehicle Tax) models for MPCARS.
"""
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Float, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class IpvaAliquota(Base):
    """IPVA tax rates by state and vehicle type."""

    __tablename__ = "ipva_aliquotas"
    __table_args__ = (UniqueConstraint("estado", "tipo_veiculo", name="uq_ipva_aliquota"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    estado: Mapped[str] = mapped_column(String(2), nullable=False)
    tipo_veiculo: Mapped[str] = mapped_column(String(100), nullable=False)
    aliquota: Mapped[float] = mapped_column(Float, nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<IpvaAliquota(estado={self.estado}, tipo_veiculo={self.tipo_veiculo}, aliquota={self.aliquota})>"


class IpvaRegistro(Base):
    """IPVA tax registration and payment records."""

    __tablename__ = "ipva_registros"

    id: Mapped[int] = mapped_column(primary_key=True)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    ano_referencia: Mapped[int] = mapped_column(Integer, nullable=False)
    valor_venal: Mapped[float] = mapped_column(Float, nullable=False)
    aliquota: Mapped[float] = mapped_column(Float, nullable=False)
    valor_ipva: Mapped[float] = mapped_column(Float, nullable=False)
    valor_pago: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    data_vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    data_pagamento: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="Pendente", nullable=False)
    parcelas: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parcela_atual: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    veiculo = relationship("Veiculo", back_populates="ipva_registros")

    def __repr__(self) -> str:
        return f"<IpvaRegistro(id={self.id}, veiculo_id={self.veiculo_id}, ano_referencia={self.ano_referencia})>"

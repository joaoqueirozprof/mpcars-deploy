"""
Operational models for MPCARS.
"""
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Reserva(Base):
    """Vehicle reservations."""

    __tablename__ = "reservas"

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pendente", nullable=False)
    valor_estimado: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Reserva(id={self.id}, cliente_id={self.cliente_id}, veiculo_id={self.veiculo_id})>"


class CheckinCheckout(Base):
    """Check-in and check-out records for contracts."""

    __tablename__ = "checkin_checkout"

    id: Mapped[int] = mapped_column(primary_key=True)
    contrato_id: Mapped[int] = mapped_column(ForeignKey("contratos.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)  # 'check-in' or 'check-out'
    data_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    km: Mapped[float] = mapped_column(Float, nullable=False)
    nivel_combustivel: Mapped[str | None] = mapped_column(String(50))
    itens_checklist: Mapped[str | None] = mapped_column(Text)
    avarias: Mapped[str | None] = mapped_column(Text)
    observacoes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    contrato = relationship("Contrato", back_populates="check_ins_outs")

    def __repr__(self) -> str:
        return f"<CheckinCheckout(id={self.id}, contrato_id={self.contrato_id}, tipo={self.tipo})>"


class Multa(Base):
    """Traffic fines and penalties."""

    __tablename__ = "multas"

    id: Mapped[int] = mapped_column(primary_key=True)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    contrato_id: Mapped[int | None] = mapped_column(ForeignKey("contratos.id"), nullable=True)
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("clientes.id"), nullable=True)
    data_infracao: Mapped[date] = mapped_column(Date, nullable=False)
    data_notificacao: Mapped[date | None] = mapped_column(Date)
    auto_infracao: Mapped[str | None] = mapped_column(String(50), index=True)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    pontos: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gravidade: Mapped[str] = mapped_column(String(50), default="Média", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pendente", nullable=False)
    responsavel: Mapped[str | None] = mapped_column(String(255))
    data_pagamento: Mapped[date | None] = mapped_column(Date)
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    veiculo = relationship("Veiculo", back_populates="multas")
    contrato = relationship("Contrato", back_populates="multas")

    def __repr__(self) -> str:
        return f"<Multa(id={self.id}, veiculo_id={self.veiculo_id}, valor={self.valor})>"


class Manutencao(Base):
    """Vehicle maintenance records."""

    __tablename__ = "manutencoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(100), default="Preventiva", nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    km_realizada: Mapped[float | None] = mapped_column(Float)
    km_proxima: Mapped[float | None] = mapped_column(Float)
    data_realizada: Mapped[date | None] = mapped_column(Date)
    data_proxima: Mapped[date | None] = mapped_column(Date)
    custo: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    oficina: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="Agendada", nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    veiculo = relationship("Veiculo", back_populates="manutencoes")

    def __repr__(self) -> str:
        return f"<Manutencao(id={self.id}, veiculo_id={self.veiculo_id}, tipo={self.tipo})>"

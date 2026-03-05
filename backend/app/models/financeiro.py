"""
Financial models for MPCARS.
"""
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class DespesaVeiculo(Base):
    """Vehicle expenses."""

    __tablename__ = "despesas_veiculo"

    id: Mapped[int] = mapped_column(primary_key=True)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    km: Mapped[float | None] = mapped_column(Float)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    pneu: Mapped[bool | None] = mapped_column(nullable=True)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    veiculo = relationship("Veiculo", back_populates="despesas")

    def __repr__(self) -> str:
        return f"<DespesaVeiculo(id={self.id}, veiculo_id={self.veiculo_id}, valor={self.valor})>"


class DespesaLoja(Base):
    """Store/shop expenses."""

    __tablename__ = "despesas_loja"

    id: Mapped[int] = mapped_column(primary_key=True)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    ano: Mapped[int] = mapped_column(Integer, nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<DespesaLoja(id={self.id}, mes={self.mes}, ano={self.ano}, valor={self.valor})>"


class DespesaOperacional(Base):
    """Operational expenses."""

    __tablename__ = "despesas_operacionais"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    origem_tabela: Mapped[str] = mapped_column(String(100), nullable=False)
    origem_id: Mapped[int] = mapped_column(Integer, nullable=False)
    veiculo_id: Mapped[int | None] = mapped_column(ForeignKey("veiculos.id"), nullable=True)
    empresa_id: Mapped[int | None] = mapped_column(ForeignKey("empresas.id"), nullable=True)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    ano: Mapped[int] = mapped_column(Integer, nullable=False)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    veiculo = relationship("Veiculo", back_populates="despesas_operacionais")
    empresa = relationship("Empresa", back_populates="despesas_operacionais")

    def __repr__(self) -> str:
        return f"<DespesaOperacional(id={self.id}, tipo={self.tipo}, valor={self.valor})>"

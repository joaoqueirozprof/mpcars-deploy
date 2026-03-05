"""
Document and vehicle usage models for MPCARS.
"""
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Documento(Base):
    """Document storage for various entities."""

    __tablename__ = "documentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo_entidade: Mapped[str] = mapped_column(String(100), nullable=False)
    entidade_id: Mapped[int] = mapped_column(Integer, nullable=False)
    nome_arquivo: Mapped[str] = mapped_column(String(255), nullable=False)
    nome_original: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_documento: Mapped[str] = mapped_column(String(100), nullable=False)
    caminho: Mapped[str] = mapped_column(String(512), nullable=False)
    tamanho: Mapped[int] = mapped_column(Integer, nullable=False)
    data_upload: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    observacoes: Mapped[str | None] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<Documento(id={self.id}, tipo_entidade={self.tipo_entidade}, entidade_id={self.entidade_id})>"


class UsoVeiculoEmpresa(Base):
    """Vehicle usage records by company."""

    __tablename__ = "uso_veiculo_empresa"

    id: Mapped[int] = mapped_column(primary_key=True)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), nullable=False)
    contrato_id: Mapped[int | None] = mapped_column(ForeignKey("contratos.id"), nullable=True)
    km_inicial: Mapped[float] = mapped_column(Float, nullable=False)
    km_final: Mapped[float] = mapped_column(Float, nullable=False)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[date] = mapped_column(Date, nullable=False)
    km_referencia: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    valor_km_extra: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    valor_locacao: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Em uso", nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    veiculo = relationship("Veiculo", back_populates="usos_veiculo")
    empresa = relationship("Empresa", back_populates="usos_veiculo")
    relatorios_nf = relationship("RelatorioNF", back_populates="uso_veiculo")
    despesas_nf = relationship("DespesaNF", back_populates="uso_veiculo")

    def __repr__(self) -> str:
        return f"<UsoVeiculoEmpresa(id={self.id}, veiculo_id={self.veiculo_id}, empresa_id={self.empresa_id})>"

    def _to_dict(self) -> dict:
        return {
            "id": self.id,
            "veiculo_id": self.veiculo_id,
            "empresa_id": self.empresa_id,
            "contrato_id": self.contrato_id,
            "km_inicial": self.km_inicial,
            "km_final": self.km_final,
            "data_inicio": self.data_inicio.isoformat() if self.data_inicio else None,
            "data_fim": self.data_fim.isoformat() if self.data_fim else None,
            "km_referencia": self.km_referencia,
            "valor_km_extra": self.valor_km_extra,
            "valor_locacao": self.valor_locacao,
            "status": self.status,
            "observacoes": self.observacoes,
            "data_cadastro": self.data_cadastro.isoformat() if self.data_cadastro else None
        }


class RelatorioNF(Base):
    """NF (Nota Fiscal) reports for vehicle usage."""

    __tablename__ = "relatorios_nf"

    id: Mapped[int] = mapped_column(primary_key=True)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    empresa_id: Mapped[int | None] = mapped_column(ForeignKey("empresas.id"), nullable=True)
    uso_id: Mapped[int | None] = mapped_column(ForeignKey("uso_veiculo_empresa.id"), nullable=True)
    periodo_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    periodo_fim: Mapped[date] = mapped_column(Date, nullable=False)
    km_inicial: Mapped[float] = mapped_column(Float, nullable=False)
    km_final: Mapped[float] = mapped_column(Float, nullable=False)
    km_percorrida: Mapped[float] = mapped_column(Float, nullable=False)
    km_referencia: Mapped[float] = mapped_column(Float, nullable=False)
    km_excedente: Mapped[float] = mapped_column(Float, nullable=False)
    valor_km_extra: Mapped[float] = mapped_column(Float, nullable=False)
    valor_total_extra: Mapped[float] = mapped_column(Float, nullable=False)
    caminho_pdf: Mapped[str | None] = mapped_column(String(512))
    data_geracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    observacoes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    veiculo = relationship("Veiculo", back_populates="relatorios_nf")
    empresa = relationship("Empresa", back_populates="relatorios_nf")
    uso_veiculo = relationship("UsoVeiculoEmpresa", back_populates="relatorios_nf")

    def __repr__(self) -> str:
        return f"<RelatorioNF(id={self.id}, veiculo_id={self.veiculo_id})>"


class DespesaNF(Base):
    """Expenses associated with NF reports."""

    __tablename__ = "despesas_nf"

    id: Mapped[int] = mapped_column(primary_key=True)
    uso_id: Mapped[int] = mapped_column(ForeignKey("uso_veiculo_empresa.id"), nullable=False)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculos.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    uso_veiculo = relationship("UsoVeiculoEmpresa", back_populates="despesas_nf")
    veiculo = relationship("Veiculo", back_populates="despesas_nf")

    def __repr__(self) -> str:
        return f"<DespesaNF(id={self.id}, uso_id={self.uso_id}, veiculo_id={self.veiculo_id})>"

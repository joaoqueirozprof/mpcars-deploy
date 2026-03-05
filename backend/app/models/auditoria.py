"""
Audit and system configuration models for MPCARS.
"""
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Float, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class AuditLog(Base):
    """Audit log for tracking data changes."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    acao: Mapped[str] = mapped_column(String(50), nullable=False)  # 'CREATE', 'UPDATE', 'DELETE'
    tabela: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    registro_id: Mapped[int] = mapped_column(Integer, nullable=False)
    dados_anteriores: Mapped[str | None] = mapped_column(Text)
    dados_novos: Mapped[str | None] = mapped_column(Text)
    usuario: Mapped[str] = mapped_column(String(255), default="sistema", nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    detalhes: Mapped[str | None] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, acao={self.acao}, tabela={self.tabela}, registro_id={self.registro_id})>"


class AlertaHistorico(Base):
    """Alert history for system events."""

    __tablename__ = "alertas_historico"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo_alerta: Mapped[str] = mapped_column(String(100), nullable=False)
    urgencia: Mapped[str] = mapped_column(String(50), default="info", nullable=False)
    entidade_tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    entidade_id: Mapped[int] = mapped_column(Integer, nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    data_resolucao: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolvido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolvido_por: Mapped[str | None] = mapped_column(String(255))
    acao_tomada: Mapped[str | None] = mapped_column(Text)
    observacoes: Mapped[str | None] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<AlertaHistorico(id={self.id}, tipo_alerta={self.tipo_alerta}, urgencia={self.urgencia})>"


class Configuracao(Base):
    """System configuration key-value store."""

    __tablename__ = "configuracoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    chave: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    valor: Mapped[str] = mapped_column(Text, nullable=False)

    def __repr__(self) -> str:
        return f"<Configuracao(id={self.id}, chave={self.chave})>"


class MotoristaEmpresa(Base):
    """Driver association with company."""

    __tablename__ = "motoristas_empresa"
    __table_args__ = (UniqueConstraint("empresa_id", "cliente_id", name="uq_motorista_empresa"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), nullable=False)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    cargo: Mapped[str] = mapped_column(String(100), default="Motorista", nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    data_vinculo: Mapped[date] = mapped_column(Date, nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    empresa = relationship("Empresa", back_populates="motoristas_empresa")

    def __repr__(self) -> str:
        return f"<MotoristaEmpresa(id={self.id}, empresa_id={self.empresa_id}, cliente_id={self.cliente_id})>"

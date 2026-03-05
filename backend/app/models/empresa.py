"""
Company model for MPCARS.
"""
from datetime import datetime
from sqlalchemy import String, DateTime, Float, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Empresa(Base):
    """Company model for managing rental companies."""

    __tablename__ = "empresas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    razao_social: Mapped[str] = mapped_column(String(255), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    endereco: Mapped[str] = mapped_column(String(255), nullable=False)
    numero: Mapped[str] = mapped_column(String(10), nullable=False)
    bairro: Mapped[str] = mapped_column(String(100), nullable=False)
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(String(2), default="RN", nullable=False)
    cep: Mapped[str] = mapped_column(String(10), nullable=False)
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    responsavel: Mapped[str] = mapped_column(String(255), nullable=False)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    valor_km_extra_padrao: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    clientes = relationship("Cliente", back_populates="empresa")
    veiculos = relationship("Veiculo", back_populates="empresa")
    contratos = relationship("Contrato", back_populates="empresa")
    usos_veiculo = relationship("UsoVeiculoEmpresa", back_populates="empresa")
    relatorios_nf = relationship("RelatorioNF", back_populates="empresa")
    motoristas_empresa = relationship("MotoristaEmpresa", back_populates="empresa")
    despesas_operacionais = relationship("DespesaOperacional", back_populates="empresa")

    def __repr__(self) -> str:
        return f"<Empresa(id={self.id}, nome={self.nome}, cnpj={self.cnpj})>"

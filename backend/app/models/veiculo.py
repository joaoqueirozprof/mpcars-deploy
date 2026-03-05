"""
Vehicle model for MPCARS.
"""
from datetime import datetime, date
from sqlalchemy import String, Integer, DateTime, Date, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Veiculo(Base):
    """Vehicle model for rental fleet."""

    __tablename__ = "veiculos"

    id: Mapped[int] = mapped_column(primary_key=True)
    marca: Mapped[str] = mapped_column(String(100), nullable=False)
    modelo: Mapped[str] = mapped_column(String(100), nullable=False)
    placa: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    ano: Mapped[int] = mapped_column(Integer, nullable=False)
    cor: Mapped[str] = mapped_column(String(50), nullable=False)
    combustivel: Mapped[str] = mapped_column(String(50), nullable=False)
    km_atual: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    preco_compra: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    data_compra: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="Disponível", nullable=False)
    tipo_veiculo: Mapped[str] = mapped_column(String(50), default="Passeio", nullable=False)
    chassi: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    renavam: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    valor_venal: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    km_referencia: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    valor_km_extra: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    km_inicio_empresa: Mapped[float] = mapped_column(Float, default=0, nullable=False)

    # Equipment/Features
    macaco: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    estepe: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ferram: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    triangulo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    documento: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    extintor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    calotas: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tapetes: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cd_player: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Foreign Key
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), nullable=False)

    # Additional
    observacoes: Mapped[str | None] = mapped_column(Text)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    empresa = relationship("Empresa", back_populates="veiculos")
    contratos = relationship("Contrato", back_populates="veiculo")
    despesas = relationship("DespesaVeiculo", back_populates="veiculo")
    seguros = relationship("Seguro", back_populates="veiculo")
    multas = relationship("Multa", back_populates="veiculo")
    manutencoes = relationship("Manutencao", back_populates="veiculo")
    ipva_registros = relationship("IpvaRegistro", back_populates="veiculo")
    usos_veiculo = relationship("UsoVeiculoEmpresa", back_populates="veiculo")
    relatorios_nf = relationship("RelatorioNF", back_populates="veiculo")
    despesas_nf = relationship("DespesaNF", back_populates="veiculo")
    despesas_operacionais = relationship("DespesaOperacional", back_populates="veiculo")

    def __repr__(self) -> str:
        return f"<Veiculo(id={self.id}, marca={self.marca}, modelo={self.modelo}, placa={self.placa})>"

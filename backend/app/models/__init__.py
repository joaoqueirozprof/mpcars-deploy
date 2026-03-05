"""
Import all models for easy access and database initialization.
"""
from app.models.base import TimestampMixin
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.cliente import Cliente
from app.models.veiculo import Veiculo
from app.models.contrato import Contrato, Quilometragem, DespesaContrato, ProrrogacaoContrato
from app.models.financeiro import DespesaVeiculo, DespesaLoja, DespesaOperacional
from app.models.seguro import Seguro, ParcelaSeguro
from app.models.ipva import IpvaAliquota, IpvaRegistro
from app.models.operacional import Reserva, CheckinCheckout, Multa, Manutencao
from app.models.documento import Documento, UsoVeiculoEmpresa, RelatorioNF, DespesaNF
from app.models.auditoria import AuditLog, AlertaHistorico, Configuracao, MotoristaEmpresa

__all__ = [
    "TimestampMixin",
    "Usuario",
    "Empresa",
    "Cliente",
    "Veiculo",
    "Contrato",
    "Quilometragem",
    "DespesaContrato",
    "ProrrogacaoContrato",
    "DespesaVeiculo",
    "DespesaLoja",
    "DespesaOperacional",
    "Seguro",
    "ParcelaSeguro",
    "IpvaAliquota",
    "IpvaRegistro",
    "Reserva",
    "CheckinCheckout",
    "Multa",
    "Manutencao",
    "Documento",
    "UsoVeiculoEmpresa",
    "RelatorioNF",
    "DespesaNF",
    "AuditLog",
    "AlertaHistorico",
    "Configuracao",
    "MotoristaEmpresa",
]

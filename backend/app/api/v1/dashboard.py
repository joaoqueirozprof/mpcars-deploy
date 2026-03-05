from typing import Dict, Any, List
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Veiculo, Cliente, Contrato

router = APIRouter()


@router.get("/", summary="Dados do Dashboard")
async def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard data including vehicle statistics,
    client count, active contracts, and financial information.

    Args:
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary containing:
        - Vehicle statistics (total, available, rented, maintenance)
        - Client count
        - Active contracts
        - Current month revenue, expenses, profit
        - Alerts for expiring licenses, insurance, etc.
    """
    # Vehicle statistics
    total_veiculos = db.query(func.count(Veiculo.id)).scalar() or 0
    veiculos_disponiveis = db.query(func.count(Veiculo.id)).filter(
        Veiculo.status == "Disponível"
    ).scalar() or 0
    veiculos_alugados = db.query(func.count(Veiculo.id)).filter(
        Veiculo.status == "Alugado"
    ).scalar() or 0
    veiculos_manutencao = db.query(func.count(Veiculo.id)).filter(
        Veiculo.status == "Manutenção"
    ).scalar() or 0

    # Client statistics
    total_clientes = db.query(func.count(Cliente.id)).scalar() or 0

    # Active contracts
    contratos_ativos = db.query(func.count(Contrato.id)).filter(
        Contrato.status == "Ativo"
    ).scalar() or 0

    # Financial data for current month
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    month_end = datetime(
        now.year if now.month < 12 else now.year + 1,
        now.month + 1 if now.month < 12 else 1,
        1
    ) - timedelta(days=1)

    # Calculate revenue (completed contracts in current month)
    receita_mes = Decimal("0.00")
    contratos_mes = db.query(Contrato).filter(
        Contrato.status == "Finalizado",
        Contrato.data_inicio >= month_start,
        Contrato.data_fim <= month_end
    ).all()

    for contrato in contratos_mes:
        dias = (contrato.data_fim - contrato.data_inicio).days
        if dias < 1:
            dias = 1
        receita_mes += contrato.valor_diaria * dias

    # Placeholder for expenses (would need DespesasVeiculo and DespesasLoja models)
    despesas_mes = Decimal("0.00")
    lucro_mes = receita_mes - despesas_mes

    # Alerts
    alertas = []

    # Check for expiring licenses (CNH)
    cnh_expirando = db.query(Cliente).filter(
        Cliente.data_cnh_validade.isnot(None),
        Cliente.data_cnh_validade <= datetime.utcnow() + timedelta(days=30),
        Cliente.data_cnh_validade > datetime.utcnow()
    ).count() or 0

    if cnh_expirando > 0:
        alertas.append({
            "tipo": "CNH Vencendo",
            "quantidade": cnh_expirando,
            "mensagem": f"{cnh_expirando} cliente(s) com CNH vencendo em 30 dias"
        })

    # Check for CNH already expired
    cnh_vencida = db.query(Cliente).filter(
        Cliente.data_cnh_validade.isnot(None),
        Cliente.data_cnh_validade <= datetime.utcnow()
    ).count() or 0

    if cnh_vencida > 0:
        alertas.append({
            "tipo": "CNH Vencida",
            "quantidade": cnh_vencida,
            "mensagem": f"{cnh_vencida} cliente(s) com CNH vencida",
            "severity": "high"
        })

    # Check for vehicles in maintenance
    if veiculos_manutencao > 0:
        alertas.append({
            "tipo": "Veículos em Manutenção",
            "quantidade": veiculos_manutencao,
            "mensagem": f"{veiculos_manutencao} veículo(s) em manutenção"
        })

    return {
        "veiculos": {
            "total": total_veiculos,
            "disponíveis": veiculos_disponiveis,
            "alugados": veiculos_alugados,
            "manutenção": veiculos_manutencao
        },
        "clientes": {
            "total": total_clientes
        },
        "contratos": {
            "ativos": contratos_ativos
        },
        "financeiro": {
            "receita_mes_atual": float(receita_mes),
            "despesas_mes_atual": float(despesas_mes),
            "lucro_mes_atual": float(lucro_mes)
        },
        "alertas": alertas,
        "timestamp": datetime.utcnow().isoformat()
    }

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
        - Recent activity (last 10 contracts)
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
        Contrato.data_inicio >= month_start.date(),
        Contrato.data_fim <= month_end.date()
    ).all()

    for contrato in contratos_mes:
        dias = (contrato.data_fim - contrato.data_inicio).days
        if dias < 1:
            dias = 1
        receita_mes += Decimal(str(contrato.valor_diaria * dias))

    # Calculate expenses from maintenance
    despesas_mes = Decimal("0.00")
    # Placeholder for expenses (would need DespesasVeiculo and DespesasLoja models)

    lucro_mes = receita_mes - despesas_mes

    # Get recent activities (last 10 contracts created or finalized)
    contratos_recentes = db.query(Contrato).order_by(
        Contrato.data_cadastro.desc()
    ).limit(10).all()

    atividades_recentes = []
    for contrato in contratos_recentes:
        atividades_recentes.append({
            "id": contrato.id,
            "tipo": f"Contrato {contrato.status.lower()}",
            "cliente_id": contrato.cliente_id,
            "veiculo_id": contrato.veiculo_id,
            "status": contrato.status,
            "data": contrato.data_saida.isoformat() if contrato.data_saida else None
        })

    # Alerts
    alertas = []

    # Check for expiring licenses (CNH)
    cnh_expirando = db.query(Cliente).filter(
        Cliente.cnh_validade.isnot(None),
        Cliente.cnh_validade <= datetime.utcnow().date() + timedelta(days=30),
        Cliente.cnh_validade > datetime.utcnow().date()
    ).count() or 0

    if cnh_expirando > 0:
        alertas.append({
            "tipo": "CNH Vencendo",
            "quantidade": cnh_expirando,
            "mensagem": f"{cnh_expirando} cliente(s) com CNH vencendo em 30 dias",
            "severity": "warning"
        })

    # Check for CNH already expired
    cnh_vencida = db.query(Cliente).filter(
        Cliente.cnh_validade.isnot(None),
        Cliente.cnh_validade <= datetime.utcnow().date()
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
            "mensagem": f"{veiculos_manutencao} veículo(s) em manutenção",
            "severity": "info"
        })

    # Check for expiring insurance
    from app.models import Seguro
    seguros_expirando = db.query(func.count(Seguro.id)).filter(
        Seguro.data_vencimento.isnot(None),
        Seguro.data_vencimento <= datetime.utcnow().date() + timedelta(days=30),
        Seguro.data_vencimento > datetime.utcnow().date(),
        Seguro.status == "Ativo"
    ).scalar() or 0

    if seguros_expirando > 0:
        alertas.append({
            "tipo": "Seguros Vencendo",
            "quantidade": seguros_expirando,
            "mensagem": f"{seguros_expirando} seguro(s) vencendo em 30 dias",
            "severity": "warning"
        })

    # Check for pending fines
    from app.models import Multa
    multas_pendentes = db.query(func.count(Multa.id)).filter(
        Multa.status == "Pendente"
    ).scalar() or 0

    if multas_pendentes > 0:
        alertas.append({
            "tipo": "Multas Pendentes",
            "quantidade": multas_pendentes,
            "mensagem": f"{multas_pendentes} multa(s) pendente(s) de pagamento",
            "severity": "warning"
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
            "ativos": contratos_ativos,
            "total": db.query(func.count(Contrato.id)).scalar() or 0
        },
        "financeiro": {
            "receita_mes_atual": float(receita_mes),
            "despesas_mes_atual": float(despesas_mes),
            "lucro_mes_atual": float(lucro_mes)
        },
        "atividades_recentes": atividades_recentes,
        "alertas": alertas,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/stats", summary="Estatísticas do Dashboard")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """Alias for dashboard data."""
    return await get_dashboard_data(db=db, current_user=current_user)

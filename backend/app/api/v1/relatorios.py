from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Veiculo, Cliente, Contrato, Multa, Manutencao, Seguro

router = APIRouter()


@router.get("/financeiro", summary="Relatório Financeiro")
async def relatorio_financeiro(
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get financial report with revenue vs expenses by period.

    Args:
        ano: Year (defaults to current year)
        mes: Month (defaults to current month)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with financial data including revenue, expenses, and profit
    """
    now = datetime.utcnow()
    ano = ano or now.year
    mes = mes or now.month

    # Define month boundaries
    if mes < 1 or mes > 12:
        return {"error": "Mês inválido"}

    month_start = datetime(ano, mes, 1)
    if mes == 12:
        month_end = datetime(ano + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = datetime(ano, mes + 1, 1) - timedelta(days=1)

    # Calculate revenue from completed contracts
    receitas = Decimal("0.00")
    contratos_mes = db.query(Contrato).filter(
        Contrato.status == "Finalizado",
        Contrato.data_inicio >= month_start.date(),
        Contrato.data_fim <= month_end.date()
    ).all()

    for contrato in contratos_mes:
        dias = (contrato.data_fim - contrato.data_inicio).days
        if dias < 1:
            dias = 1
        receitas += Decimal(str(contrato.valor_diaria * dias))

    # Calculate expenses from maintenance
    despesas_manutencao = Decimal("0.00")
    manutencoes = db.query(func.sum(Manutencao.custo)).filter(
        Manutencao.data_realizada >= month_start.date(),
        Manutencao.data_realizada <= month_end.date(),
        Manutencao.status == "Concluída"
    ).scalar()

    if manutencoes:
        despesas_manutencao = Decimal(str(manutencoes))

    # Calculate total expenses (maintenance + fines paid)
    despesas_multas = Decimal("0.00")
    multas = db.query(func.sum(Multa.valor)).filter(
        Multa.data_pagamento >= month_start.date(),
        Multa.data_pagamento <= month_end.date(),
        Multa.status == "Paga"
    ).scalar()

    if multas:
        despesas_multas = Decimal(str(multas))

    despesas_totais = despesas_manutencao + despesas_multas
    lucro = receitas - despesas_totais

    return {
        "periodo": f"{mes:02d}/{ano}",
        "receitas": {
            "total": float(receitas),
            "contratos_finalizados": len(contratos_mes),
            "valor_medio": float(receitas / len(contratos_mes)) if contratos_mes else 0
        },
        "despesas": {
            "total": float(despesas_totais),
            "manutencao": float(despesas_manutencao),
            "multas": float(despesas_multas)
        },
        "lucro_liquido": float(lucro),
        "detalhes": {
            "data_inicio": month_start.isoformat(),
            "data_fim": month_end.isoformat()
        }
    }


@router.get("/frota", summary="Relatório de Utilização de Frota")
async def relatorio_frota(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get fleet utilization report with vehicle status breakdown.

    Args:
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with fleet utilization data
    """
    # Total vehicles
    total_veiculos = db.query(func.count(Veiculo.id)).scalar() or 0

    # Vehicles by status
    veiculos_disponiveis = db.query(func.count(Veiculo.id)).filter(
        Veiculo.status == "Disponível"
    ).scalar() or 0

    veiculos_alugados = db.query(func.count(Veiculo.id)).filter(
        Veiculo.status == "Alugado"
    ).scalar() or 0

    veiculos_manutencao = db.query(func.count(Veiculo.id)).filter(
        Veiculo.status == "Manutenção"
    ).scalar() or 0

    # Calculate utilization percentage
    utilization = (veiculos_alugados / total_veiculos * 100) if total_veiculos > 0 else 0

    # Get active contracts
    contratos_ativos = db.query(func.count(Contrato.id)).filter(
        Contrato.status == "Ativo"
    ).scalar() or 0

    # Get total km traveled
    km_total = db.query(func.sum(Veiculo.km_atual)).scalar() or 0

    return {
        "total_veiculos": total_veiculos,
        "status": {
            "disponíveis": veiculos_disponiveis,
            "alugados": veiculos_alugados,
            "manutenção": veiculos_manutencao
        },
        "utilization_percentage": round(utilization, 2),
        "contratos_ativos": contratos_ativos,
        "quilometragem_total": float(km_total),
        "quilometragem_media": float(km_total / total_veiculos) if total_veiculos > 0 else 0
    }


@router.get("/clientes", summary="Relatório de Atividade de Clientes")
async def relatorio_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get client activity report with rental statistics.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with client activity data
    """
    # Total clients
    total_clientes = db.query(func.count(Cliente.id)).scalar() or 0

    # Get clients with their rental history
    clientes = db.query(
        Cliente.id,
        Cliente.nome,
        Cliente.email,
        Cliente.telefone,
        func.count(Contrato.id).label("total_contratos"),
        func.sum(Contrato.valor_total).label("valor_gasto")
    ).outerjoin(Contrato).group_by(Cliente.id).offset(skip).limit(limit).all()

    cliente_data = []
    for cliente in clientes:
        cliente_data.append({
            "id": cliente.id,
            "nome": cliente.nome,
            "email": cliente.email,
            "telefone": cliente.telefone,
            "total_contratos": cliente.total_contratos or 0,
            "valor_gasto": float(cliente.valor_gasto) if cliente.valor_gasto else 0
        })

    # Top clients by revenue
    top_clientes = db.query(
        Cliente.nome,
        func.count(Contrato.id).label("total_contratos"),
        func.sum(Contrato.valor_total).label("valor_gasto")
    ).join(Contrato).group_by(Cliente.id).order_by(
        func.sum(Contrato.valor_total).desc()
    ).limit(10).all()

    top_data = []
    for cliente in top_clientes:
        top_data.append({
            "nome": cliente.nome,
            "total_contratos": cliente.total_contratos or 0,
            "valor_gasto": float(cliente.valor_gasto) if cliente.valor_gasto else 0
        })

    return {
        "total_clientes": total_clientes,
        "clientes": cliente_data,
        "top_clientes": top_data,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total_clientes
        }
    }


@router.get("/contratos", summary="Relatório de Contratos")
async def relatorio_contratos(
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get contract summary report with status breakdown.

    Args:
        status_filter: Filter by contract status (e.g., 'Ativo', 'Finalizado')
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with contract summary data
    """
    query = db.query(Contrato)

    if status_filter:
        query = query.filter(Contrato.status == status_filter)

    total_contratos = query.count()

    # Contracts by status
    contratos_ativos = db.query(func.count(Contrato.id)).filter(
        Contrato.status == "Ativo"
    ).scalar() or 0

    contratos_finalizados = db.query(func.count(Contrato.id)).filter(
        Contrato.status == "Finalizado"
    ).scalar() or 0

    contratos_cancelados = db.query(func.count(Contrato.id)).filter(
        Contrato.status == "Cancelado"
    ).scalar() or 0

    # Get recent contracts
    contratos_recentes = db.query(Contrato).order_by(
        Contrato.data_criacao.desc()
    ).limit(10).all()

    recentes_data = []
    for contrato in contratos_recentes:
        recentes_data.append({
            "id": contrato.id,
            "cliente_id": contrato.cliente_id,
            "veiculo_id": contrato.veiculo_id,
            "data_inicio": contrato.data_inicio.isoformat() if contrato.data_inicio else None,
            "data_fim": contrato.data_fim.isoformat() if contrato.data_fim else None,
            "status": contrato.status,
            "valor_total": float(contrato.valor_total) if contrato.valor_total else 0
        })

    # Calculate average contract value
    avg_value = db.query(func.avg(Contrato.valor_total)).scalar() or 0

    return {
        "total_contratos": total_contratos,
        "status_breakdown": {
            "ativos": contratos_ativos,
            "finalizados": contratos_finalizados,
            "cancelados": contratos_cancelados
        },
        "valor_medio": float(avg_value),
        "contratos_recentes": recentes_data
    }


@router.get("/manutencoes", summary="Relatório de Manutenções")
async def relatorio_manutencoes(
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get maintenance report with scheduled and completed maintenance.

    Args:
        ano: Year (defaults to current year)
        mes: Month (defaults to current month)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with maintenance data
    """
    now = datetime.utcnow()
    ano = ano or now.year
    mes = mes or now.month

    month_start = datetime(ano, mes, 1)
    if mes == 12:
        month_end = datetime(ano + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = datetime(ano, mes + 1, 1) - timedelta(days=1)

    # Maintenance by status
    manutencoes_agendadas = db.query(func.count(Manutencao.id)).filter(
        Manutencao.status == "Agendada"
    ).scalar() or 0

    manutencoes_em_andamento = db.query(func.count(Manutencao.id)).filter(
        Manutencao.status == "Em andamento"
    ).scalar() or 0

    manutencoes_concluidas = db.query(func.count(Manutencao.id)).filter(
        Manutencao.status == "Concluída",
        Manutencao.data_realizada >= month_start.date(),
        Manutencao.data_realizada <= month_end.date()
    ).scalar() or 0

    # Total cost
    custo_total = db.query(func.sum(Manutencao.custo)).filter(
        Manutencao.data_realizada >= month_start.date(),
        Manutencao.data_realizada <= month_end.date(),
        Manutencao.status == "Concluída"
    ).scalar() or 0

    # Maintenance by type
    manutencoes = db.query(
        Manutencao.tipo,
        func.count(Manutencao.id).label("quantidade"),
        func.sum(Manutencao.custo).label("custo_total")
    ).filter(
        Manutencao.data_realizada >= month_start.date(),
        Manutencao.data_realizada <= month_end.date()
    ).group_by(Manutencao.tipo).all()

    tipo_data = []
    for manutenção in manutencoes:
        tipo_data.append({
            "tipo": manutenção.tipo,
            "quantidade": manutenção.quantidade,
            "custo_total": float(manutenção.custo_total) if manutenção.custo_total else 0
        })

    return {
        "periodo": f"{mes:02d}/{ano}",
        "status": {
            "agendadas": manutencoes_agendadas,
            "em_andamento": manutencoes_em_andamento,
            "concluidas": manutencoes_concluidas
        },
        "custo_total": float(custo_total),
        "por_tipo": tipo_data
    }

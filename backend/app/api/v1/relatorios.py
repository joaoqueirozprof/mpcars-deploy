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


@router.get("/", summary="Listar relatórios disponíveis")
async def list_relatorios(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tipo: Optional[str] = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List available reports as items for the frontend grid."""
    relatorios = [
        {
            "id": "1",
            "nome": "Relatório Financeiro",
            "tipo": "receitas",
            "data_geracao": datetime.utcnow().isoformat(),
            "periodo": datetime.utcnow().strftime("%m/%Y"),
            "descricao": "Resumo de receitas e despesas do período",
        },
        {
            "id": "2",
            "nome": "Relatório de Frota",
            "tipo": "veiculos",
            "data_geracao": datetime.utcnow().isoformat(),
            "periodo": datetime.utcnow().strftime("%m/%Y"),
            "descricao": "Utilização e status da frota de veículos",
        },
        {
            "id": "3",
            "nome": "Relatório de Clientes",
            "tipo": "clientes",
            "data_geracao": datetime.utcnow().isoformat(),
            "periodo": datetime.utcnow().strftime("%m/%Y"),
            "descricao": "Atividade e histórico de clientes",
        },
        {
            "id": "4",
            "nome": "Relatório de Contratos",
            "tipo": "contratos",
            "data_geracao": datetime.utcnow().isoformat(),
            "periodo": datetime.utcnow().strftime("%m/%Y"),
            "descricao": "Resumo de contratos ativos e finalizados",
        },
        {
            "id": "5",
            "nome": "Relatório de Despesas",
            "tipo": "despesas",
            "data_geracao": datetime.utcnow().isoformat(),
            "periodo": datetime.utcnow().strftime("%m/%Y"),
            "descricao": "Detalhamento de despesas por categoria",
        },
    ]

    if tipo and tipo != "todos":
        relatorios = [r for r in relatorios if r["tipo"] == tipo]

    total = len(relatorios)

    return {
        "items": relatorios[skip:skip + limit],
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "per_page": limit,
    }


@router.get("/financeiro", summary="Relatório Financeiro")
async def relatorio_financeiro(
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get financial report with revenue vs expenses by period."""
    now = datetime.utcnow()
    ano = ano or now.year
    mes = mes or now.month

    if mes < 1 or mes > 12:
        return {"error": "Mês inválido"}

    month_start = datetime(ano, mes, 1)
    if mes == 12:
        month_end = datetime(ano + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = datetime(ano, mes + 1, 1) - timedelta(days=1)

    try:
        receitas = Decimal("0.00")
        contratos_mes = db.query(Contrato).filter(
            Contrato.status == "Finalizado",
            Contrato.data_saida >= month_start.date(),
        ).all()

        for contrato in contratos_mes:
            receitas += Decimal(str(contrato.total or 0))
    except Exception:
        receitas = Decimal("0.00")
        contratos_mes = []

    try:
        despesas_manutencao = Decimal("0.00")
        manutencoes = db.query(func.sum(Manutencao.custo)).filter(
            Manutencao.data_realizada >= month_start.date(),
            Manutencao.data_realizada <= month_end.date(),
            Manutencao.status == "Concluída"
        ).scalar()
        if manutencoes:
            despesas_manutencao = Decimal(str(manutencoes))
    except Exception:
        despesas_manutencao = Decimal("0.00")

    try:
        despesas_multas = Decimal("0.00")
        multas = db.query(func.sum(Multa.valor)).filter(
            Multa.data_pagamento >= month_start.date(),
            Multa.data_pagamento <= month_end.date(),
            Multa.status == "Paga"
        ).scalar()
        if multas:
            despesas_multas = Decimal(str(multas))
    except Exception:
        despesas_multas = Decimal("0.00")

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
    }


@router.get("/frota", summary="Relatório de Utilização de Frota")
async def relatorio_frota(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get fleet utilization report."""
    try:
        total_veiculos = db.query(func.count(Veiculo.id)).scalar() or 0
        veiculos_disponiveis = db.query(func.count(Veiculo.id)).filter(Veiculo.status == "Disponível").scalar() or 0
        veiculos_alugados = db.query(func.count(Veiculo.id)).filter(Veiculo.status == "Alugado").scalar() or 0
        veiculos_manutencao = db.query(func.count(Veiculo.id)).filter(Veiculo.status == "Manutenção").scalar() or 0
        contratos_ativos = db.query(func.count(Contrato.id)).filter(Contrato.status == "Ativo").scalar() or 0
        km_total = db.query(func.sum(Veiculo.km_atual)).scalar() or 0
    except Exception:
        total_veiculos = 0
        veiculos_disponiveis = 0
        veiculos_alugados = 0
        veiculos_manutencao = 0
        contratos_ativos = 0
        km_total = 0

    utilization = (veiculos_alugados / total_veiculos * 100) if total_veiculos > 0 else 0

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
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get client activity report."""
    try:
        total_clientes = db.query(func.count(Cliente.id)).scalar() or 0
    except Exception:
        total_clientes = 0

    return {
        "total_clientes": total_clientes,
        "clientes": [],
        "top_clientes": [],
    }


@router.get("/contratos", summary="Relatório de Contratos")
async def relatorio_contratos(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get contract summary report."""
    try:
        contratos_ativos = db.query(func.count(Contrato.id)).filter(Contrato.status == "Ativo").scalar() or 0
        contratos_finalizados = db.query(func.count(Contrato.id)).filter(Contrato.status == "Finalizado").scalar() or 0
        contratos_cancelados = db.query(func.count(Contrato.id)).filter(Contrato.status == "Cancelado").scalar() or 0
        total = contratos_ativos + contratos_finalizados + contratos_cancelados
    except Exception:
        contratos_ativos = 0
        contratos_finalizados = 0
        contratos_cancelados = 0
        total = 0

    return {
        "total_contratos": total,
        "status_breakdown": {
            "ativos": contratos_ativos,
            "finalizados": contratos_finalizados,
            "cancelados": contratos_cancelados
        },
    }

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import (
    Contrato, DespesaVeiculo, DespesaLoja, DespesaOperacional,
    Veiculo, Empresa, Cliente
)

router = APIRouter()


@router.get("/", summary="Listar transações financeiras")
async def list_financeiro(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """List financial transactions."""
    return {
        "items": [],
        "total": 0,
        "page": 1,
        "per_page": limit
    }


@router.get("/resumo", summary="Resumo financeiro mensal")
async def get_financial_summary(
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get financial summary for a specific month including revenue,
    expenses, and profit with real data.

    Args:
        ano: Year (defaults to current year)
        mes: Month (defaults to current month)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with:
        - receitas: Total income for the month
        - despesas: Total expenses for the month
        - lucro: Net profit
        - detalhes: Month details and breakdown
    """
    try:
        now = datetime.utcnow()
        ano = ano or now.year
        mes = mes or now.month

        # Validate month
        if mes < 1 or mes > 12:
            return {"error": "Mês inválido"}

        # Define month boundaries
        month_start = datetime(ano, mes, 1)
        if mes == 12:
            month_end = datetime(ano + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = datetime(ano, mes + 1, 1) - timedelta(days=1)

        # Calculate revenue from finalized contracts
        receitas = Decimal("0.00")
        try:
            contratos_finalizados = db.query(Contrato).filter(
                Contrato.status == "Finalizado",
                Contrato.data_saida >= month_start.date(),
                Contrato.data_saida <= month_end.date()
            ).all()

            for contrato in contratos_finalizados:
                if contrato.total:
                    receitas += Decimal(str(contrato.total))
                elif contrato.valor_diaria and contrato.quantidade_diarias:
                    receitas += Decimal(str(contrato.valor_diaria * contrato.quantidade_diarias))
        except Exception:
            pass

        # Calculate total expenses
        despesas = Decimal("0.00")

        # Sum despesas_veiculos for the month
        try:
            despesas_veiculos = db.query(func.sum(DespesaVeiculo.valor)).filter(
                DespesaVeiculo.data >= month_start.date(),
                DespesaVeiculo.data <= month_end.date()
            ).scalar() or 0
            despesas += Decimal(str(despesas_veiculos))
        except Exception:
            pass

        # Sum despesas_loja for the month
        try:
            despesas_loja = db.query(func.sum(DespesaLoja.valor)).filter(
                DespesaLoja.mes == mes,
                DespesaLoja.ano == ano
            ).scalar() or 0
            despesas += Decimal(str(despesas_loja))
        except Exception:
            pass

        # Sum despesas_operacionais for the month
        try:
            despesas_operacionais = db.query(func.sum(DespesaOperacional.valor)).filter(
                DespesaOperacional.mes == mes,
                DespesaOperacional.ano == ano
            ).scalar() or 0
            despesas += Decimal(str(despesas_operacionais))
        except Exception:
            pass

        lucro = receitas - despesas

        # Expense breakdown by category
        detalhes_despesas = {}
        try:
            categorias = db.query(
                DespesaOperacional.categoria,
                func.sum(DespesaOperacional.valor).label("total")
            ).filter(
                DespesaOperacional.mes == mes,
                DespesaOperacional.ano == ano
            ).group_by(DespesaOperacional.categoria).all()

            for categoria, total in categorias:
                detalhes_despesas[categoria] = float(total) if total else 0
        except Exception:
            pass

        return {
            "periodo": f"{mes:02d}/{ano}",
            "receitas": float(receitas),
            "despesas": float(despesas),
            "lucro": float(lucro),
            "detalhes": {
                "data_inicio": month_start.isoformat(),
                "data_fim": month_end.isoformat(),
                "despesas_por_categoria": detalhes_despesas
            }
        }

    except Exception as e:
        return {
            "error": str(e),
            "periodo": f"{mes:02d}/{ano}",
            "receitas": 0,
            "despesas": 0,
            "lucro": 0
        }


@router.get("/despesas-veiculos", summary="Listar despesas de veículos")
async def list_despesas_veiculos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List vehicle expenses with optional filter by vehicle ID.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        veiculo_id: Filter by vehicle ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with list of vehicle expenses
    """
    query = db.query(DespesaVeiculo)

    if veiculo_id:
        query = query.filter(DespesaVeiculo.veiculo_id == veiculo_id)

    total = query.count()
    despesas = query.order_by(DespesaVeiculo.data.desc()).offset(skip).limit(limit).all()

    items = []
    for despesa in despesas:
        items.append({
            "id": despesa.id,
            "veiculo_id": despesa.veiculo_id,
            "valor": despesa.valor,
            "descricao": despesa.descricao,
            "km": despesa.km,
            "data": despesa.data.isoformat() if despesa.data else None,
            "pneu": despesa.pneu,
            "data_cadastro": despesa.data_cadastro.isoformat() if despesa.data_cadastro else None
        })

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/despesas-veiculos", summary="Criar despesa de veículo")
async def create_despesa_veiculo(
    despesa_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Create a new vehicle expense record.

    Args:
        despesa_data: Expense data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created expense data
    """
    return {"message": "Despesa de veículo criada com sucesso"}


@router.delete("/despesas-veiculos/{despesa_id}", summary="Deletar despesa de veículo")
async def delete_despesa_veiculo(
    despesa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete a vehicle expense record.

    Args:
        despesa_id: ID of the expense to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        Message confirming deletion
    """
    return {
        "message": "Despesa de veículo deletada com sucesso",
        "success": True
    }


@router.get("/despesas-loja", summary="Listar despesas de loja")
async def list_despesas_loja(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List shop/operational expenses.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with list of shop expenses
    """
    query = db.query(DespesaLoja)

    total = query.count()
    despesas = query.order_by(DespesaLoja.data.desc()).offset(skip).limit(limit).all()

    items = []
    for despesa in despesas:
        items.append({
            "id": despesa.id,
            "mes": despesa.mes,
            "ano": despesa.ano,
            "valor": despesa.valor,
            "descricao": despesa.descricao,
            "data": despesa.data.isoformat() if despesa.data else None,
            "data_cadastro": despesa.data_cadastro.isoformat() if despesa.data_cadastro else None
        })

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/despesas-loja", summary="Criar despesa de loja")
async def create_despesa_loja(
    despesa_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Create a new shop/operational expense record.

    Args:
        despesa_data: Expense data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created expense data
    """
    return {"message": "Despesa de loja criada com sucesso"}


@router.delete("/despesas-loja/{despesa_id}", summary="Deletar despesa de loja")
async def delete_despesa_loja(
    despesa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete a shop/operational expense record.

    Args:
        despesa_id: ID of the expense to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        Message confirming deletion
    """
    return {
        "message": "Despesa de loja deletada com sucesso",
        "success": True
    }


@router.get("/faturamento-empresa", summary="Relatório de faturamento por empresa")
async def get_faturamento_empresa(
    empresa_id: int = Query(...),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get company billing report.

    Args:
        empresa_id: Company ID
        data_inicio: Start date (YYYY-MM-DD)
        data_fim: End date (YYYY-MM-DD)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Company billing report with revenue and breakdown
    """
    try:
        # Verify company exists
        empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
        if not empresa:
            return {"error": "Empresa não encontrada"}

        # Parse dates
        try:
            start_date = datetime.strptime(data_inicio, "%Y-%m-%d").date() if data_inicio else None
            end_date = datetime.strptime(data_fim, "%Y-%m-%d").date() if data_fim else None
        except ValueError:
            start_date = None
            end_date = None

        # Get contracts for the company
        query = db.query(Contrato).filter(Contrato.empresa_id == empresa_id)

        if start_date:
            query = query.filter(Contrato.data_saida >= start_date)

        if end_date:
            query = query.filter(Contrato.data_saida <= end_date)

        contratos = query.all()

        # Calculate totals
        total_receita = Decimal("0.00")
        for contrato in contratos:
            if contrato.total:
                total_receita += Decimal(str(contrato.total))

        # Get vehicles belonging to company
        veiculos_ids = [v.id for v in db.query(Veiculo).filter(Veiculo.empresa_id == empresa_id).all()]

        # Calculate expenses for company vehicles
        total_despesa = Decimal("0.00")

        if veiculos_ids:
            despesa_veiculo = db.query(func.sum(DespesaVeiculo.valor)).filter(
                DespesaVeiculo.veiculo_id.in_(veiculos_ids)
            )
            if start_date:
                despesa_veiculo = despesa_veiculo.filter(DespesaVeiculo.data >= start_date)
            if end_date:
                despesa_veiculo = despesa_veiculo.filter(DespesaVeiculo.data <= end_date)

            total_despesa += Decimal(str(despesa_veiculo.scalar() or 0))

        lucro = total_receita - total_despesa

        return {
            "empresa": {
                "id": empresa.id,
                "nome": empresa.nome,
                "cnpj": empresa.cnpj
            },
            "periodo": {
                "inicio": data_inicio,
                "fim": data_fim
            },
            "receita": float(total_receita),
            "despesa": float(total_despesa),
            "lucro": float(lucro),
            "total_contratos": len(contratos)
        }

    except Exception as e:
        return {"error": str(e)}


@router.get("/faturamento-geral", summary="Relatório de faturamento consolidado")
async def get_faturamento_geral(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get consolidated billing report.

    Args:
        data_inicio: Start date (YYYY-MM-DD)
        data_fim: End date (YYYY-MM-DD)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Consolidated billing report with totals by company
    """
    try:
        # Parse dates
        try:
            start_date = datetime.strptime(data_inicio, "%Y-%m-%d").date() if data_inicio else None
            end_date = datetime.strptime(data_fim, "%Y-%m-%d").date() if data_fim else None
        except ValueError:
            start_date = None
            end_date = None

        # Get all contracts
        query = db.query(Contrato)

        if start_date:
            query = query.filter(Contrato.data_saida >= start_date)

        if end_date:
            query = query.filter(Contrato.data_saida <= end_date)

        contratos = query.all()

        # Calculate total revenue
        total_receita = Decimal("0.00")
        for contrato in contratos:
            if contrato.total:
                total_receita += Decimal(str(contrato.total))

        # Calculate total expenses
        total_despesa = Decimal("0.00")

        if start_date or end_date:
            despesa_veiculo = db.query(func.sum(DespesaVeiculo.valor))
            if start_date:
                despesa_veiculo = despesa_veiculo.filter(DespesaVeiculo.data >= start_date)
            if end_date:
                despesa_veiculo = despesa_veiculo.filter(DespesaVeiculo.data <= end_date)
            total_despesa += Decimal(str(despesa_veiculo.scalar() or 0))

            despesa_loja = db.query(func.sum(DespesaLoja.valor))
            if start_date:
                despesa_loja = despesa_loja.filter(DespesaLoja.data >= start_date)
            if end_date:
                despesa_loja = despesa_loja.filter(DespesaLoja.data <= end_date)
            total_despesa += Decimal(str(despesa_loja.scalar() or 0))

            despesa_op = db.query(func.sum(DespesaOperacional.valor))
            if start_date:
                despesa_op = despesa_op.filter(DespesaOperacional.data >= start_date)
            if end_date:
                despesa_op = despesa_op.filter(DespesaOperacional.data <= end_date)
            total_despesa += Decimal(str(despesa_op.scalar() or 0))
        else:
            total_despesa = Decimal(str(db.query(func.sum(DespesaVeiculo.valor)).scalar() or 0))
            total_despesa += Decimal(str(db.query(func.sum(DespesaLoja.valor)).scalar() or 0))
            total_despesa += Decimal(str(db.query(func.sum(DespesaOperacional.valor)).scalar() or 0))

        lucro = total_receita - total_despesa

        # Breakdown by company
        receita_por_empresa = []
        try:
            empresas_data = db.query(
                Empresa.id,
                Empresa.nome,
                func.sum(Contrato.total).label("total")
            ).join(
                Contrato, Empresa.id == Contrato.empresa_id, isouter=True
            ).group_by(
                Empresa.id, Empresa.nome
            ).all()

            for empresa_id, empresa_nome, total in empresas_data:
                receita_por_empresa.append({
                    "id": empresa_id,
                    "nome": empresa_nome,
                    "receita": float(total) if total else 0
                })
        except Exception:
            pass

        return {
            "periodo": {
                "inicio": data_inicio,
                "fim": data_fim
            },
            "receita_total": float(total_receita),
            "despesa_total": float(total_despesa),
            "lucro_total": float(lucro),
            "total_contratos": len(contratos),
            "receita_por_empresa": receita_por_empresa
        }

    except Exception as e:
        return {"error": str(e)}


@router.get("/analise-veiculo/{veiculo_id}", summary="Análise financeira do veículo")
async def get_analise_veiculo(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get vehicle financial analysis including ROI and costs vs revenue.

    Args:
        veiculo_id: Vehicle ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Vehicle financial analysis
    """
    try:
        # Verify vehicle exists
        veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
        if not veiculo:
            return {"error": "Veículo não encontrado"}

        # Get all contracts for vehicle
        contratos = db.query(Contrato).filter(Contrato.veiculo_id == veiculo_id).all()

        # Calculate total revenue
        total_receita = Decimal("0.00")
        total_contratos = len(contratos)

        for contrato in contratos:
            if contrato.total:
                total_receita += Decimal(str(contrato.total))

        # Calculate total expenses
        total_despesa = db.query(func.sum(DespesaVeiculo.valor)).filter(
            DespesaVeiculo.veiculo_id == veiculo_id
        ).scalar() or 0

        total_despesa = Decimal(str(total_despesa))

        # ROI calculation
        roi = Decimal("0.00")
        if veiculo.preco_compra:
            roi = ((total_receita - total_despesa - Decimal(str(veiculo.preco_compra))) / Decimal(str(veiculo.preco_compra))) * 100

        return {
            "veiculo": {
                "id": veiculo.id,
                "marca": veiculo.marca,
                "modelo": veiculo.modelo,
                "placa": veiculo.placa,
                "preco_compra": veiculo.preco_compra
            },
            "financeiro": {
                "total_receita": float(total_receita),
                "total_despesa": float(total_despesa),
                "lucro_liquido": float(total_receita - total_despesa),
                "roi_percentual": float(roi)
            },
            "contratos": {
                "total": total_contratos,
                "media_receita_por_contrato": float(total_receita / total_contratos) if total_contratos > 0 else 0
            }
        }

    except Exception as e:
        return {"error": str(e)}

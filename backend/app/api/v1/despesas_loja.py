"""
DespesaLoja endpoints for MPCARS.
"""
from typing import Dict, Any, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import DespesaLoja, DespesaOperacional

router = APIRouter()


@router.get("/", summary="Listar despesas de loja")
async def list_despesas_loja(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List shop/operational expenses with optional filters.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        mes: Filter by month (1-12)
        ano: Filter by year
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with items and total count
    """
    query = db.query(DespesaLoja)

    if mes is not None:
        query = query.filter(DespesaLoja.mes == mes)

    if ano is not None:
        query = query.filter(DespesaLoja.ano == ano)

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


@router.post("/", summary="Criar despesa de loja")
async def create_despesa_loja(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new shop/operational expense record.

    Args:
        data: Expense data with required fields:
            - mes: Month (1-12)
            - ano: Year
            - valor: Expense value
            - descricao: Description
            - data: Expense date (YYYY-MM-DD)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created expense record data
    """
    required_fields = ["mes", "ano", "valor", "descricao", "data"]
    for field in required_fields:
        if field not in data:
            return {"error": f"Campo requerido: {field}"}

    # Validate month
    if not (1 <= data["mes"] <= 12):
        return {"error": "Mês deve estar entre 1 e 12"}

    try:
        # Parse date
        try:
            expense_date = datetime.strptime(data["data"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            expense_date = date.today()

        # Create shop expense
        despesa = DespesaLoja(
            mes=data["mes"],
            ano=data["ano"],
            valor=data["valor"],
            descricao=data["descricao"],
            data=expense_date
        )

        db.add(despesa)
        db.flush()

        # Also create a sync record in operational expenses
        despesa_op = DespesaOperacional(
            tipo="Despesa de Loja",
            origem_tabela="despesas_loja",
            origem_id=despesa.id,
            descricao=data["descricao"],
            valor=data["valor"],
            data=expense_date,
            categoria="Loja",
            mes=data["mes"],
            ano=data["ano"]
        )

        db.add(despesa_op)
        db.commit()
        db.refresh(despesa)

        return {
            "id": despesa.id,
            "mes": despesa.mes,
            "ano": despesa.ano,
            "valor": despesa.valor,
            "descricao": despesa.descricao,
            "data": despesa.data.isoformat() if despesa.data else None,
            "data_cadastro": despesa.data_cadastro.isoformat() if despesa.data_cadastro else None
        }

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao criar despesa: {str(e)}"}


@router.put("/{id}", summary="Atualizar despesa de loja")
async def update_despesa_loja(
    id: int,
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update a shop expense record.

    Args:
        id: Expense record ID
        data: Fields to update (mes, ano, valor, descricao, data)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated expense record data
    """
    despesa = db.query(DespesaLoja).filter(DespesaLoja.id == id).first()
    if not despesa:
        return {"error": "Despesa não encontrada"}

    try:
        updateable_fields = ["mes", "ano", "valor", "descricao", "data"]

        for field in updateable_fields:
            if field in data:
                if field == "data":
                    try:
                        setattr(despesa, field, datetime.strptime(data[field], "%Y-%m-%d").date())
                    except (ValueError, TypeError):
                        pass
                else:
                    setattr(despesa, field, data[field])

        db.commit()
        db.refresh(despesa)

        return {
            "id": despesa.id,
            "mes": despesa.mes,
            "ano": despesa.ano,
            "valor": despesa.valor,
            "descricao": despesa.descricao,
            "data": despesa.data.isoformat() if despesa.data else None,
            "data_cadastro": despesa.data_cadastro.isoformat() if despesa.data_cadastro else None
        }

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao atualizar despesa: {str(e)}"}


@router.delete("/{id}", summary="Deletar despesa de loja")
async def delete_despesa_loja(
    id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete a shop expense record.

    Args:
        id: Expense record ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Message confirming deletion
    """
    despesa = db.query(DespesaLoja).filter(DespesaLoja.id == id).first()
    if not despesa:
        return {"error": "Despesa não encontrada"}

    try:
        # Delete associated operational expense
        db.query(DespesaOperacional).filter(
            DespesaOperacional.origem_tabela == "despesas_loja",
            DespesaOperacional.origem_id == id
        ).delete()

        db.delete(despesa)
        db.commit()
        return {"message": "Despesa de loja deletada com sucesso", "success": True}

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao deletar despesa: {str(e)}"}

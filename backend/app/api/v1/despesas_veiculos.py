"""
DespesaVeiculo endpoints for MPCARS.
"""
from typing import Dict, Any, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import DespesaVeiculo, DespesaOperacional, Veiculo

router = APIRouter()


@router.get("/", summary="Listar despesas de veículos")
async def list_despesas_veiculos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    periodo_inicio: Optional[str] = Query(None),
    periodo_fim: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List vehicle expenses with optional filters.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        veiculo_id: Filter by vehicle ID
        periodo_inicio: Filter by start date (YYYY-MM-DD)
        periodo_fim: Filter by end date (YYYY-MM-DD)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with items and total count
    """
    query = db.query(DespesaVeiculo)

    if veiculo_id:
        query = query.filter(DespesaVeiculo.veiculo_id == veiculo_id)

    if periodo_inicio:
        try:
            start_date = datetime.strptime(periodo_inicio, "%Y-%m-%d").date()
            query = query.filter(DespesaVeiculo.data >= start_date)
        except ValueError:
            pass

    if periodo_fim:
        try:
            end_date = datetime.strptime(periodo_fim, "%Y-%m-%d").date()
            query = query.filter(DespesaVeiculo.data <= end_date)
        except ValueError:
            pass

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


@router.post("/", summary="Criar despesa de veículo")
async def create_despesa_veiculo(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new vehicle expense record and sync to operational expenses.

    Args:
        data: Expense data with required fields:
            - veiculo_id: Vehicle ID
            - valor: Expense value
            - descricao: Description
            - data: Expense date (YYYY-MM-DD)
            - km: Odometer reading (optional)
            - pneu: Is it a tire expense? (optional boolean)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created expense record data
    """
    required_fields = ["veiculo_id", "valor", "descricao", "data"]
    for field in required_fields:
        if field not in data:
            return {"error": f"Campo requerido: {field}"}

    # Verify vehicle exists
    veiculo = db.query(Veiculo).filter(Veiculo.id == data["veiculo_id"]).first()
    if not veiculo:
        return {"error": "Veículo não encontrado"}

    try:
        # Parse date
        try:
            expense_date = datetime.strptime(data["data"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            expense_date = date.today()

        # Create vehicle expense
        despesa = DespesaVeiculo(
            veiculo_id=data["veiculo_id"],
            valor=data["valor"],
            descricao=data["descricao"],
            km=data.get("km"),
            data=expense_date,
            pneu=data.get("pneu", False)
        )

        db.add(despesa)
        db.flush()

        # Also create a sync record in operational expenses
        despesa_op = DespesaOperacional(
            tipo="Despesa de Veículo",
            origem_tabela="despesas_veiculo",
            origem_id=despesa.id,
            veiculo_id=data["veiculo_id"],
            descricao=data["descricao"],
            valor=data["valor"],
            data=expense_date,
            categoria="Veículo",
            mes=expense_date.month,
            ano=expense_date.year
        )

        db.add(despesa_op)
        db.commit()
        db.refresh(despesa)

        return {
            "id": despesa.id,
            "veiculo_id": despesa.veiculo_id,
            "valor": despesa.valor,
            "descricao": despesa.descricao,
            "km": despesa.km,
            "data": despesa.data.isoformat() if despesa.data else None,
            "pneu": despesa.pneu,
            "data_cadastro": despesa.data_cadastro.isoformat() if despesa.data_cadastro else None
        }

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao criar despesa: {str(e)}"}


@router.put("/{id}", summary="Atualizar despesa de veículo")
async def update_despesa_veiculo(
    id: int,
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update a vehicle expense record.

    Args:
        id: Expense record ID
        data: Fields to update (valor, descricao, data, km, pneu)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated expense record data
    """
    despesa = db.query(DespesaVeiculo).filter(DespesaVeiculo.id == id).first()
    if not despesa:
        return {"error": "Despesa não encontrada"}

    try:
        updateable_fields = ["valor", "descricao", "km", "pneu", "data"]

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
            "veiculo_id": despesa.veiculo_id,
            "valor": despesa.valor,
            "descricao": despesa.descricao,
            "km": despesa.km,
            "data": despesa.data.isoformat() if despesa.data else None,
            "pneu": despesa.pneu,
            "data_cadastro": despesa.data_cadastro.isoformat() if despesa.data_cadastro else None
        }

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao atualizar despesa: {str(e)}"}


@router.delete("/{id}", summary="Deletar despesa de veículo")
async def delete_despesa_veiculo(
    id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete a vehicle expense record.

    Args:
        id: Expense record ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Message confirming deletion
    """
    despesa = db.query(DespesaVeiculo).filter(DespesaVeiculo.id == id).first()
    if not despesa:
        return {"error": "Despesa não encontrada"}

    try:
        # Delete associated operational expense
        db.query(DespesaOperacional).filter(
            DespesaOperacional.origem_tabela == "despesas_veiculo",
            DespesaOperacional.origem_id == id
        ).delete()

        db.delete(despesa)
        db.commit()
        return {"message": "Despesa de veículo deletada com sucesso", "success": True}

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao deletar despesa: {str(e)}"}

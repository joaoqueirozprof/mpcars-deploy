"""
UsoVeiculoEmpresa endpoints for MPCARS.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import UsoVeiculoEmpresa, Veiculo, Empresa

router = APIRouter()


@router.get("/", summary="Listar usos de veículos por empresa")
async def list_uso_veiculo_empresa(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    empresa_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List vehicle usage records by company with optional filters.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        veiculo_id: Filter by vehicle ID
        empresa_id: Filter by company ID
        status: Filter by status (e.g., 'Em uso', 'Finalizado')
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with items and total count
    """
    query = db.query(UsoVeiculoEmpresa)

    if veiculo_id:
        query = query.filter(UsoVeiculoEmpresa.veiculo_id == veiculo_id)

    if empresa_id:
        query = query.filter(UsoVeiculoEmpresa.empresa_id == empresa_id)

    if status:
        query = query.filter(UsoVeiculoEmpresa.status == status)

    total = query.count()
    usos = query.offset(skip).limit(limit).all()

    items = []
    for uso in usos:
        items.append(uso._to_dict())

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/", summary="Criar novo uso de veículo por empresa")
async def create_uso_veiculo_empresa(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new vehicle usage record for a company.

    Args:
        data: Usage data with required fields:
            - veiculo_id: Vehicle ID
            - empresa_id: Company ID
            - km_inicial: Initial mileage
            - km_final: Final mileage (optional, set on update)
            - data_inicio: Start date
            - data_fim: End date
            - km_referencia: Reference km (optional)
            - valor_km_extra: Extra km rate (optional)
            - valor_locacao: Rental value (optional)
            - contrato_id: Contract ID (optional)
            - observacoes: Observations (optional)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created usage record data
    """
    # Validate required fields
    required_fields = ["veiculo_id", "empresa_id", "km_inicial", "data_inicio", "data_fim"]
    for field in required_fields:
        if field not in data:
            return {"error": f"Campo requerido: {field}"}

    # Verify vehicle and company exist
    veiculo = db.query(Veiculo).filter(Veiculo.id == data["veiculo_id"]).first()
    if not veiculo:
        return {"error": "Veículo não encontrado"}

    empresa = db.query(Empresa).filter(Empresa.id == data["empresa_id"]).first()
    if not empresa:
        return {"error": "Empresa não encontrada"}

    try:
        # Create usage record
        novo_uso = UsoVeiculoEmpresa(
            veiculo_id=data["veiculo_id"],
            empresa_id=data["empresa_id"],
            contrato_id=data.get("contrato_id"),
            km_inicial=data["km_inicial"],
            km_final=data.get("km_final", data["km_inicial"]),  # Default to initial km
            data_inicio=data["data_inicio"],
            data_fim=data["data_fim"],
            km_referencia=data.get("km_referencia", 0),
            valor_km_extra=data.get("valor_km_extra", 1.0),
            valor_locacao=data.get("valor_locacao", 0),
            status=data.get("status", "Em uso"),
            observacoes=data.get("observacoes")
        )

        db.add(novo_uso)
        db.commit()
        db.refresh(novo_uso)

        return novo_uso._to_dict()

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao criar uso: {str(e)}"}


@router.put("/{id}", summary="Atualizar uso de veículo por empresa")
async def update_uso_veiculo_empresa(
    id: int,
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update a vehicle usage record.

    Args:
        id: Usage record ID
        data: Fields to update (km_final, data_fim, status, etc.)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated usage record data
    """
    uso = db.query(UsoVeiculoEmpresa).filter(UsoVeiculoEmpresa.id == id).first()
    if not uso:
        return {"error": "Uso de veículo não encontrado"}

    try:
        # Update allowed fields
        updateable_fields = [
            "km_final", "data_fim", "status", "observacoes",
            "km_referencia", "valor_km_extra", "valor_locacao"
        ]

        for field in updateable_fields:
            if field in data:
                setattr(uso, field, data[field])

        db.commit()
        db.refresh(uso)

        return uso._to_dict()

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao atualizar uso: {str(e)}"}


@router.delete("/{id}", summary="Deletar uso de veículo por empresa")
async def delete_uso_veiculo_empresa(
    id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete a vehicle usage record.

    Args:
        id: Usage record ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Message confirming deletion
    """
    uso = db.query(UsoVeiculoEmpresa).filter(UsoVeiculoEmpresa.id == id).first()
    if not uso:
        return {"error": "Uso de veículo não encontrado"}

    try:
        db.delete(uso)
        db.commit()
        return {"message": "Uso de veículo deletado com sucesso", "success": True}

    except Exception as e:
        db.rollback()
        return {"error": f"Erro ao deletar uso: {str(e)}"}

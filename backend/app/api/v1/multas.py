from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Multa, Veiculo
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


class MultaCreate(BaseModel):
    """Schema for creating a new multa."""
    veiculo_id: int
    contrato_id: Optional[int] = None
    cliente_id: Optional[int] = None
    data_infracao: date
    data_notificacao: Optional[date] = None
    auto_infracao: Optional[str] = None
    descricao: str
    valor: float
    pontos: int = 0
    gravidade: str = "Média"
    status: str = "Pendente"
    responsavel: Optional[str] = None
    data_pagamento: Optional[date] = None
    observacoes: Optional[str] = None


class MultaUpdate(BaseModel):
    """Schema for updating an existing multa."""
    data_infracao: Optional[date] = None
    data_notificacao: Optional[date] = None
    auto_infracao: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[float] = None
    pontos: Optional[int] = None
    gravidade: Optional[str] = None
    status: Optional[str] = None
    responsavel: Optional[str] = None
    data_pagamento: Optional[date] = None
    observacoes: Optional[str] = None

    class Config:
        from_attributes = True


class MultaResponse(BaseModel):
    """Schema for multa response."""
    id: int
    veiculo_id: int
    contrato_id: Optional[int]
    cliente_id: Optional[int]
    data_infracao: date
    data_notificacao: Optional[date]
    auto_infracao: Optional[str]
    descricao: str
    valor: float
    pontos: int
    gravidade: str
    status: str
    responsavel: Optional[str]
    data_pagamento: Optional[date]
    observacoes: Optional[str]
    data_cadastro: Optional[str] = None

    class Config:
        from_attributes = True


@router.get(
    "/",
    response_model=PaginatedResponse[MultaResponse],
    summary="Listar multas"
)
async def list_multas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> PaginatedResponse[MultaResponse]:
    """
    List all multas with optional filters by vehicle and status.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        veiculo_id: Filter by vehicle ID
        status_filter: Filter by status (e.g., 'Pendente', 'Paga')
        db: Database session
        current_user: Current authenticated user

    Returns:
        PaginatedResponse with list of multas
    """
    query = db.query(Multa)

    if veiculo_id:
        query = query.filter(Multa.veiculo_id == veiculo_id)

    if status_filter:
        query = query.filter(Multa.status == status_filter)

    total = query.count()
    multas = query.offset(skip).limit(limit).all()

    return PaginatedResponse(
        items=multas,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get("/{multa_id}", response_model=MultaResponse, summary="Obter multa por ID")
async def get_multa(
    multa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MultaResponse:
    """
    Get a specific multa by ID.

    Args:
        multa_id: ID of the multa to retrieve
        db: Database session
        current_user: Current authenticated user

    Returns:
        MultaResponse with multa data

    Raises:
        HTTPException: If multa not found
    """
    multa = db.query(Multa).filter(Multa.id == multa_id).first()

    if not multa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multa não encontrada"
        )

    return multa


@router.post("/", response_model=MultaResponse, summary="Criar nova multa")
async def create_multa(
    multa_data: MultaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MultaResponse:
    """
    Create a new multa.

    Args:
        multa_data: Data for the new multa
        db: Database session
        current_user: Current authenticated user

    Returns:
        MultaResponse with created multa data

    Raises:
        HTTPException: If veiculo not found
    """
    # Check if veiculo exists
    veiculo = db.query(Veiculo).filter(Veiculo.id == multa_data.veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    nova_multa = Multa(**multa_data.model_dump())
    db.add(nova_multa)
    db.commit()
    db.refresh(nova_multa)

    return nova_multa


@router.put("/{multa_id}", response_model=MultaResponse, summary="Atualizar multa")
async def update_multa(
    multa_id: int,
    multa_data: MultaUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MultaResponse:
    """
    Update an existing multa.

    Args:
        multa_id: ID of the multa to update
        multa_data: Data to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        MultaResponse with updated multa data

    Raises:
        HTTPException: If multa not found
    """
    multa = db.query(Multa).filter(Multa.id == multa_id).first()

    if not multa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multa não encontrada"
        )

    update_data = multa_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(multa, field, value)

    db.commit()
    db.refresh(multa)

    return multa


@router.delete(
    "/{multa_id}",
    response_model=MessageResponse,
    summary="Deletar multa"
)
async def delete_multa(
    multa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete a multa.

    Args:
        multa_id: ID of the multa to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse confirming deletion

    Raises:
        HTTPException: If multa not found
    """
    multa = db.query(Multa).filter(Multa.id == multa_id).first()

    if not multa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multa não encontrada"
        )

    db.delete(multa)
    db.commit()

    return MessageResponse(
        message="Multa deletada com sucesso",
        success=True
    )

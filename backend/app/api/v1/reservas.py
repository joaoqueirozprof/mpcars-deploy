from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Reserva, Cliente, Veiculo
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


class ReservaCreate(BaseModel):
    """Schema for creating a new reserva."""
    cliente_id: int
    veiculo_id: int
    data_inicio: date
    data_fim: date
    status: str = "Pendente"
    valor_estimado: float = 0
    observacoes: Optional[str] = None


class ReservaUpdate(BaseModel):
    """Schema for updating an existing reserva."""
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    status: Optional[str] = None
    valor_estimado: Optional[float] = None
    observacoes: Optional[str] = None

    class Config:
        from_attributes = True


class ReservaResponse(BaseModel):
    """Schema for reserva response."""
    id: int
    cliente_id: int
    veiculo_id: int
    data_inicio: date
    data_fim: date
    status: str
    valor_estimado: float
    observacoes: Optional[str]
    data_criacao: Optional[str] = None

    class Config:
        from_attributes = True


@router.get(
    "/",
    response_model=PaginatedResponse[ReservaResponse],
    summary="Listar reservas"
)
async def list_reservas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    cliente_id: Optional[int] = Query(None),
    veiculo_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> PaginatedResponse[ReservaResponse]:
    """
    List all reservas with optional filters by client, vehicle, and status.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        cliente_id: Filter by client ID
        veiculo_id: Filter by vehicle ID
        status_filter: Filter by status (e.g., 'Pendente', 'Confirmada', 'Cancelada', 'Concluída')
        db: Database session
        current_user: Current authenticated user

    Returns:
        PaginatedResponse with list of reservas
    """
    query = db.query(Reserva)

    if cliente_id:
        query = query.filter(Reserva.cliente_id == cliente_id)

    if veiculo_id:
        query = query.filter(Reserva.veiculo_id == veiculo_id)

    if status_filter:
        query = query.filter(Reserva.status == status_filter)

    total = query.count()
    reservas = query.offset(skip).limit(limit).all()

    return PaginatedResponse(
        items=reservas,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get("/{reserva_id}", response_model=ReservaResponse, summary="Obter reserva por ID")
async def get_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ReservaResponse:
    """
    Get a specific reserva by ID.

    Args:
        reserva_id: ID of the reserva to retrieve
        db: Database session
        current_user: Current authenticated user

    Returns:
        ReservaResponse with reserva data

    Raises:
        HTTPException: If reserva not found
    """
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()

    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva não encontrada"
        )

    return reserva


@router.post("/", response_model=ReservaResponse, summary="Criar nova reserva")
async def create_reserva(
    reserva_data: ReservaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ReservaResponse:
    """
    Create a new reserva.

    Args:
        reserva_data: Data for the new reserva
        db: Database session
        current_user: Current authenticated user

    Returns:
        ReservaResponse with created reserva data

    Raises:
        HTTPException: If cliente or veiculo not found
    """
    # Check if cliente exists
    cliente = db.query(Cliente).filter(Cliente.id == reserva_data.cliente_id).first()

    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )

    # Check if veiculo exists
    veiculo = db.query(Veiculo).filter(Veiculo.id == reserva_data.veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    nova_reserva = Reserva(**reserva_data.model_dump())
    db.add(nova_reserva)
    db.commit()
    db.refresh(nova_reserva)

    return nova_reserva


@router.put("/{reserva_id}", response_model=ReservaResponse, summary="Atualizar reserva")
async def update_reserva(
    reserva_id: int,
    reserva_data: ReservaUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ReservaResponse:
    """
    Update an existing reserva.

    Args:
        reserva_id: ID of the reserva to update
        reserva_data: Data to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        ReservaResponse with updated reserva data

    Raises:
        HTTPException: If reserva not found
    """
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()

    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva não encontrada"
        )

    update_data = reserva_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reserva, field, value)

    db.commit()
    db.refresh(reserva)

    return reserva


@router.delete(
    "/{reserva_id}",
    response_model=MessageResponse,
    summary="Deletar reserva"
)
async def delete_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete a reserva.

    Args:
        reserva_id: ID of the reserva to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse confirming deletion

    Raises:
        HTTPException: If reserva not found
    """
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()

    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva não encontrada"
        )

    db.delete(reserva)
    db.commit()

    return MessageResponse(
        message="Reserva deletada com sucesso",
        success=True
    )

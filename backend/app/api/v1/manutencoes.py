from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Manutencao, Veiculo
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


class ManutencaoCreate(BaseModel):
    """Schema for creating a new manutencao."""
    veiculo_id: int
    tipo: str = "Preventiva"
    descricao: str
    km_realizada: Optional[float] = None
    km_proxima: Optional[float] = None
    data_realizada: Optional[date] = None
    data_proxima: Optional[date] = None
    custo: float = 0
    oficina: Optional[str] = None
    status: str = "Agendada"
    observacoes: Optional[str] = None


class ManutencaoUpdate(BaseModel):
    """Schema for updating an existing manutencao."""
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    km_realizada: Optional[float] = None
    km_proxima: Optional[float] = None
    data_realizada: Optional[date] = None
    data_proxima: Optional[date] = None
    custo: Optional[float] = None
    oficina: Optional[str] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None

    class Config:
        from_attributes = True


class ManutencaoResponse(BaseModel):
    """Schema for manutencao response."""
    id: int
    veiculo_id: int
    tipo: str
    descricao: str
    km_realizada: Optional[float]
    km_proxima: Optional[float]
    data_realizada: Optional[date]
    data_proxima: Optional[date]
    custo: float
    oficina: Optional[str]
    status: str
    observacoes: Optional[str]
    data_cadastro: Optional[str] = None

    class Config:
        from_attributes = True


@router.get(
    "/",
    response_model=PaginatedResponse[ManutencaoResponse],
    summary="Listar manutenções"
)
async def list_manutencoes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> PaginatedResponse[ManutencaoResponse]:
    """
    List all manutenções with optional filters by vehicle, status, and type.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        veiculo_id: Filter by vehicle ID
        status_filter: Filter by status (e.g., 'Agendada', 'Em andamento', 'Concluída')
        tipo: Filter by type (e.g., 'Preventiva', 'Corretiva', 'Revisão')
        db: Database session
        current_user: Current authenticated user

    Returns:
        PaginatedResponse with list of manutenções
    """
    query = db.query(Manutencao)

    if veiculo_id:
        query = query.filter(Manutencao.veiculo_id == veiculo_id)

    if status_filter:
        query = query.filter(Manutencao.status == status_filter)

    if tipo:
        query = query.filter(Manutencao.tipo == tipo)

    total = query.count()
    manutencoes = query.offset(skip).limit(limit).all()

    return PaginatedResponse(
        items=manutencoes,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get("/{manutencao_id}", response_model=ManutencaoResponse, summary="Obter manutenção por ID")
async def get_manutencao(
    manutencao_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ManutencaoResponse:
    """
    Get a specific manutencao by ID.

    Args:
        manutencao_id: ID of the manutencao to retrieve
        db: Database session
        current_user: Current authenticated user

    Returns:
        ManutencaoResponse with manutencao data

    Raises:
        HTTPException: If manutencao not found
    """
    manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()

    if not manutencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manutenção não encontrada"
        )

    return manutencao


@router.post("/", response_model=ManutencaoResponse, summary="Criar nova manutenção")
async def create_manutencao(
    manutencao_data: ManutencaoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ManutencaoResponse:
    """
    Create a new manutencao.

    Args:
        manutencao_data: Data for the new manutencao
        db: Database session
        current_user: Current authenticated user

    Returns:
        ManutencaoResponse with created manutencao data

    Raises:
        HTTPException: If veiculo not found
    """
    # Check if veiculo exists
    veiculo = db.query(Veiculo).filter(Veiculo.id == manutencao_data.veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    nova_manutencao = Manutencao(**manutencao_data.model_dump())
    db.add(nova_manutencao)
    db.commit()
    db.refresh(nova_manutencao)

    return nova_manutencao


@router.put("/{manutencao_id}", response_model=ManutencaoResponse, summary="Atualizar manutenção")
async def update_manutencao(
    manutencao_id: int,
    manutencao_data: ManutencaoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ManutencaoResponse:
    """
    Update an existing manutencao.

    Args:
        manutencao_id: ID of the manutencao to update
        manutencao_data: Data to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        ManutencaoResponse with updated manutencao data

    Raises:
        HTTPException: If manutencao not found
    """
    manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()

    if not manutencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manutenção não encontrada"
        )

    update_data = manutencao_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(manutencao, field, value)

    db.commit()
    db.refresh(manutencao)

    return manutencao


@router.delete(
    "/{manutencao_id}",
    response_model=MessageResponse,
    summary="Deletar manutenção"
)
async def delete_manutencao(
    manutencao_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete a manutencao.

    Args:
        manutencao_id: ID of the manutencao to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse confirming deletion

    Raises:
        HTTPException: If manutencao not found
    """
    manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()

    if not manutencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manutenção não encontrada"
        )

    db.delete(manutencao)
    db.commit()

    return MessageResponse(
        message="Manutenção deletada com sucesso",
        success=True
    )

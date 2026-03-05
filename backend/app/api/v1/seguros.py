from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Seguro, Veiculo
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


class SeguroCreate(BaseModel):
    """Schema for creating a new seguro."""
    veiculo_id: int
    seguradora: str
    numero_apolice: str
    tipo_seguro: str = "Completo"
    data_inicio: date
    data_vencimento: date
    valor: float
    valor_franquia: float = 0
    cobertura: Optional[str] = None
    quantidade_parcelas: int = 1
    status: str = "Ativo"
    observacoes: Optional[str] = None


class SeguroUpdate(BaseModel):
    """Schema for updating an existing seguro."""
    seguradora: Optional[str] = None
    numero_apolice: Optional[str] = None
    tipo_seguro: Optional[str] = None
    data_inicio: Optional[date] = None
    data_vencimento: Optional[date] = None
    valor: Optional[float] = None
    valor_franquia: Optional[float] = None
    cobertura: Optional[str] = None
    quantidade_parcelas: Optional[int] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None


class SeguroResponse(BaseModel):
    """Schema for seguro response."""
    id: int
    veiculo_id: int
    seguradora: str
    numero_apolice: str
    tipo_seguro: str
    data_inicio: date
    data_vencimento: date
    valor: float
    valor_franquia: float
    cobertura: Optional[str]
    quantidade_parcelas: int
    status: str
    observacoes: Optional[str]
    data_cadastro: Optional[str] = None

    class Config:
        from_attributes = True


@router.get(
    "/",
    response_model=PaginatedResponse[SeguroResponse],
    summary="Listar seguros"
)
async def list_seguros(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> PaginatedResponse[SeguroResponse]:
    """
    List all seguros with optional filters by vehicle and status.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        veiculo_id: Filter by vehicle ID
        status_filter: Filter by status (e.g., 'Ativo', 'Expirado')
        db: Database session
        current_user: Current authenticated user

    Returns:
        PaginatedResponse with list of seguros
    """
    query = db.query(Seguro)

    if veiculo_id:
        query = query.filter(Seguro.veiculo_id == veiculo_id)

    if status_filter:
        query = query.filter(Seguro.status == status_filter)

    total = query.count()
    seguros = query.offset(skip).limit(limit).all()

    return PaginatedResponse(
        items=seguros,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get("/{seguro_id}", response_model=SeguroResponse, summary="Obter seguro por ID")
async def get_seguro(
    seguro_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> SeguroResponse:
    """
    Get a specific seguro by ID.

    Args:
        seguro_id: ID of the seguro to retrieve
        db: Database session
        current_user: Current authenticated user

    Returns:
        SeguroResponse with seguro data

    Raises:
        HTTPException: If seguro not found
    """
    seguro = db.query(Seguro).filter(Seguro.id == seguro_id).first()

    if not seguro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seguro não encontrado"
        )

    return seguro


@router.post("/", response_model=SeguroResponse, summary="Criar novo seguro")
async def create_seguro(
    seguro_data: SeguroCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> SeguroResponse:
    """
    Create a new seguro.

    Args:
        seguro_data: Data for the new seguro
        db: Database session
        current_user: Current authenticated user

    Returns:
        SeguroResponse with created seguro data

    Raises:
        HTTPException: If veiculo not found or numero_apolice already exists
    """
    # Check if veiculo exists
    veiculo = db.query(Veiculo).filter(Veiculo.id == seguro_data.veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    # Check if numero_apolice already exists
    existing_apolice = db.query(Seguro).filter(
        Seguro.numero_apolice == seguro_data.numero_apolice
    ).first()

    if existing_apolice:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Número de apólice já cadastrado"
        )

    novo_seguro = Seguro(**seguro_data.model_dump())
    db.add(novo_seguro)
    db.commit()
    db.refresh(novo_seguro)

    return novo_seguro


@router.put("/{seguro_id}", response_model=SeguroResponse, summary="Atualizar seguro")
async def update_seguro(
    seguro_id: int,
    seguro_data: SeguroUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> SeguroResponse:
    """
    Update an existing seguro.

    Args:
        seguro_id: ID of the seguro to update
        seguro_data: Data to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        SeguroResponse with updated seguro data

    Raises:
        HTTPException: If seguro not found or numero_apolice already exists
    """
    seguro = db.query(Seguro).filter(Seguro.id == seguro_id).first()

    if not seguro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seguro não encontrado"
        )

    # Check if new numero_apolice already exists
    if seguro_data.numero_apolice and seguro_data.numero_apolice != seguro.numero_apolice:
        existing_apolice = db.query(Seguro).filter(
            Seguro.numero_apolice == seguro_data.numero_apolice
        ).first()
        if existing_apolice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Número de apólice já cadastrado"
            )

    update_data = seguro_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(seguro, field, value)

    db.commit()
    db.refresh(seguro)

    return seguro


@router.delete(
    "/{seguro_id}",
    response_model=MessageResponse,
    summary="Deletar seguro"
)
async def delete_seguro(
    seguro_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete a seguro.

    Args:
        seguro_id: ID of the seguro to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse confirming deletion

    Raises:
        HTTPException: If seguro not found
    """
    seguro = db.query(Seguro).filter(Seguro.id == seguro_id).first()

    if not seguro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seguro não encontrado"
        )

    db.delete(seguro)
    db.commit()

    return MessageResponse(
        message="Seguro deletado com sucesso",
        success=True
    )

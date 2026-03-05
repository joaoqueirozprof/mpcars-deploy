from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Veiculo
from app.schemas.veiculo import VeiculoCreate, VeiculoUpdate, VeiculoStatusUpdate, VeiculoResponse
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[VeiculoResponse],
    summary="Listar veículos"
)
async def list_veiculos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> PaginatedResponse[VeiculoResponse]:
    """
    List all veículos with optional filters by status and empresa.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        status: Filter by status (e.g., 'Disponível', 'Alugado', 'Manutenção')
        empresa_id: Filter by empresa ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        PaginatedResponse with list of veículos
    """
    query = db.query(Veiculo)

    if status:
        query = query.filter(Veiculo.status == status)

    if empresa_id:
        query = query.filter(Veiculo.empresa_id == empresa_id)

    total = query.count()
    veiculos = query.offset(skip).limit(limit).all()

    return PaginatedResponse(
        items=veiculos,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get("/{veiculo_id}", response_model=VeiculoResponse, summary="Obter veículo por ID")
async def get_veiculo(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> VeiculoResponse:
    """
    Get a specific veiculo by ID.

    Args:
        veiculo_id: ID of the veiculo to retrieve
        db: Database session
        current_user: Current authenticated user

    Returns:
        VeiculoResponse with veiculo data

    Raises:
        HTTPException: If veiculo not found
    """
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    return veiculo


@router.post("/", response_model=VeiculoResponse, summary="Criar novo veículo")
async def create_veiculo(
    veiculo_data: VeiculoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> VeiculoResponse:
    """
    Create a new veiculo.

    Args:
        veiculo_data: Data for the new veiculo
        db: Database session
        current_user: Current authenticated user

    Returns:
        VeiculoResponse with created veiculo data

    Raises:
        HTTPException: If placa already exists
    """
    # Check if placa already exists
    existing_placa = db.query(Veiculo).filter(
        Veiculo.placa == veiculo_data.placa
    ).first()

    if existing_placa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Placa já cadastrada"
        )

    novo_veiculo = Veiculo(**veiculo_data.model_dump())
    db.add(novo_veiculo)
    db.commit()
    db.refresh(novo_veiculo)

    return novo_veiculo


@router.put("/{veiculo_id}", response_model=VeiculoResponse, summary="Atualizar veículo")
async def update_veiculo(
    veiculo_id: int,
    veiculo_data: VeiculoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> VeiculoResponse:
    """
    Update an existing veiculo.

    Args:
        veiculo_id: ID of the veiculo to update
        veiculo_data: Data to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        VeiculoResponse with updated veiculo data

    Raises:
        HTTPException: If veiculo not found or placa already exists
    """
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    # Check if new placa already exists
    if veiculo_data.placa and veiculo_data.placa != veiculo.placa:
        existing_placa = db.query(Veiculo).filter(
            Veiculo.placa == veiculo_data.placa
        ).first()
        if existing_placa:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Placa já cadastrada"
            )

    update_data = veiculo_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(veiculo, field, value)

    db.commit()
    db.refresh(veiculo)

    return veiculo


@router.delete(
    "/{veiculo_id}",
    response_model=MessageResponse,
    summary="Deletar veículo"
)
async def delete_veiculo(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete a veiculo.

    Args:
        veiculo_id: ID of the veiculo to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse confirming deletion

    Raises:
        HTTPException: If veiculo not found
    """
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    db.delete(veiculo)
    db.commit()

    return MessageResponse(
        message="Veículo deletado com sucesso",
        success=True
    )


@router.get("/placa/{placa}", response_model=VeiculoResponse, summary="Buscar veículo por placa")
async def search_veiculo_by_placa(
    placa: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> VeiculoResponse:
    """
    Search for a veiculo by its placa (license plate).

    Args:
        placa: License plate to search for
        db: Database session
        current_user: Current authenticated user

    Returns:
        VeiculoResponse with matching veiculo data

    Raises:
        HTTPException: If veiculo not found
    """
    veiculo = db.query(Veiculo).filter(
        Veiculo.placa.ilike(placa)
    ).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    return veiculo


@router.patch(
    "/{veiculo_id}/status",
    response_model=VeiculoResponse,
    summary="Atualizar status do veículo"
)
async def update_veiculo_status(
    veiculo_id: int,
    status_data: VeiculoStatusUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> VeiculoResponse:
    """
    Update only the status of a veiculo.

    Args:
        veiculo_id: ID of the veiculo to update
        status_data: New status value
        db: Database session
        current_user: Current authenticated user

    Returns:
        VeiculoResponse with updated veiculo data

    Raises:
        HTTPException: If veiculo not found
    """
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    veiculo.status = status_data.status
    db.commit()
    db.refresh(veiculo)

    return veiculo

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Empresa
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


@router.get(
    "/",
    summary="Listar empresas"
)
async def list_empresas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    ativa: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> PaginatedResponse:
    """
    List all empresas with optional filter by active status.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        ativa: Filter by active status
        db: Database session
        current_user: Current authenticated user

    Returns:
        PaginatedResponse with list of empresas
    """
    query = db.query(Empresa)

    if ativa is not None:
        query = query.filter(Empresa.ativa == ativa)

    total = query.count()
    empresas = query.offset(skip).limit(limit).all()

    return PaginatedResponse(
        items=empresas,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get("/{empresa_id}", summary="Obter empresa por ID")
async def get_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Get a specific empresa by ID.

    Args:
        empresa_id: ID of the empresa to retrieve
        db: Database session
        current_user: Current authenticated user

    Returns:
        Empresa data

    Raises:
        HTTPException: If empresa not found
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )

    return empresa


@router.post("/", summary="Criar nova empresa")
async def create_empresa(
    empresa_data: dict,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Create a new empresa.

    Args:
        empresa_data: Data for the new empresa
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created empresa data

    Raises:
        HTTPException: If CNPJ already exists
    """
    # Check if CNPJ already exists
    existing_cnpj = db.query(Empresa).filter(
        Empresa.cnpj == empresa_data.get("cnpj")
    ).first()

    if existing_cnpj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CNPJ já cadastrado"
        )

    nova_empresa = Empresa(**empresa_data)
    db.add(nova_empresa)
    db.commit()
    db.refresh(nova_empresa)

    return nova_empresa


@router.put("/{empresa_id}", summary="Atualizar empresa")
async def update_empresa(
    empresa_id: int,
    empresa_data: dict,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Update an existing empresa.

    Args:
        empresa_id: ID of the empresa to update
        empresa_data: Data to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated empresa data

    Raises:
        HTTPException: If empresa not found
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )

    for field, value in empresa_data.items():
        if hasattr(empresa, field):
            setattr(empresa, field, value)

    db.commit()
    db.refresh(empresa)

    return empresa


@router.delete("/{empresa_id}", response_model=MessageResponse, summary="Deletar empresa")
async def delete_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete an empresa.

    Args:
        empresa_id: ID of the empresa to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse confirming deletion

    Raises:
        HTTPException: If empresa not found
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )

    db.delete(empresa)
    db.commit()

    return MessageResponse(
        message="Empresa deletada com sucesso",
        success=True
    )


@router.get("/{empresa_id}/motoristas", summary="Listar motoristas da empresa")
async def list_motoristas(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> List:
    """
    List all drivers (motoristas) for a specific empresa.

    Args:
        empresa_id: ID of the empresa
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of motoristas

    Raises:
        HTTPException: If empresa not found
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )

    # Return empty list for now - motoristas relationship would be defined in models
    return []


@router.post("/{empresa_id}/motoristas", summary="Adicionar motorista à empresa")
async def add_motorista(
    empresa_id: int,
    motorista_data: dict,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Add a new driver to an empresa.

    Args:
        empresa_id: ID of the empresa
        motorista_data: Data for the new motorista
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created motorista data

    Raises:
        HTTPException: If empresa not found
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )

    # Placeholder for motorista creation logic
    return {"message": "Motorista adicionado com sucesso"}

from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Contrato, Veiculo
from app.schemas.contrato import (
    ContratoCreate,
    ContratoUpdate,
    ContratoFinalizarRequest,
    ContratoResponse,
    ContratoDetailedResponse
)
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[ContratoResponse],
    summary="Listar contratos"
)
async def list_contratos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    cliente_id: Optional[int] = Query(None),
    veiculo_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> PaginatedResponse[ContratoResponse]:
    """
    List all contratos with optional filters by status, cliente, and veiculo.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        status_filter: Filter by status (e.g., 'Ativo', 'Finalizado')
        cliente_id: Filter by cliente ID
        veiculo_id: Filter by veiculo ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        PaginatedResponse with list of contratos
    """
    query = db.query(Contrato)

    if status_filter:
        query = query.filter(Contrato.status == status_filter)

    if cliente_id:
        query = query.filter(Contrato.cliente_id == cliente_id)

    if veiculo_id:
        query = query.filter(Contrato.veiculo_id == veiculo_id)

    total = query.count()
    contratos = query.offset(skip).limit(limit).all()

    return PaginatedResponse(
        items=contratos,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get("/{contrato_id}", response_model=ContratoDetailedResponse, summary="Obter contrato por ID")
async def get_contrato(
    contrato_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ContratoDetailedResponse:
    """
    Get a specific contrato by ID with related data.

    Args:
        contrato_id: ID of the contrato to retrieve
        db: Database session
        current_user: Current authenticated user

    Returns:
        ContratoDetailedResponse with contrato and related data

    Raises:
        HTTPException: If contrato not found
    """
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato não encontrado"
        )

    # Get related data
    response_data = ContratoDetailedResponse(
        **{k: v for k, v in contrato.__dict__.items() if not k.startswith('_')},
        cliente_nome=contrato.cliente.nome if contrato.cliente else None,
        veiculo_placa=contrato.veiculo.placa if contrato.veiculo else None,
        veiculo_modelo=contrato.veiculo.modelo if contrato.veiculo else None
    )

    return response_data


@router.post("/", response_model=ContratoResponse, summary="Criar novo contrato")
async def create_contrato(
    contrato_data: ContratoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ContratoResponse:
    """
    Create a new contrato and update vehicle status to 'Alugado'.

    Args:
        contrato_data: Data for the new contrato
        db: Database session
        current_user: Current authenticated user

    Returns:
        ContratoResponse with created contrato data

    Raises:
        HTTPException: If cliente or veiculo not found, or veiculo not available
    """
    # Check if veiculo exists
    veiculo = db.query(Veiculo).filter(Veiculo.id == contrato_data.veiculo_id).first()

    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado"
        )

    if veiculo.status != "Disponível":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Veículo não está disponível. Status atual: {veiculo.status}"
        )

    # Create contrato
    novo_contrato = Contrato(**contrato_data.model_dump())
    db.add(novo_contrato)

    # Update vehicle status to 'Alugado'
    veiculo.status = "Alugado"

    db.commit()
    db.refresh(novo_contrato)

    return novo_contrato


@router.put("/{contrato_id}", response_model=ContratoResponse, summary="Atualizar contrato")
async def update_contrato(
    contrato_id: int,
    contrato_data: ContratoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ContratoResponse:
    """
    Update an existing contrato.

    Args:
        contrato_id: ID of the contrato to update
        contrato_data: Data to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        ContratoResponse with updated contrato data

    Raises:
        HTTPException: If contrato not found
    """
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato não encontrado"
        )

    update_data = contrato_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contrato, field, value)

    db.commit()
    db.refresh(contrato)

    return contrato


@router.post("/{contrato_id}/finalizar", response_model=ContratoResponse, summary="Finalizar contrato")
async def finalize_contrato(
    contrato_id: int,
    finalize_data: ContratoFinalizarRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ContratoResponse:
    """
    Finalize a contrato, calculate totals, and set vehicle back to 'Disponível'.

    Args:
        contrato_id: ID of the contrato to finalize
        finalize_data: Finalization data (quilometragem_final, observacoes)
        db: Database session
        current_user: Current authenticated user

    Returns:
        ContratoResponse with finalized contrato data

    Raises:
        HTTPException: If contrato not found
    """
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato não encontrado"
        )

    # Update contrato with final data
    contrato.quilometragem_final = finalize_data.quilometragem_final
    if finalize_data.observacoes:
        contrato.observacoes = finalize_data.observacoes
    contrato.status = "Finalizado"

    # Calculate total value
    dias_aluguel = (contrato.data_fim - contrato.data_inicio).days
    if dias_aluguel < 1:
        dias_aluguel = 1
    valor_total = contrato.valor_diaria * dias_aluguel
    contrato.valor_total = valor_total

    # Set vehicle status back to 'Disponível'
    veiculo = db.query(Veiculo).filter(Veiculo.id == contrato.veiculo_id).first()
    if veiculo:
        veiculo.status = "Disponível"
        veiculo.quilometragem = finalize_data.quilometragem_final

    db.commit()
    db.refresh(contrato)

    return contrato


@router.delete(
    "/{contrato_id}",
    response_model=MessageResponse,
    summary="Deletar contrato"
)
async def delete_contrato(
    contrato_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete a contrato.

    Args:
        contrato_id: ID of the contrato to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse confirming deletion

    Raises:
        HTTPException: If contrato not found
    """
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato não encontrado"
        )

    db.delete(contrato)
    db.commit()

    return MessageResponse(
        message="Contrato deletado com sucesso",
        success=True
    )

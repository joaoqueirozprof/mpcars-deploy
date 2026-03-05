from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Cliente
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[ClienteResponse],
    summary="Listar clientes"
)
async def list_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> PaginatedResponse[ClienteResponse]:
    """
    List all clientes with optional search filter.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        search: Search term to filter by name, email, or documento
        db: Database session
        current_user: Current authenticated user

    Returns:
        PaginatedResponse with list of clientes
    """
    query = db.query(Cliente)

    if search:
        query = query.filter(
            or_(
                Cliente.nome.ilike(f"%{search}%"),
                Cliente.email.ilike(f"%{search}%"),
                Cliente.cpf_cnpj.ilike(f"%{search}%")
            )
        )

    total = query.count()
    clientes = query.offset(skip).limit(limit).all()

    return PaginatedResponse(
        items=clientes,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )


@router.get("/{cliente_id}", response_model=ClienteResponse, summary="Obter cliente por ID")
async def get_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ClienteResponse:
    """
    Get a specific cliente by ID.

    Args:
        cliente_id: ID of the cliente to retrieve
        db: Database session
        current_user: Current authenticated user

    Returns:
        ClienteResponse with cliente data

    Raises:
        HTTPException: If cliente not found
    """
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()

    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )

    return cliente


@router.post("/", response_model=ClienteResponse, summary="Criar novo cliente")
async def create_cliente(
    cliente_data: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ClienteResponse:
    """
    Create a new cliente.

    Args:
        cliente_data: Data for the new cliente
        db: Database session
        current_user: Current authenticated user

    Returns:
        ClienteResponse with created cliente data

    Raises:
        HTTPException: If email or documento already exists
    """
    # Check if cpf_cnpj already exists
    existing_cpf = db.query(Cliente).filter(
        Cliente.cpf_cnpj == cliente_data.cpf_cnpj
    ).first()

    if existing_cpf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF/CNPJ já cadastrado"
        )

    # Check if email already exists (if provided)
    if cliente_data.email:
        existing_email = db.query(Cliente).filter(
            Cliente.email == cliente_data.email
        ).first()

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado"
            )

    novo_cliente = Cliente(**cliente_data.model_dump())
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)

    return novo_cliente


@router.put("/{cliente_id}", response_model=ClienteResponse, summary="Atualizar cliente")
async def update_cliente(
    cliente_id: int,
    cliente_data: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> ClienteResponse:
    """
    Update an existing cliente.

    Args:
        cliente_id: ID of the cliente to update
        cliente_data: Data to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        ClienteResponse with updated cliente data

    Raises:
        HTTPException: If cliente not found or email/documento already exists
    """
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()

    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )

    # Check if new cpf_cnpj already exists
    if cliente_data.cpf_cnpj and cliente_data.cpf_cnpj != cliente.cpf_cnpj:
        existing_cpf = db.query(Cliente).filter(
            Cliente.cpf_cnpj == cliente_data.cpf_cnpj
        ).first()
        if existing_cpf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CPF/CNPJ já cadastrado"
            )

    # Check if new email already exists
    if cliente_data.email and cliente_data.email != cliente.email:
        existing_email = db.query(Cliente).filter(
            Cliente.email == cliente_data.email
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado"
            )

    update_data = cliente_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cliente, field, value)

    db.commit()
    db.refresh(cliente)

    return cliente


@router.delete(
    "/{cliente_id}",
    response_model=MessageResponse,
    summary="Deletar cliente"
)
async def delete_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> MessageResponse:
    """
    Delete a cliente.

    Args:
        cliente_id: ID of the cliente to delete
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse confirming deletion

    Raises:
        HTTPException: If cliente not found
    """
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()

    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )

    db.delete(cliente)
    db.commit()

    return MessageResponse(
        message="Cliente deletado com sucesso",
        success=True
    )


@router.get(
    "/busca/{termo}",
    response_model=List[ClienteResponse],
    summary="Busca avançada de clientes"
)
async def search_clientes(
    termo: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> List[ClienteResponse]:
    """
    Advanced search for clientes by name, email, documento, or phone.

    Args:
        termo: Search term
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of ClienteResponse matching the search term
    """
    clientes = db.query(Cliente).filter(
        or_(
            Cliente.nome.ilike(f"%{termo}%"),
            Cliente.email.ilike(f"%{termo}%"),
            Cliente.cpf_cnpj.ilike(f"%{termo}%"),
            Cliente.telefone.ilike(f"%{termo}%")
        )
    ).limit(50).all()

    return clientes

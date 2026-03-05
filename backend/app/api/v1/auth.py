from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import (
    create_access_token,
    verify_password,
    get_password_hash,
    get_current_user,
    Token,
    TokenData,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.models import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioResponse

router = APIRouter()


@router.post("/login", response_model=Token, summary="Login de usuário")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Token:
    """
    Endpoint para autenticação de usuário.

    Args:
        form_data: Email (username) e senha do usuário
        db: Database session

    Returns:
        Token com access_token, token_type e tempo de expiração

    Raises:
        HTTPException: Se credenciais forem inválidas
    """
    # Find user by email
    usuario = db.query(Usuario).filter(
        Usuario.email == form_data.username
    ).first()

    if not usuario or not verify_password(form_data.password, usuario.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "email": usuario.email,
            "user_id": usuario.id,
            "is_admin": usuario.is_admin
        },
        expires_delta=access_token_expires
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/register", response_model=UsuarioResponse, summary="Registrar novo usuário")
async def register(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db)
) -> UsuarioResponse:
    """
    Endpoint para registrar um novo usuário.
    Apenas permite registro do primeiro usuário ou por usuário admin.

    Args:
        usuario_data: Dados do usuário a ser criado
        db: Database session

    Returns:
        UsuarioResponse com dados do usuário criado

    Raises:
        HTTPException: Se email já existe ou registro não permitido
    """
    # Check if user already exists
    existing_user = db.query(Usuario).filter(
        Usuario.email == usuario_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    # Check if this is the first user (will be admin)
    user_count = db.query(func.count(Usuario.id)).scalar()
    is_admin = user_count == 0

    # Create new user
    novo_usuario = Usuario(
        email=usuario_data.email,
        senha=get_password_hash(usuario_data.senha),
        nome=usuario_data.nome,
        is_admin=is_admin
    )

    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)

    return novo_usuario


@router.get("/me", response_model=UsuarioResponse, summary="Obter dados do usuário atual")
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UsuarioResponse:
    """
    Endpoint para obter informações do usuário autenticado.

    Args:
        current_user: Token data do usuário autenticado
        db: Database session

    Returns:
        UsuarioResponse com dados do usuário

    Raises:
        HTTPException: Se usuário não encontrado
    """
    usuario = db.query(Usuario).filter(
        Usuario.id == current_user.user_id
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    return usuario


@router.post("/refresh", response_model=Token, summary="Renovar token de acesso")
async def refresh_token(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Token:
    """
    Endpoint para renovar um token de acesso.

    Args:
        current_user: Token data do usuário autenticado
        db: Database session

    Returns:
        Token novo com access_token, token_type e tempo de expiração

    Raises:
        HTTPException: Se usuário não encontrado
    """
    usuario = db.query(Usuario).filter(
        Usuario.id == current_user.user_id
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "email": usuario.email,
            "user_id": usuario.id,
            "is_admin": usuario.is_admin
        },
        expires_delta=access_token_expires
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.auth import (
    create_access_token,
    verify_password,
    get_password_hash,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    TokenData,
)
from app.models import Usuario

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    nome: str
    senha: str


@router.post("/login", summary="Login de usuario")
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint. Accepts JSON with email and password.
    Returns token and user info for the frontend.
    """
    usuario = db.query(Usuario).filter(
        Usuario.email == login_data.email
    ).first()

    if not usuario or not verify_password(login_data.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha invalidos",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "email": usuario.email,
            "user_id": usuario.id,
            "is_admin": usuario.is_admin,
        },
        expires_delta=access_token_expires,
    )

    return {
        "token": access_token,
        "user": {
            "id": str(usuario.id),
            "name": usuario.nome,
            "email": usuario.email,
            "role": "admin" if usuario.is_admin else "user",
        },
    }


@router.post("/register", summary="Registrar novo usuario")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user."""
    existing = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ja cadastrado",
        )

    user_count = db.query(func.count(Usuario.id)).scalar()
    is_admin = user_count == 0

    novo_usuario = Usuario(
        email=data.email,
        hashed_password=get_password_hash(data.senha),
        nome=data.nome,
        is_admin=is_admin,
    )

    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)

    return {
        "id": novo_usuario.id,
        "email": novo_usuario.email,
        "nome": novo_usuario.nome,
        "is_admin": novo_usuario.is_admin,
    }


@router.get("/me", summary="Obter dados do usuario atual")
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current authenticated user info."""
    usuario = db.query(Usuario).filter(
        Usuario.id == current_user.user_id
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario nao encontrado",
        )

    return {
        "id": str(usuario.id),
        "name": usuario.nome,
        "email": usuario.email,
        "role": "admin" if usuario.is_admin else "user",
    }

from typing import Optional
from datetime import date
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import MotoristaEmpresa, Empresa, Cliente

router = APIRouter()


class MotoristaEmpresaCreate(BaseModel):
    empresa_id: int
    cliente_id: int
    cargo: str = "Motorista"
    ativo: bool = True
    data_vinculo: date
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            pass
        return data


class MotoristaEmpresaUpdate(BaseModel):
    cargo: Optional[str] = None
    ativo: Optional[bool] = None
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            pass
        return data


def motorista_empresa_to_dict(m):
    return {
        "id": m.id,
        "empresa_id": m.empresa_id,
        "cliente_id": m.cliente_id,
        "cargo": m.cargo,
        "ativo": m.ativo,
        "data_vinculo": m.data_vinculo.isoformat() if m.data_vinculo else None,
        "observacoes": m.observacoes,
    }


@router.get("/", summary="Listar motoristas de empresa")
async def list_motoristas_empresa(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    empresa_id: Optional[int] = Query(None),
    ativo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(MotoristaEmpresa)
    if empresa_id:
        query = query.filter(MotoristaEmpresa.empresa_id == empresa_id)
    if ativo is not None:
        query = query.filter(MotoristaEmpresa.ativo == ativo)

    total = query.count()
    motoristas = query.offset(skip).limit(limit).all()

    return {
        "items": [motorista_empresa_to_dict(m) for m in motoristas],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{motorista_id}", summary="Obter motorista de empresa por ID")
async def get_motorista_empresa(
    motorista_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    motorista = db.query(MotoristaEmpresa).filter(MotoristaEmpresa.id == motorista_id).first()
    if not motorista:
        raise HTTPException(status_code=404, detail="Motorista de empresa não encontrado")
    return motorista_empresa_to_dict(motorista)


@router.post("/", summary="Criar novo motorista de empresa")
async def create_motorista_empresa(
    motorista_data: MotoristaEmpresaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    empresa = db.query(Empresa).filter(Empresa.id == motorista_data.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    cliente = db.query(Cliente).filter(Cliente.id == motorista_data.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    # Check for duplicate
    existing = db.query(MotoristaEmpresa).filter(
        MotoristaEmpresa.empresa_id == motorista_data.empresa_id,
        MotoristaEmpresa.cliente_id == motorista_data.cliente_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este cliente já está vinculado a esta empresa como motorista")

    data = motorista_data.model_dump()

    try:
        novo_motorista = MotoristaEmpresa(**data)
        db.add(novo_motorista)
        db.commit()
        db.refresh(novo_motorista)
        return motorista_empresa_to_dict(novo_motorista)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar motorista de empresa: {str(e)}")


@router.put("/{motorista_id}", summary="Atualizar motorista de empresa")
async def update_motorista_empresa(
    motorista_id: int,
    motorista_data: MotoristaEmpresaUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    motorista = db.query(MotoristaEmpresa).filter(MotoristaEmpresa.id == motorista_id).first()
    if not motorista:
        raise HTTPException(status_code=404, detail="Motorista de empresa não encontrado")

    update_data = motorista_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(motorista, field, value)

    db.commit()
    db.refresh(motorista)
    return motorista_empresa_to_dict(motorista)


@router.delete("/{motorista_id}", summary="Deletar motorista de empresa")
async def delete_motorista_empresa(
    motorista_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    motorista = db.query(MotoristaEmpresa).filter(MotoristaEmpresa.id == motorista_id).first()
    if not motorista:
        raise HTTPException(status_code=404, detail="Motorista de empresa não encontrado")

    db.delete(motorista)
    db.commit()
    return {"message": "Motorista de empresa deletado com sucesso", "success": True}

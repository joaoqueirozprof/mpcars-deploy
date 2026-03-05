from typing import Optional
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Quilometragem, Contrato

router = APIRouter()


class QuilometragemCreate(BaseModel):
    contrato_id: int
    discriminacao: str
    quantidade: float
    preco_unitario: float
    preco_total: float

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            # Auto-calculate preco_total if not provided
            if "preco_total" not in data or data.get("preco_total") is None:
                if "quantidade" in data and "preco_unitario" in data:
                    data["preco_total"] = data["quantidade"] * data["preco_unitario"]
        return data


class QuilometragemUpdate(BaseModel):
    discriminacao: Optional[str] = None
    quantidade: Optional[float] = None
    preco_unitario: Optional[float] = None
    preco_total: Optional[float] = None

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            if "preco_total" not in data or data.get("preco_total") is None:
                if "quantidade" in data and "preco_unitario" in data:
                    data["preco_total"] = data["quantidade"] * data["preco_unitario"]
        return data


def quilometragem_to_dict(q):
    return {
        "id": q.id,
        "contrato_id": q.contrato_id,
        "discriminacao": q.discriminacao,
        "quantidade": q.quantidade,
        "preco_unitario": q.preco_unitario,
        "preco_total": q.preco_total,
    }


@router.get("/", summary="Listar quilometragens")
async def list_quilometragens(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    contrato_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(Quilometragem)
    if contrato_id:
        query = query.filter(Quilometragem.contrato_id == contrato_id)

    total = query.count()
    quilometragens = query.offset(skip).limit(limit).all()

    return {
        "items": [quilometragem_to_dict(q) for q in quilometragens],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{quilometragem_id}", summary="Obter quilometragem por ID")
async def get_quilometragem(
    quilometragem_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    quilometragem = db.query(Quilometragem).filter(Quilometragem.id == quilometragem_id).first()
    if not quilometragem:
        raise HTTPException(status_code=404, detail="Quilometragem não encontrada")
    return quilometragem_to_dict(quilometragem)


@router.post("/", summary="Criar nova quilometragem")
async def create_quilometragem(
    quilometragem_data: QuilometragemCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == quilometragem_data.contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    data = quilometragem_data.model_dump()

    try:
        nova_quilometragem = Quilometragem(**data)
        db.add(nova_quilometragem)
        db.commit()
        db.refresh(nova_quilometragem)
        return quilometragem_to_dict(nova_quilometragem)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar quilometragem: {str(e)}")


@router.put("/{quilometragem_id}", summary="Atualizar quilometragem")
async def update_quilometragem(
    quilometragem_id: int,
    quilometragem_data: QuilometragemUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    quilometragem = db.query(Quilometragem).filter(Quilometragem.id == quilometragem_id).first()
    if not quilometragem:
        raise HTTPException(status_code=404, detail="Quilometragem não encontrada")

    update_data = quilometragem_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(quilometragem, field, value)

    db.commit()
    db.refresh(quilometragem)
    return quilometragem_to_dict(quilometragem)


@router.delete("/{quilometragem_id}", summary="Deletar quilometragem")
async def delete_quilometragem(
    quilometragem_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    quilometragem = db.query(Quilometragem).filter(Quilometragem.id == quilometragem_id).first()
    if not quilometragem:
        raise HTTPException(status_code=404, detail="Quilometragem não encontrada")

    db.delete(quilometragem)
    db.commit()
    return {"message": "Quilometragem deletada com sucesso", "success": True}

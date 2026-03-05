from typing import Optional
from datetime import datetime
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import DespesaContrato, Contrato

router = APIRouter()


class DespesaContratoCreate(BaseModel):
    contrato_id: int
    tipo: str
    descricao: str
    valor: float
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            # Map alternative field names if needed
            pass
        return data


class DespesaContratoUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[float] = None
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            pass
        return data


def despesa_contrato_to_dict(d):
    return {
        "id": d.id,
        "contrato_id": d.contrato_id,
        "tipo": d.tipo,
        "descricao": d.descricao,
        "valor": d.valor,
        "data_registro": d.data_registro.isoformat() if d.data_registro else None,
        "responsavel": d.responsavel,
        "observacoes": d.observacoes,
    }


@router.get("/", summary="Listar despesas de contrato")
async def list_despesas_contrato(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    contrato_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(DespesaContrato)
    if contrato_id:
        query = query.filter(DespesaContrato.contrato_id == contrato_id)

    total = query.count()
    despesas = query.offset(skip).limit(limit).all()

    return {
        "items": [despesa_contrato_to_dict(d) for d in despesas],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{despesa_id}", summary="Obter despesa de contrato por ID")
async def get_despesa_contrato(
    despesa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    despesa = db.query(DespesaContrato).filter(DespesaContrato.id == despesa_id).first()
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa de contrato não encontrada")
    return despesa_contrato_to_dict(despesa)


@router.post("/", summary="Criar nova despesa de contrato")
async def create_despesa_contrato(
    despesa_data: DespesaContratoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == despesa_data.contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    data = despesa_data.model_dump()

    try:
        nova_despesa = DespesaContrato(**data)
        db.add(nova_despesa)
        db.commit()
        db.refresh(nova_despesa)
        return despesa_contrato_to_dict(nova_despesa)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar despesa de contrato: {str(e)}")


@router.put("/{despesa_id}", summary="Atualizar despesa de contrato")
async def update_despesa_contrato(
    despesa_id: int,
    despesa_data: DespesaContratoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    despesa = db.query(DespesaContrato).filter(DespesaContrato.id == despesa_id).first()
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa de contrato não encontrada")

    update_data = despesa_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(despesa, field, value)

    db.commit()
    db.refresh(despesa)
    return despesa_contrato_to_dict(despesa)


@router.delete("/{despesa_id}", summary="Deletar despesa de contrato")
async def delete_despesa_contrato(
    despesa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    despesa = db.query(DespesaContrato).filter(DespesaContrato.id == despesa_id).first()
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa de contrato não encontrada")

    db.delete(despesa)
    db.commit()
    return {"message": "Despesa de contrato deletada com sucesso", "success": True}


@router.get("/contrato/{contrato_id}/total", summary="Obter total de despesas de um contrato")
async def get_total_despesas_contrato(
    contrato_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    total = db.query(func.sum(DespesaContrato.valor)).filter(
        DespesaContrato.contrato_id == contrato_id
    ).scalar() or 0

    return {
        "contrato_id": contrato_id,
        "total_despesas": total,
    }

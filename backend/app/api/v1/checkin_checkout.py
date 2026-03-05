from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import CheckinCheckout, Contrato, Veiculo

router = APIRouter()


class CheckinCheckoutCreate(BaseModel):
    contrato_id: int
    tipo: str  # 'check-in' or 'check-out'
    km: float
    nivel_combustivel: Optional[str] = None
    itens_checklist: Optional[str] = None
    avarias: Optional[str] = None
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            # Normalize tipo to lowercase
            if "tipo" in data:
                data["tipo"] = data["tipo"].lower()
        return data


class CheckinCheckoutUpdate(BaseModel):
    km: Optional[float] = None
    nivel_combustivel: Optional[str] = None
    itens_checklist: Optional[str] = None
    avarias: Optional[str] = None
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            pass
        return data


def checkin_checkout_to_dict(c):
    return {
        "id": c.id,
        "contrato_id": c.contrato_id,
        "tipo": c.tipo,
        "data_hora": c.data_hora.isoformat() if c.data_hora else None,
        "km": c.km,
        "nivel_combustivel": c.nivel_combustivel,
        "itens_checklist": c.itens_checklist,
        "avarias": c.avarias,
        "observacoes": c.observacoes,
    }


@router.get("/", summary="Listar check-ins e check-outs")
async def list_checkin_checkout(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    contrato_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(CheckinCheckout)
    if contrato_id:
        query = query.filter(CheckinCheckout.contrato_id == contrato_id)
    if tipo:
        query = query.filter(CheckinCheckout.tipo == tipo.lower())

    total = query.count()
    registros = query.offset(skip).limit(limit).all()

    return {
        "items": [checkin_checkout_to_dict(r) for r in registros],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{checkin_checkout_id}", summary="Obter check-in/check-out por ID")
async def get_checkin_checkout(
    checkin_checkout_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    registro = db.query(CheckinCheckout).filter(CheckinCheckout.id == checkin_checkout_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro de check-in/check-out não encontrado")
    return checkin_checkout_to_dict(registro)


@router.post("/", summary="Criar novo check-in ou check-out")
async def create_checkin_checkout(
    registro_data: CheckinCheckoutCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == registro_data.contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    veiculo = db.query(Veiculo).filter(Veiculo.id == contrato.veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    data = registro_data.model_dump()

    try:
        novo_registro = CheckinCheckout(**data)
        db.add(novo_registro)

        # Update vehicle status based on check-in/check-out type
        if registro_data.tipo.lower() == "check-out":
            veiculo.status = "Alugado"
        elif registro_data.tipo.lower() == "check-in":
            veiculo.status = "Disponível"

        db.commit()
        db.refresh(novo_registro)
        return checkin_checkout_to_dict(novo_registro)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar registro de check-in/check-out: {str(e)}")


@router.put("/{checkin_checkout_id}", summary="Atualizar check-in/check-out")
async def update_checkin_checkout(
    checkin_checkout_id: int,
    registro_data: CheckinCheckoutUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    registro = db.query(CheckinCheckout).filter(CheckinCheckout.id == checkin_checkout_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro de check-in/check-out não encontrado")

    update_data = registro_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(registro, field, value)

    db.commit()
    db.refresh(registro)
    return checkin_checkout_to_dict(registro)


@router.delete("/{checkin_checkout_id}", summary="Deletar check-in/check-out")
async def delete_checkin_checkout(
    checkin_checkout_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    registro = db.query(CheckinCheckout).filter(CheckinCheckout.id == checkin_checkout_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro de check-in/check-out não encontrado")

    db.delete(registro)
    db.commit()
    return {"message": "Registro de check-in/check-out deletado com sucesso", "success": True}


@router.get("/hoje/todos", summary="Obter check-ins e check-outs de hoje")
async def get_checkins_checkouts_today(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    today = date.today()

    registros = db.query(CheckinCheckout).filter(
        and_(
            CheckinCheckout.data_hora >= datetime(today.year, today.month, today.day, 0, 0, 0),
            CheckinCheckout.data_hora < datetime(today.year, today.month, today.day, 23, 59, 59)
        )
    ).all()

    # Separate check-ins and check-outs
    checkins = [r for r in registros if r.tipo.lower() == "check-in"]
    checkouts = [r for r in registros if r.tipo.lower() == "check-out"]

    return {
        "data": today.isoformat(),
        "checkins": {
            "total": len(checkins),
            "items": [checkin_checkout_to_dict(r) for r in checkins],
        },
        "checkouts": {
            "total": len(checkouts),
            "items": [checkin_checkout_to_dict(r) for r in checkouts],
        },
    }

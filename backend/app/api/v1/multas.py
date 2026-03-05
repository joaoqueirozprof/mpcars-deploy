from typing import Optional
from datetime import date
from pydantic import BaseModel, field_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Multa, Veiculo

router = APIRouter()


class MultaCreate(BaseModel):
    veiculo_id: int
    contrato_id: Optional[int] = None
    cliente_id: Optional[int] = None
    # Alternative fields MUST come before canonical fields for validator ordering
    data_multa: Optional[date] = None
    data_infracao: Optional[date] = None
    data_notificacao: Optional[date] = None
    numero_infracao: Optional[str] = None
    auto_infracao: Optional[str] = None
    descricao: str
    valor: float
    pontos: int = 0
    gravidade: str = "Média"
    status: str = "Pendente"
    responsavel: Optional[str] = None
    data_pagamento: Optional[date] = None
    observacoes: Optional[str] = None

    @field_validator('data_infracao', mode='before')
    @classmethod
    def validate_data_infracao(cls, v, info):
        if v is not None:
            return v
        data = info.data if hasattr(info, 'data') else {}
        if data.get('data_multa'):
            return data['data_multa']
        return None

    @field_validator('auto_infracao', mode='before')
    @classmethod
    def validate_auto_infracao(cls, v, info):
        if v is not None:
            return v
        data = info.data if hasattr(info, 'data') else {}
        if data.get('numero_infracao'):
            return data['numero_infracao']
        return None


class MultaUpdate(BaseModel):
    data_infracao: Optional[date] = None
    data_multa: Optional[date] = None
    data_notificacao: Optional[date] = None
    auto_infracao: Optional[str] = None
    numero_infracao: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[float] = None
    pontos: Optional[int] = None
    gravidade: Optional[str] = None
    status: Optional[str] = None
    responsavel: Optional[str] = None
    data_pagamento: Optional[date] = None
    observacoes: Optional[str] = None

    @field_validator('data_infracao', mode='before')
    @classmethod
    def validate_data_infracao(cls, v, info):
        if v is not None:
            return v
        data = info.data if hasattr(info, 'data') else {}
        if data.get('data_multa'):
            return data['data_multa']
        return None


def multa_to_dict(m):
    return {
        "id": m.id,
        "veiculo_id": m.veiculo_id,
        "contrato_id": m.contrato_id,
        "cliente_id": m.cliente_id,
        "data_infracao": m.data_infracao.isoformat() if m.data_infracao else None,
        "data_multa": m.data_infracao.isoformat() if m.data_infracao else None,
        "data_notificacao": m.data_notificacao.isoformat() if m.data_notificacao else None,
        "auto_infracao": m.auto_infracao,
        "descricao": m.descricao,
        "valor": m.valor,
        "pontos": m.pontos,
        "gravidade": m.gravidade,
        "status": m.status,
        "responsavel": m.responsavel,
        "data_pagamento": m.data_pagamento.isoformat() if m.data_pagamento else None,
        "observacoes": m.observacoes,
        "data_cadastro": m.data_cadastro.isoformat() if m.data_cadastro else None,
    }


@router.get("/", summary="Listar multas")
async def list_multas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(Multa)
    if veiculo_id:
        query = query.filter(Multa.veiculo_id == veiculo_id)
    if status_filter:
        query = query.filter(Multa.status == status_filter)

    total = query.count()
    multas = query.offset(skip).limit(limit).all()

    return {
        "items": [multa_to_dict(m) for m in multas],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{multa_id}", summary="Obter multa por ID")
async def get_multa(
    multa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    multa = db.query(Multa).filter(Multa.id == multa_id).first()
    if not multa:
        raise HTTPException(status_code=404, detail="Multa não encontrada")
    return multa_to_dict(multa)


@router.post("/", summary="Criar nova multa")
async def create_multa(
    multa_data: MultaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == multa_data.veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    data = multa_data.model_dump()
    data.pop("data_multa", None)
    data.pop("numero_infracao", None)

    # Ensure data_infracao has a value (nullable=False in DB)
    if not data.get("data_infracao"):
        from datetime import date as date_type
        data["data_infracao"] = date_type.today()

    try:
        nova_multa = Multa(**data)
        db.add(nova_multa)
        db.commit()
        db.refresh(nova_multa)
        return multa_to_dict(nova_multa)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar multa: {str(e)}")


@router.put("/{multa_id}", summary="Atualizar multa")
async def update_multa(
    multa_id: int,
    multa_data: MultaUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    multa = db.query(Multa).filter(Multa.id == multa_id).first()
    if not multa:
        raise HTTPException(status_code=404, detail="Multa não encontrada")

    update_data = multa_data.model_dump(exclude_unset=True)
    update_data.pop("data_multa", None)
    update_data.pop("numero_infracao", None)

    for field, value in update_data.items():
        setattr(multa, field, value)

    db.commit()
    db.refresh(multa)
    return multa_to_dict(multa)


@router.delete("/{multa_id}", summary="Deletar multa")
async def delete_multa(
    multa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    multa = db.query(Multa).filter(Multa.id == multa_id).first()
    if not multa:
        raise HTTPException(status_code=404, detail="Multa não encontrada")

    db.delete(multa)
    db.commit()
    return {"message": "Multa deletada com sucesso", "success": True}

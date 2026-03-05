from typing import Optional
from datetime import date
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import ProrrogacaoContrato, Contrato

router = APIRouter()


class ProrrogacaoContratoCreate(BaseModel):
    contrato_id: int
    data_prevista_anterior: date
    data_prevista_nova: date
    motivo: str
    diarias_adicionais: int
    valor_adicional: float

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            pass
        return data


class ProrrogacaoContratoUpdate(BaseModel):
    data_prevista_anterior: Optional[date] = None
    data_prevista_nova: Optional[date] = None
    motivo: Optional[str] = None
    diarias_adicionais: Optional[int] = None
    valor_adicional: Optional[float] = None

    @model_validator(mode='before')
    @classmethod
    def map_fields(cls, data):
        if isinstance(data, dict):
            pass
        return data


def prorrogacao_contrato_to_dict(p):
    return {
        "id": p.id,
        "contrato_id": p.contrato_id,
        "data_prevista_anterior": p.data_prevista_anterior.isoformat() if p.data_prevista_anterior else None,
        "data_prevista_nova": p.data_prevista_nova.isoformat() if p.data_prevista_nova else None,
        "motivo": p.motivo,
        "diarias_adicionais": p.diarias_adicionais,
        "valor_adicional": p.valor_adicional,
        "data_registro": p.data_registro.isoformat() if p.data_registro else None,
    }


@router.get("/", summary="Listar prorrogações de contrato")
async def list_prorrogacoes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    contrato_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(ProrrogacaoContrato)
    if contrato_id:
        query = query.filter(ProrrogacaoContrato.contrato_id == contrato_id)

    total = query.count()
    prorrogacoes = query.offset(skip).limit(limit).all()

    return {
        "items": [prorrogacao_contrato_to_dict(p) for p in prorrogacoes],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{prorrogacao_id}", summary="Obter prorrogação de contrato por ID")
async def get_prorrogacao(
    prorrogacao_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    prorrogacao = db.query(ProrrogacaoContrato).filter(ProrrogacaoContrato.id == prorrogacao_id).first()
    if not prorrogacao:
        raise HTTPException(status_code=404, detail="Prorrogação de contrato não encontrada")
    return prorrogacao_contrato_to_dict(prorrogacao)


@router.post("/", summary="Criar nova prorrogação de contrato")
async def create_prorrogacao(
    prorrogacao_data: ProrrogacaoContratoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == prorrogacao_data.contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    data = prorrogacao_data.model_dump()

    try:
        nova_prorrogacao = ProrrogacaoContrato(**data)
        db.add(nova_prorrogacao)

        # Update contrato fields
        contrato.data_prevista_devolucao = prorrogacao_data.data_prevista_nova
        contrato.prorrogacoes_valor += prorrogacao_data.valor_adicional

        db.commit()
        db.refresh(nova_prorrogacao)
        return prorrogacao_contrato_to_dict(nova_prorrogacao)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar prorrogação de contrato: {str(e)}")


@router.put("/{prorrogacao_id}", summary="Atualizar prorrogação de contrato")
async def update_prorrogacao(
    prorrogacao_id: int,
    prorrogacao_data: ProrrogacaoContratoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    prorrogacao = db.query(ProrrogacaoContrato).filter(ProrrogacaoContrato.id == prorrogacao_id).first()
    if not prorrogacao:
        raise HTTPException(status_code=404, detail="Prorrogação de contrato não encontrada")

    update_data = prorrogacao_data.model_dump(exclude_unset=True)

    # Get contrato to update if needed
    contrato = db.query(Contrato).filter(Contrato.id == prorrogacao.contrato_id).first()

    # If updating data_prevista_nova, also update contrato.data_prevista_devolucao
    if "data_prevista_nova" in update_data and contrato:
        contrato.data_prevista_devolucao = update_data["data_prevista_nova"]

    # If updating valor_adicional, adjust contrato.prorrogacoes_valor
    if "valor_adicional" in update_data and contrato:
        valor_diff = update_data["valor_adicional"] - prorrogacao.valor_adicional
        contrato.prorrogacoes_valor += valor_diff

    for field, value in update_data.items():
        setattr(prorrogacao, field, value)

    db.commit()
    db.refresh(prorrogacao)
    return prorrogacao_contrato_to_dict(prorrogacao)


@router.delete("/{prorrogacao_id}", summary="Deletar prorrogação de contrato")
async def delete_prorrogacao(
    prorrogacao_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    prorrogacao = db.query(ProrrogacaoContrato).filter(ProrrogacaoContrato.id == prorrogacao_id).first()
    if not prorrogacao:
        raise HTTPException(status_code=404, detail="Prorrogação de contrato não encontrada")

    contrato = db.query(Contrato).filter(Contrato.id == prorrogacao.contrato_id).first()

    # Revert contrato updates when deleting prorrogacao
    if contrato:
        contrato.prorrogacoes_valor -= prorrogacao.valor_adicional

    db.delete(prorrogacao)
    db.commit()
    return {"message": "Prorrogação de contrato deletada com sucesso", "success": True}

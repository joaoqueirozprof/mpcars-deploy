"""
Insurance Installment endpoints for MPCARS.
"""
from typing import Optional
from datetime import date
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import ParcelaSeguro, Seguro, DespesaOperacional, Veiculo
from datetime import datetime

router = APIRouter()


class ParcelaSeguroCreate(BaseModel):
    seguro_id: int
    veiculo_id: int
    numero_parcela: int
    valor: float
    vencimento: date
    mes_referencia: Optional[str] = None
    observacoes: Optional[str] = None
    status: str = "Pendente"

    @model_validator(mode='before')
    @classmethod
    def validate_data(cls, data):
        if isinstance(data, dict):
            if data.get('valor') is None or data.get('valor') <= 0:
                raise ValueError("Valor da parcela deve ser maior que 0")
        return data


class ParcelaSeguroUpdate(BaseModel):
    numero_parcela: Optional[int] = None
    valor: Optional[float] = None
    vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    status: Optional[str] = None
    mes_referencia: Optional[str] = None
    observacoes: Optional[str] = None


def parcela_seguro_to_dict(p):
    return {
        "id": p.id,
        "seguro_id": p.seguro_id,
        "veiculo_id": p.veiculo_id,
        "numero_parcela": p.numero_parcela,
        "valor": p.valor,
        "vencimento": p.vencimento.isoformat() if p.vencimento else None,
        "data_pagamento": p.data_pagamento.isoformat() if p.data_pagamento else None,
        "status": p.status,
        "mes_referencia": p.mes_referencia,
        "observacoes": p.observacoes,
        "data_cadastro": p.data_cadastro.isoformat() if p.data_cadastro else None,
    }


@router.get("/", summary="Listar parcelas de seguro")
async def list_parcelas_seguro(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    seguro_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(ParcelaSeguro)
    if seguro_id:
        query = query.filter(ParcelaSeguro.seguro_id == seguro_id)
    if status:
        query = query.filter(ParcelaSeguro.status == status)

    total = query.count()
    parcelas = query.offset(skip).limit(limit).all()

    return {
        "items": [parcela_seguro_to_dict(p) for p in parcelas],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{parcela_id}", summary="Obter parcela de seguro por ID")
async def get_parcela_seguro(
    parcela_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    parcela = db.query(ParcelaSeguro).filter(ParcelaSeguro.id == parcela_id).first()
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela de seguro não encontrada")
    return parcela_seguro_to_dict(parcela)


@router.post("/", summary="Criar nova parcela de seguro")
async def create_parcela_seguro(
    parcela_data: ParcelaSeguroCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    seguro = db.query(Seguro).filter(Seguro.id == parcela_data.seguro_id).first()
    if not seguro:
        raise HTTPException(status_code=404, detail="Seguro não encontrado")

    veiculo = db.query(Veiculo).filter(Veiculo.id == parcela_data.veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    try:
        nova_parcela = ParcelaSeguro(**parcela_data.model_dump())
        db.add(nova_parcela)
        db.commit()
        db.refresh(nova_parcela)
        return parcela_seguro_to_dict(nova_parcela)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar parcela: {str(e)}")


@router.put("/{parcela_id}", summary="Atualizar parcela de seguro")
async def update_parcela_seguro(
    parcela_id: int,
    parcela_data: ParcelaSeguroUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    parcela = db.query(ParcelaSeguro).filter(ParcelaSeguro.id == parcela_id).first()
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela de seguro não encontrada")

    update_data = parcela_data.model_dump(exclude_unset=True)
    status_anterior = parcela.status

    for field, value in update_data.items():
        setattr(parcela, field, value)

    db.commit()

    # If status changed to 'Paga', create DespesaOperacional record for sync
    if status_anterior != "Paga" and parcela.status == "Paga":
        try:
            despesa = DespesaOperacional(
                tipo="Seguro",
                origem_tabela="parcelas_seguro",
                origem_id=parcela.id,
                veiculo_id=parcela.veiculo_id,
                descricao=f"Pagamento de parcela seguro #{parcela.numero_parcela}",
                valor=parcela.valor,
                data=parcela.data_pagamento or date.today(),
                categoria="Seguro",
                mes=(parcela.data_pagamento or date.today()).month,
                ano=(parcela.data_pagamento or date.today()).year,
            )
            db.add(despesa)
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Erro ao criar despesa operacional: {str(e)}")

    db.refresh(parcela)
    return parcela_seguro_to_dict(parcela)


@router.delete("/{parcela_id}", summary="Deletar parcela de seguro")
async def delete_parcela_seguro(
    parcela_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    parcela = db.query(ParcelaSeguro).filter(ParcelaSeguro.id == parcela_id).first()
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela de seguro não encontrada")

    db.delete(parcela)
    db.commit()
    return {"message": "Parcela de seguro deletada com sucesso", "success": True}

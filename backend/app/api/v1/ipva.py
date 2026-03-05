from typing import Optional
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import IpvaRegistro, Veiculo

router = APIRouter()


class IpvaCreate(BaseModel):
    veiculo_id: int
    ano_referencia: Optional[int] = None
    ano: Optional[int] = None
    valor_venal: float = 0
    aliquota: float = 0
    valor_ipva: float = 0
    valor: Optional[float] = None
    valor_pago: float = 0
    data_vencimento: date
    data_pagamento: Optional[date] = None
    status: str = "Pendente"
    parcelas: int = 1
    parcela_atual: int = 0
    observacoes: Optional[str] = None


class IpvaUpdate(BaseModel):
    veiculo_id: Optional[int] = None
    ano_referencia: Optional[int] = None
    ano: Optional[int] = None
    valor_venal: Optional[float] = None
    aliquota: Optional[float] = None
    valor_ipva: Optional[float] = None
    valor: Optional[float] = None
    valor_pago: Optional[float] = None
    data_vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    status: Optional[str] = None
    parcelas: Optional[int] = None
    parcela_atual: Optional[int] = None
    observacoes: Optional[str] = None


def ipva_to_dict(ipva):
    """Convert IpvaRegistro ORM to dict."""
    return {
        "id": ipva.id,
        "veiculo_id": ipva.veiculo_id,
        "ano_referencia": ipva.ano_referencia,
        "ano": ipva.ano_referencia,
        "valor_venal": ipva.valor_venal,
        "aliquota": ipva.aliquota,
        "valor_ipva": ipva.valor_ipva,
        "valor": ipva.valor_ipva,
        "valor_pago": ipva.valor_pago,
        "data_vencimento": ipva.data_vencimento.isoformat() if ipva.data_vencimento else None,
        "data_pagamento": ipva.data_pagamento.isoformat() if ipva.data_pagamento else None,
        "status": ipva.status,
        "parcelas": ipva.parcelas,
        "parcela_atual": ipva.parcela_atual,
        "observacoes": ipva.observacoes,
        "data_cadastro": ipva.data_cadastro.isoformat() if ipva.data_cadastro else None,
    }


@router.get("/", summary="Listar registros de IPVA")
async def list_ipva(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all IPVA records with optional filters."""
    query = db.query(IpvaRegistro)

    if veiculo_id:
        query = query.filter(IpvaRegistro.veiculo_id == veiculo_id)
    if status_filter:
        query = query.filter(IpvaRegistro.status == status_filter)

    total = query.count()
    ipvas = query.offset(skip).limit(limit).all()

    return {
        "items": [ipva_to_dict(i) for i in ipvas],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{ipva_id}", summary="Obter IPVA por ID")
async def get_ipva(
    ipva_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    ipva = db.query(IpvaRegistro).filter(IpvaRegistro.id == ipva_id).first()
    if not ipva:
        raise HTTPException(status_code=404, detail="Registro de IPVA não encontrado")
    return ipva_to_dict(ipva)


@router.post("/", summary="Criar registro de IPVA")
async def create_ipva(
    ipva_data: IpvaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == ipva_data.veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    data = ipva_data.model_dump()
    # Map frontend fields to model fields
    if data.get("ano") and not data.get("ano_referencia"):
        data["ano_referencia"] = data["ano"]
    if data.get("valor") and not data.get("valor_ipva"):
        data["valor_ipva"] = data["valor"]
    # Remove frontend-only fields
    data.pop("ano", None)
    data.pop("valor", None)

    novo_ipva = IpvaRegistro(**data)
    db.add(novo_ipva)
    db.commit()
    db.refresh(novo_ipva)
    return ipva_to_dict(novo_ipva)


@router.put("/{ipva_id}", summary="Atualizar registro de IPVA")
async def update_ipva(
    ipva_id: int,
    ipva_data: IpvaUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    ipva = db.query(IpvaRegistro).filter(IpvaRegistro.id == ipva_id).first()
    if not ipva:
        raise HTTPException(status_code=404, detail="Registro de IPVA não encontrado")

    data = ipva_data.model_dump(exclude_unset=True)
    # Map frontend fields to model fields
    if "ano" in data:
        data["ano_referencia"] = data.pop("ano")
    if "valor" in data:
        data["valor_ipva"] = data.pop("valor")

    for field, value in data.items():
        if hasattr(ipva, field):
            setattr(ipva, field, value)

    db.commit()
    db.refresh(ipva)
    return ipva_to_dict(ipva)


@router.delete("/{ipva_id}", summary="Deletar registro de IPVA")
async def delete_ipva(
    ipva_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    ipva = db.query(IpvaRegistro).filter(IpvaRegistro.id == ipva_id).first()
    if not ipva:
        raise HTTPException(status_code=404, detail="Registro de IPVA não encontrado")

    db.delete(ipva)
    db.commit()
    return {"message": "IPVA deletado com sucesso", "success": True}

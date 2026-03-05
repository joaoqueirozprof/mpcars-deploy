from typing import Optional
from datetime import date
from pydantic import BaseModel, field_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Seguro, Veiculo

router = APIRouter()


class SeguroCreate(BaseModel):
    veiculo_id: int
    seguradora: str
    numero_apolice: str
    tipo_seguro: str = "Completo"
    tipo_cobertura: Optional[str] = None
    data_inicio: date
    # Alternative fields MUST come before canonical fields for validator ordering
    data_fim: Optional[date] = None
    data_vencimento: Optional[date] = None
    valor_premio: Optional[float] = None
    valor: Optional[float] = None
    valor_franquia: float = 0
    cobertura: Optional[str] = None
    quantidade_parcelas: int = 1
    status: str = "Ativo"
    observacoes: Optional[str] = None

    @field_validator('data_vencimento', mode='before')
    @classmethod
    def validate_data_vencimento(cls, v, info):
        if v is not None:
            return v
        data = info.data if hasattr(info, 'data') else {}
        if data.get('data_fim'):
            return data['data_fim']
        return None

    @field_validator('valor', mode='before')
    @classmethod
    def validate_valor(cls, v, info):
        if v is not None:
            return v
        data = info.data if hasattr(info, 'data') else {}
        if data.get('valor_premio'):
            return data['valor_premio']
        return None


class SeguroUpdate(BaseModel):
    seguradora: Optional[str] = None
    numero_apolice: Optional[str] = None
    tipo_seguro: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    data_vencimento: Optional[date] = None
    valor_premio: Optional[float] = None
    valor: Optional[float] = None
    valor_franquia: Optional[float] = None
    cobertura: Optional[str] = None
    quantidade_parcelas: Optional[int] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None

    @field_validator('data_vencimento', mode='before')
    @classmethod
    def validate_data_vencimento(cls, v, info):
        if v is not None:
            return v
        data = info.data if hasattr(info, 'data') else {}
        if data.get('data_fim'):
            return data['data_fim']
        return None

    @field_validator('valor', mode='before')
    @classmethod
    def validate_valor(cls, v, info):
        if v is not None:
            return v
        data = info.data if hasattr(info, 'data') else {}
        if data.get('valor_premio'):
            return data['valor_premio']
        return None


def seguro_to_dict(s):
    return {
        "id": s.id,
        "veiculo_id": s.veiculo_id,
        "seguradora": s.seguradora,
        "numero_apolice": s.numero_apolice,
        "tipo_seguro": s.tipo_seguro,
        "data_inicio": s.data_inicio.isoformat() if s.data_inicio else None,
        "data_vencimento": s.data_vencimento.isoformat() if s.data_vencimento else None,
        "valor": s.valor,
        "valor_franquia": s.valor_franquia,
        "cobertura": s.cobertura,
        "quantidade_parcelas": s.quantidade_parcelas,
        "status": s.status,
        "observacoes": s.observacoes,
        "data_cadastro": s.data_cadastro.isoformat() if s.data_cadastro else None,
    }


@router.get("/", summary="Listar seguros")
async def list_seguros(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(Seguro)
    if veiculo_id:
        query = query.filter(Seguro.veiculo_id == veiculo_id)
    if status_filter:
        query = query.filter(Seguro.status == status_filter)

    total = query.count()
    seguros = query.offset(skip).limit(limit).all()

    return {
        "items": [seguro_to_dict(s) for s in seguros],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{seguro_id}", summary="Obter seguro por ID")
async def get_seguro(
    seguro_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    seguro = db.query(Seguro).filter(Seguro.id == seguro_id).first()
    if not seguro:
        raise HTTPException(status_code=404, detail="Seguro não encontrado")
    return seguro_to_dict(seguro)


@router.post("/", summary="Criar novo seguro")
async def create_seguro(
    seguro_data: SeguroCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == seguro_data.veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    data = seguro_data.model_dump()
    # Remove alternative field names
    data.pop("data_fim", None)
    data.pop("valor_premio", None)
    data.pop("tipo_cobertura", None)

    # Ensure data_vencimento has a value (nullable=False in DB)
    if not data.get("data_vencimento"):
        data["data_vencimento"] = data["data_inicio"]

    # Ensure valor has a value (nullable=False in DB)
    if data.get("valor") is None:
        data["valor"] = 0

    try:
        novo_seguro = Seguro(**data)
        db.add(novo_seguro)
        db.commit()
        db.refresh(novo_seguro)
        return seguro_to_dict(novo_seguro)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar seguro: {str(e)}")


@router.put("/{seguro_id}", summary="Atualizar seguro")
async def update_seguro(
    seguro_id: int,
    seguro_data: SeguroUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    seguro = db.query(Seguro).filter(Seguro.id == seguro_id).first()
    if not seguro:
        raise HTTPException(status_code=404, detail="Seguro não encontrado")

    update_data = seguro_data.model_dump(exclude_unset=True)
    update_data.pop("data_fim", None)
    update_data.pop("valor_premio", None)

    for field, value in update_data.items():
        setattr(seguro, field, value)

    db.commit()
    db.refresh(seguro)
    return seguro_to_dict(seguro)


@router.delete("/{seguro_id}", summary="Deletar seguro")
async def delete_seguro(
    seguro_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    seguro = db.query(Seguro).filter(Seguro.id == seguro_id).first()
    if not seguro:
        raise HTTPException(status_code=404, detail="Seguro não encontrado")

    db.delete(seguro)
    db.commit()
    return {"message": "Seguro deletado com sucesso", "success": True}

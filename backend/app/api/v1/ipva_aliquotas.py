"""
IPVA Aliquota endpoints for MPCARS.
"""
from typing import Optional
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import IpvaAliquota

router = APIRouter()


class IpvaAliquotaCreate(BaseModel):
    estado: str
    tipo_veiculo: str
    aliquota: float
    descricao: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def validate_data(cls, data):
        if isinstance(data, dict):
            if data.get('estado'):
                data['estado'] = data['estado'].upper()
            if not data.get('aliquota') or data.get('aliquota') < 0:
                raise ValueError("Alíquota deve ser um valor positivo")
            if not data.get('tipo_veiculo'):
                raise ValueError("Tipo de veículo é obrigatório")
        return data


class IpvaAliquotaUpdate(BaseModel):
    aliquota: Optional[float] = None
    descricao: Optional[str] = None


def ipva_aliquota_to_dict(a):
    return {
        "id": a.id,
        "estado": a.estado,
        "tipo_veiculo": a.tipo_veiculo,
        "aliquota": a.aliquota,
        "descricao": a.descricao,
    }


@router.get("/", summary="Listar alíquotas IPVA")
async def list_ipva_aliquotas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(IpvaAliquota)
    if estado:
        query = query.filter(IpvaAliquota.estado == estado.upper())

    total = query.count()
    aliquotas = query.offset(skip).limit(limit).all()

    return {
        "items": [ipva_aliquota_to_dict(a) for a in aliquotas],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{aliquota_id}", summary="Obter alíquota IPVA por ID")
async def get_ipva_aliquota(
    aliquota_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    aliquota = db.query(IpvaAliquota).filter(IpvaAliquota.id == aliquota_id).first()
    if not aliquota:
        raise HTTPException(status_code=404, detail="Alíquota IPVA não encontrada")
    return ipva_aliquota_to_dict(aliquota)


@router.post("/", summary="Criar nova alíquota IPVA")
async def create_ipva_aliquota(
    aliquota_data: IpvaAliquotaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    # Check if already exists
    existente = db.query(IpvaAliquota).filter(
        IpvaAliquota.estado == aliquota_data.estado.upper(),
        IpvaAliquota.tipo_veiculo == aliquota_data.tipo_veiculo
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Alíquota IPVA já existe para este estado e tipo de veículo")

    try:
        nova_aliquota = IpvaAliquota(**aliquota_data.model_dump())
        db.add(nova_aliquota)
        db.commit()
        db.refresh(nova_aliquota)
        return ipva_aliquota_to_dict(nova_aliquota)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar alíquota: {str(e)}")


@router.put("/{aliquota_id}", summary="Atualizar alíquota IPVA")
async def update_ipva_aliquota(
    aliquota_id: int,
    aliquota_data: IpvaAliquotaUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    aliquota = db.query(IpvaAliquota).filter(IpvaAliquota.id == aliquota_id).first()
    if not aliquota:
        raise HTTPException(status_code=404, detail="Alíquota IPVA não encontrada")

    update_data = aliquota_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(aliquota, field, value)

    db.commit()
    db.refresh(aliquota)
    return ipva_aliquota_to_dict(aliquota)


@router.delete("/{aliquota_id}", summary="Deletar alíquota IPVA")
async def delete_ipva_aliquota(
    aliquota_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    aliquota = db.query(IpvaAliquota).filter(IpvaAliquota.id == aliquota_id).first()
    if not aliquota:
        raise HTTPException(status_code=404, detail="Alíquota IPVA não encontrada")

    db.delete(aliquota)
    db.commit()
    return {"message": "Alíquota IPVA deletada com sucesso", "success": True}


@router.get("/calcular/ipva", summary="Calcular IPVA")
async def calcular_ipva(
    estado: str = Query(...),
    tipo_veiculo: str = Query(...),
    valor_venal: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Calcula o valor do IPVA baseado na alíquota, tipo de veículo e valor venal.

    Parameters:
    - estado: estado (ex: SP, MG, RJ)
    - tipo_veiculo: tipo de veículo (ex: Automóvel, Moto, Caminhão)
    - valor_venal: valor venal do veículo
    """
    aliquota = db.query(IpvaAliquota).filter(
        IpvaAliquota.estado == estado.upper(),
        IpvaAliquota.tipo_veiculo == tipo_veiculo
    ).first()

    if not aliquota:
        raise HTTPException(
            status_code=404,
            detail=f"Alíquota não encontrada para {estado} - {tipo_veiculo}"
        )

    valor_ipva = valor_venal * (aliquota.aliquota / 100)

    return {
        "estado": estado.upper(),
        "tipo_veiculo": tipo_veiculo,
        "valor_venal": valor_venal,
        "aliquota_percentual": aliquota.aliquota,
        "valor_ipva": round(valor_ipva, 2),
    }

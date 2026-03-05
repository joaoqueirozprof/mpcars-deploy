from typing import Optional
from datetime import date
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Manutencao, Veiculo

router = APIRouter()


class ManutencaoCreate(BaseModel):
    veiculo_id: int
    tipo: str = "Preventiva"
    descricao: str
    km_realizada: Optional[float] = None
    km_proxima: Optional[float] = None
    km_manutencao: Optional[float] = None
    data_realizada: Optional[date] = None
    data_manutencao: Optional[date] = None
    data_proxima: Optional[date] = None
    custo: Optional[float] = 0
    valor: Optional[float] = None
    oficina: Optional[str] = None
    status: str = "Agendada"
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_alternative_fields(cls, data):
        if isinstance(data, dict):
            if data.get('km_realizada') is None and data.get('km_manutencao') is not None:
                data['km_realizada'] = data['km_manutencao']
            if not data.get('data_realizada') and data.get('data_manutencao'):
                data['data_realizada'] = data['data_manutencao']
            if (data.get('custo') is None or data.get('custo') == 0) and data.get('valor') is not None:
                data['custo'] = data['valor']
        return data


class ManutencaoUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    km_realizada: Optional[float] = None
    km_proxima: Optional[float] = None
    data_realizada: Optional[date] = None
    data_proxima: Optional[date] = None
    custo: Optional[float] = None
    oficina: Optional[str] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None


def manutencao_to_dict(m):
    return {
        "id": m.id,
        "veiculo_id": m.veiculo_id,
        "tipo": m.tipo,
        "descricao": m.descricao,
        "km_realizada": m.km_realizada,
        "km_proxima": m.km_proxima,
        "data_realizada": m.data_realizada.isoformat() if m.data_realizada else None,
        "data_proxima": m.data_proxima.isoformat() if m.data_proxima else None,
        "custo": m.custo,
        "valor": m.custo,
        "oficina": m.oficina,
        "status": m.status,
        "observacoes": m.observacoes,
        "data_cadastro": m.data_cadastro.isoformat() if m.data_cadastro else None,
    }


@router.get("/", summary="Listar manutenções")
async def list_manutencoes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    veiculo_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(Manutencao)
    if veiculo_id:
        query = query.filter(Manutencao.veiculo_id == veiculo_id)
    if status_filter:
        query = query.filter(Manutencao.status == status_filter)
    if tipo:
        query = query.filter(Manutencao.tipo == tipo)

    total = query.count()
    manutencoes = query.offset(skip).limit(limit).all()

    return {
        "items": [manutencao_to_dict(m) for m in manutencoes],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{manutencao_id}", summary="Obter manutenção por ID")
async def get_manutencao(
    manutencao_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()
    if not manutencao:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")
    return manutencao_to_dict(manutencao)


@router.post("/", summary="Criar nova manutenção")
async def create_manutencao(
    manutencao_data: ManutencaoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == manutencao_data.veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    data = manutencao_data.model_dump()
    data.pop("km_manutencao", None)
    data.pop("data_manutencao", None)
    data.pop("valor", None)

    try:
        nova_manutencao = Manutencao(**data)
        db.add(nova_manutencao)
        db.commit()
        db.refresh(nova_manutencao)
        return manutencao_to_dict(nova_manutencao)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar manutenção: {str(e)}")


@router.put("/{manutencao_id}", summary="Atualizar manutenção")
async def update_manutencao(
    manutencao_id: int,
    manutencao_data: ManutencaoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()
    if not manutencao:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")

    update_data = manutencao_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(manutencao, field, value)

    db.commit()
    db.refresh(manutencao)
    return manutencao_to_dict(manutencao)


@router.delete("/{manutencao_id}", summary="Deletar manutenção")
async def delete_manutencao(
    manutencao_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()
    if not manutencao:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada")

    db.delete(manutencao)
    db.commit()
    return {"message": "Manutenção deletada com sucesso", "success": True}

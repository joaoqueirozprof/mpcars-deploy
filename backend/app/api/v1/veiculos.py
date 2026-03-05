from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Veiculo
from app.schemas.veiculo import VeiculoCreate, VeiculoUpdate, VeiculoStatusUpdate

router = APIRouter()


def veiculo_to_dict(v):
    """Convert Veiculo ORM object to dict for JSON serialization."""
    return {
        "id": v.id,
        "marca": v.marca,
        "modelo": v.modelo,
        "placa": v.placa,
        "ano": v.ano,
        "cor": v.cor,
        "combustivel": v.combustivel,
        "empresa_id": v.empresa_id,
        "km_atual": v.km_atual,
        "preco_compra": v.preco_compra,
        "data_compra": v.data_compra.isoformat() if v.data_compra else None,
        "status": v.status,
        "tipo_veiculo": v.tipo_veiculo,
        "chassi": v.chassi,
        "renavam": v.renavam,
        "valor_venal": v.valor_venal,
        "km_referencia": v.km_referencia,
        "valor_km_extra": v.valor_km_extra,
        "km_inicio_empresa": v.km_inicio_empresa,
        "macaco": v.macaco,
        "estepe": v.estepe,
        "ferram": v.ferram,
        "triangulo": v.triangulo,
        "documento": v.documento,
        "extintor": v.extintor,
        "calotas": v.calotas,
        "tapetes": v.tapetes,
        "cd_player": v.cd_player,
        "observacoes": v.observacoes,
        "data_cadastro": v.data_cadastro.isoformat() if v.data_cadastro else None,
    }


@router.get("/", summary="Listar veículos")
async def list_veiculos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all veículos with optional filters."""
    query = db.query(Veiculo)

    if status_filter:
        query = query.filter(Veiculo.status == status_filter)
    if empresa_id:
        query = query.filter(Veiculo.empresa_id == empresa_id)

    total = query.count()
    veiculos = query.offset(skip).limit(limit).all()

    return {
        "items": [veiculo_to_dict(v) for v in veiculos],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{veiculo_id}", summary="Obter veículo por ID")
async def get_veiculo(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return veiculo_to_dict(veiculo)


@router.post("/", summary="Criar novo veículo")
async def create_veiculo(
    veiculo_data: VeiculoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    existing_placa = db.query(Veiculo).filter(Veiculo.placa == veiculo_data.placa).first()
    if existing_placa:
        raise HTTPException(status_code=400, detail="Placa já cadastrada")

    data = veiculo_data.model_dump()
    # Convert empty strings to None for unique fields
    if data.get("chassi") is not None and str(data["chassi"]).strip() == "":
        data["chassi"] = None
    if data.get("renavam") is not None and str(data["renavam"]).strip() == "":
        data["renavam"] = None

    try:
        novo_veiculo = Veiculo(**data)
        db.add(novo_veiculo)
        db.commit()
        db.refresh(novo_veiculo)
        return veiculo_to_dict(novo_veiculo)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar veículo: {str(e)}")


@router.put("/{veiculo_id}", summary="Atualizar veículo")
async def update_veiculo(
    veiculo_id: int,
    veiculo_data: VeiculoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    if veiculo_data.placa and veiculo_data.placa != veiculo.placa:
        existing_placa = db.query(Veiculo).filter(Veiculo.placa == veiculo_data.placa).first()
        if existing_placa:
            raise HTTPException(status_code=400, detail="Placa já cadastrada")

    update_data = veiculo_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(veiculo, field, value)

    db.commit()
    db.refresh(veiculo)
    return veiculo_to_dict(veiculo)


@router.delete("/{veiculo_id}", summary="Deletar veículo")
async def delete_veiculo(
    veiculo_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    db.delete(veiculo)
    db.commit()
    return {"message": "Veículo deletado com sucesso", "success": True}


@router.get("/placa/{placa}", summary="Buscar veículo por placa")
async def search_veiculo_by_placa(
    placa: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.placa.ilike(placa)).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return veiculo_to_dict(veiculo)


@router.patch("/{veiculo_id}/status", summary="Atualizar status do veículo")
async def update_veiculo_status(
    veiculo_id: int,
    status_data: VeiculoStatusUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    veiculo.status = status_data.status
    db.commit()
    db.refresh(veiculo)
    return veiculo_to_dict(veiculo)

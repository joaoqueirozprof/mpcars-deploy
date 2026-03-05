from typing import Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Contrato, Veiculo, Cliente
from app.schemas.contrato import ContratoCreate, ContratoUpdate, ContratoFinalizarRequest

router = APIRouter()


def contrato_to_dict(c):
    """Convert Contrato ORM to dict for JSON serialization."""
    return {
        "id": c.id,
        "cliente_id": c.cliente_id,
        "veiculo_id": c.veiculo_id,
        "empresa_id": c.empresa_id,
        "motorista_id": c.motorista_id,
        "tipo_locacao": c.tipo_locacao,
        "data_saida": c.data_saida.isoformat() if c.data_saida else None,
        "hora_saida": c.hora_saida.isoformat() if c.hora_saida else None,
        "data_entrada": c.data_entrada.isoformat() if c.data_entrada else None,
        "hora_entrada": c.hora_entrada.isoformat() if c.hora_entrada else None,
        "data_prevista_devolucao": c.data_prevista_devolucao.isoformat() if c.data_prevista_devolucao else None,
        "km_saida": c.km_saida,
        "km_entrada": c.km_entrada,
        "km_livres_dia": c.km_livres_dia,
        "km_percorridos": c.km_percorridos,
        "quantidade_diarias": c.quantidade_diarias,
        "valor_diaria": c.valor_diaria,
        "valor_hora_extra": c.valor_hora_extra,
        "valor_km_excedente": c.valor_km_excedente,
        "subtotal": c.subtotal,
        "avarias": c.avarias,
        "desconto": c.desconto,
        "total": c.total,
        "despesas_extras": c.despesas_extras,
        "status": c.status,
        "observacoes": c.observacoes,
        "data_cadastro": c.data_cadastro.isoformat() if c.data_cadastro else None,
    }


@router.get("/", summary="Listar contratos")
async def list_contratos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    cliente_id: Optional[int] = Query(None),
    veiculo_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all contratos with optional filters."""
    query = db.query(Contrato)

    if status_filter and status_filter != "Todos":
        query = query.filter(Contrato.status == status_filter)
    if cliente_id:
        query = query.filter(Contrato.cliente_id == cliente_id)
    if veiculo_id:
        query = query.filter(Contrato.veiculo_id == veiculo_id)

    total = query.count()
    contratos = query.order_by(Contrato.id.desc()).offset(skip).limit(limit).all()

    return {
        "items": [contrato_to_dict(c) for c in contratos],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{contrato_id}", summary="Obter contrato por ID")
async def get_contrato(
    contrato_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    result = contrato_to_dict(contrato)
    # Add related data
    try:
        if contrato.cliente:
            result["cliente_nome"] = contrato.cliente.nome
        if contrato.veiculo:
            result["veiculo_placa"] = contrato.veiculo.placa
            result["veiculo_modelo"] = contrato.veiculo.modelo
    except Exception:
        pass

    return result


@router.post("/", summary="Criar novo contrato")
async def create_contrato(
    contrato_data: ContratoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    veiculo = db.query(Veiculo).filter(Veiculo.id == contrato_data.veiculo_id).first()
    if not veiculo:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    if veiculo.status != "Disponível":
        raise HTTPException(status_code=400, detail=f"Veículo não disponível. Status: {veiculo.status}")

    # Build data dict from schema, removing fields not in the model
    data = contrato_data.model_dump()

    # Remove valor_caucao - not a field on the Contrato model
    data.pop("valor_caucao", None)

    # data_entrada from frontend = planned return date → use as data_prevista_devolucao
    if not data.get("data_prevista_devolucao") and data.get("data_entrada"):
        data["data_prevista_devolucao"] = data["data_entrada"]
    # If still no data_prevista_devolucao, default to data_saida + quantidade_diarias
    if not data.get("data_prevista_devolucao"):
        dias = data.get("quantidade_diarias", 1) or 1
        data["data_prevista_devolucao"] = data["data_saida"] + timedelta(days=dias)

    # Clear data_entrada for new contracts (it's set when finalized)
    data["data_entrada"] = None

    # Get km_saida from vehicle if not provided
    if not data.get("km_saida") or data["km_saida"] == 0:
        data["km_saida"] = float(veiculo.km_atual or 0)

    # Auto-calculate subtotal and total if not provided
    valor_diaria = float(data.get("valor_diaria", 0) or 0)
    quantidade = int(data.get("quantidade_diarias", 1) or 1)
    if not data.get("subtotal") or data["subtotal"] == 0:
        data["subtotal"] = valor_diaria * quantidade
    if not data.get("total") or data["total"] == 0:
        subtotal = data["subtotal"]
        avarias = float(data.get("avarias", 0) or 0)
        desconto = float(data.get("desconto", 0) or 0)
        despesas = float(data.get("despesas_extras", 0) or 0)
        data["total"] = subtotal + avarias + despesas - desconto

    novo_contrato = Contrato(**data)
    db.add(novo_contrato)
    veiculo.status = "Alugado"
    db.commit()
    db.refresh(novo_contrato)
    return contrato_to_dict(novo_contrato)


@router.put("/{contrato_id}", summary="Atualizar contrato")
async def update_contrato(
    contrato_id: int,
    contrato_data: ContratoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    update_data = contrato_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(contrato, field):
            setattr(contrato, field, value)

    db.commit()
    db.refresh(contrato)
    return contrato_to_dict(contrato)


@router.post("/{contrato_id}/finalizar", summary="Finalizar contrato")
async def finalize_contrato(
    contrato_id: int,
    finalize_data: ContratoFinalizarRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    contrato.km_entrada = finalize_data.km_entrada
    if finalize_data.data_entrada:
        contrato.data_entrada = finalize_data.data_entrada
    else:
        contrato.data_entrada = date.today()
    if finalize_data.observacoes:
        contrato.observacoes = finalize_data.observacoes
    contrato.status = "Finalizado"

    # Calculate km_percorridos
    if contrato.km_saida and contrato.km_entrada:
        contrato.km_percorridos = contrato.km_entrada - contrato.km_saida

    # Set vehicle back to available
    veiculo = db.query(Veiculo).filter(Veiculo.id == contrato.veiculo_id).first()
    if veiculo:
        veiculo.status = "Disponível"
        veiculo.km_atual = finalize_data.km_entrada

    db.commit()
    db.refresh(contrato)
    return contrato_to_dict(contrato)


@router.post("/{contrato_id}/finalize", summary="Finalizar contrato (alias)")
async def finalize_contrato_alias(
    contrato_id: int,
    finalize_data: ContratoFinalizarRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    return await finalize_contrato(contrato_id, finalize_data, db, current_user)


@router.delete("/{contrato_id}", summary="Deletar contrato")
async def delete_contrato(
    contrato_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    # If active, set vehicle back to available
    if contrato.status == "Ativo":
        veiculo = db.query(Veiculo).filter(Veiculo.id == contrato.veiculo_id).first()
        if veiculo:
            veiculo.status = "Disponível"

    db.delete(contrato)
    db.commit()
    return {"message": "Contrato deletado com sucesso", "success": True}

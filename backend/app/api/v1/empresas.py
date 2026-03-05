from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Empresa
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate

router = APIRouter()


def empresa_to_dict(e):
    """Convert Empresa ORM object to dict for JSON serialization."""
    return {
        "id": e.id,
        "nome": e.nome,
        "razao_social": e.razao_social,
        "cnpj": e.cnpj,
        "endereco": e.endereco,
        "numero": e.numero,
        "bairro": e.bairro,
        "cidade": e.cidade,
        "estado": e.estado,
        "cep": e.cep,
        "telefone": e.telefone,
        "email": e.email,
        "responsavel": e.responsavel,
        "ativa": e.ativa,
        "valor_km_extra_padrao": e.valor_km_extra_padrao,
        "observacoes": e.observacoes,
        "data_cadastro": e.data_cadastro.isoformat() if e.data_cadastro else None,
    }


@router.get("/", summary="Listar empresas")
async def list_empresas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    ativa: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all empresas with optional filters."""
    query = db.query(Empresa)

    if ativa is not None:
        query = query.filter(Empresa.ativa == ativa)

    if search:
        query = query.filter(
            (Empresa.nome.ilike(f"%{search}%")) |
            (Empresa.cnpj.ilike(f"%{search}%"))
        )

    total = query.count()
    empresas = query.offset(skip).limit(limit).all()

    return {
        "items": [empresa_to_dict(e) for e in empresas],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{empresa_id}", summary="Obter empresa por ID")
async def get_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return empresa_to_dict(empresa)


@router.post("/", summary="Criar nova empresa")
async def create_empresa(
    empresa_data: EmpresaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    existing = db.query(Empresa).filter(Empresa.cnpj == empresa_data.cnpj).first()
    if existing:
        raise HTTPException(status_code=400, detail="CNPJ já cadastrado")

    nova_empresa = Empresa(**empresa_data.model_dump())
    db.add(nova_empresa)
    db.commit()
    db.refresh(nova_empresa)
    return empresa_to_dict(nova_empresa)


@router.put("/{empresa_id}", summary="Atualizar empresa")
async def update_empresa(
    empresa_id: int,
    empresa_data: EmpresaUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    if empresa_data.cnpj and empresa_data.cnpj != empresa.cnpj:
        existing = db.query(Empresa).filter(Empresa.cnpj == empresa_data.cnpj).first()
        if existing:
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado")

    update_data = empresa_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(empresa, field, value)

    db.commit()
    db.refresh(empresa)
    return empresa_to_dict(empresa)


@router.delete("/{empresa_id}", summary="Deletar empresa")
async def delete_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    db.delete(empresa)
    db.commit()
    return {"message": "Empresa deletada com sucesso", "success": True}

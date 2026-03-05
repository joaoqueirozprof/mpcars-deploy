"""
Document management endpoints for MPCARS.
"""
from typing import Optional
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import Documento

router = APIRouter()


class DocumentoCreate(BaseModel):
    tipo_entidade: str
    entidade_id: int
    nome_arquivo: str
    nome_original: str
    tipo_documento: str
    caminho: str
    tamanho: int
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def validate_data(cls, data):
        if isinstance(data, dict):
            if not data.get('nome_arquivo'):
                raise ValueError("Nome do arquivo é obrigatório")
            if not data.get('tipo_entidade'):
                raise ValueError("Tipo de entidade é obrigatório")
            if not data.get('entidade_id') or data.get('entidade_id') <= 0:
                raise ValueError("ID da entidade deve ser válido")
        return data


class DocumentoUpdate(BaseModel):
    observacoes: Optional[str] = None


def documento_to_dict(d):
    return {
        "id": d.id,
        "tipo_entidade": d.tipo_entidade,
        "entidade_id": d.entidade_id,
        "nome_arquivo": d.nome_arquivo,
        "nome_original": d.nome_original,
        "tipo_documento": d.tipo_documento,
        "caminho": d.caminho,
        "tamanho": d.tamanho,
        "observacoes": d.observacoes,
        "data_upload": d.data_upload.isoformat() if d.data_upload else None,
    }


@router.get("/", summary="Listar documentos")
async def list_documentos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tipo_entidade: Optional[str] = Query(None),
    entidade_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(Documento)
    if tipo_entidade:
        query = query.filter(Documento.tipo_entidade == tipo_entidade)
    if entidade_id:
        query = query.filter(Documento.entidade_id == entidade_id)

    total = query.count()
    documentos = query.offset(skip).limit(limit).all()

    return {
        "items": [documento_to_dict(d) for d in documentos],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{documento_id}", summary="Obter documento por ID")
async def get_documento(
    documento_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    documento = db.query(Documento).filter(Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return documento_to_dict(documento)


@router.post("/", summary="Criar registro de documento")
async def create_documento(
    documento_data: DocumentoCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Cria um registro de documento no sistema (apenas metadados, sem upload de arquivo).
    A responsabilidade do upload é da aplicação cliente.
    """
    try:
        novo_documento = Documento(**documento_data.model_dump())
        db.add(novo_documento)
        db.commit()
        db.refresh(novo_documento)
        return documento_to_dict(novo_documento)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar documento: {str(e)}")


@router.put("/{documento_id}", summary="Atualizar documento")
async def update_documento(
    documento_id: int,
    documento_data: DocumentoUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    documento = db.query(Documento).filter(Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    update_data = documento_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(documento, field, value)

    db.commit()
    db.refresh(documento)
    return documento_to_dict(documento)


@router.delete("/{documento_id}", summary="Deletar documento")
async def delete_documento(
    documento_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    documento = db.query(Documento).filter(Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    db.delete(documento)
    db.commit()
    return {"message": "Documento deletado com sucesso", "success": True}

"""
System configuration endpoints for MPCARS.
Uses the 'configuracoes' table (key-value store).
"""
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models.auditoria import Configuracao

router = APIRouter()


class ConfigUpdate(BaseModel):
    valor: str


@router.get("/", summary="Listar todas as configurações")
async def list_configuracoes(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """List all configuration key-value pairs from the database."""
    configs = db.query(Configuracao).all()
    result = {}
    for c in configs:
        result[c.chave] = c.valor
    return result


@router.get("/{chave}", summary="Obter configuração por chave")
async def get_configuracao(
    chave: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get a specific configuration by key."""
    config = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração '{chave}' não encontrada"
        )
    return {
        "id": config.id,
        "chave": config.chave,
        "valor": config.valor,
    }


@router.put("/{chave}", summary="Atualizar configuração")
async def update_configuracao(
    chave: str,
    data: ConfigUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """Update a specific configuration by key. Creates if not exists."""
    config = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if config:
        config.valor = data.valor
    else:
        config = Configuracao(chave=chave, valor=data.valor)
        db.add(config)

    db.commit()
    db.refresh(config)
    return {
        "id": config.id,
        "chave": config.chave,
        "valor": config.valor,
        "mensagem": f"Configuração '{chave}' atualizada com sucesso"
    }


@router.delete("/{chave}", summary="Deletar configuração")
async def delete_configuracao(
    chave: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """Delete a specific configuration by key."""
    config = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração '{chave}' não encontrada"
        )
    db.delete(config)
    db.commit()
    return {"message": f"Configuração '{chave}' deletada com sucesso", "success": True}

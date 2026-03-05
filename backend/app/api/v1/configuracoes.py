from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.schemas.common import MessageResponse

router = APIRouter()


@router.get("/", summary="Listar todas as configurações")
async def list_configuracoes(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List all application settings/configurations.

    Args:
        db: Database session
        current_user: Current authenticated user

    Returns:
        Dictionary with all configuration settings
    """
    # Placeholder configurations
    configuracoes = {
        "taxa_imposto": 0.08,
        "dias_minimos_aluguel": 1,
        "dias_maximos_aluguel": 365,
        "politica_cancelamento": "Cancelamento gratuito até 24 horas antes",
        "moeda": "BRL",
        "email_notificacoes": True,
        "limite_credito_cliente": 5000.00
    }

    return configuracoes


@router.get("/{chave}", summary="Obter configuração por chave")
async def get_configuracao(
    chave: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get a specific configuration by key.

    Args:
        chave: Configuration key
        db: Database session
        current_user: Current authenticated user

    Returns:
        Configuration value

    Raises:
        HTTPException: If configuration key not found
    """
    # Placeholder configurations map
    configuracoes = {
        "taxa_imposto": 0.08,
        "dias_minimos_aluguel": 1,
        "dias_maximos_aluguel": 365,
        "politica_cancelamento": "Cancelamento gratuito até 24 horas antes",
        "moeda": "BRL",
        "email_notificacoes": True,
        "limite_credito_cliente": 5000.00
    }

    if chave not in configuracoes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração '{chave}' não encontrada"
        )

    return {
        "chave": chave,
        "valor": configuracoes[chave]
    }


@router.put("/{chave}", summary="Atualizar configuração")
async def update_configuracao(
    chave: str,
    valor: Any,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update a specific configuration by key.

    Args:
        chave: Configuration key
        valor: New configuration value
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated configuration

    Raises:
        HTTPException: If configuration key not found
    """
    # Placeholder configurations map - in production would interact with database
    valid_keys = [
        "taxa_imposto",
        "dias_minimos_aluguel",
        "dias_maximos_aluguel",
        "politica_cancelamento",
        "moeda",
        "email_notificacoes",
        "limite_credito_cliente"
    ]

    if chave not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração '{chave}' não encontrada"
        )

    # In production, would save to database
    return {
        "chave": chave,
        "valor": valor,
        "mensagem": f"Configuração '{chave}' atualizada com sucesso"
    }

"""
Audit Log read-only endpoints for MPCARS.
"""
from typing import Optional
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import AuditLog

router = APIRouter()


def audit_log_to_dict(a):
    return {
        "id": a.id,
        "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        "acao": a.acao,
        "tabela": a.tabela,
        "registro_id": a.registro_id,
        "dados_anteriores": a.dados_anteriores,
        "dados_novos": a.dados_novos,
        "usuario": a.usuario,
        "ip_address": a.ip_address,
        "detalhes": a.detalhes,
    }


@router.get("/", summary="Listar logs de auditoria")
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    acao: Optional[str] = Query(None),
    tabela: Optional[str] = Query(None),
    usuario: Optional[str] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Lista logs de auditoria com suporte a filtros.

    Parameters:
    - acao: tipo de ação ('CREATE', 'UPDATE', 'DELETE')
    - tabela: nome da tabela afetada
    - usuario: usuário que realizou a ação
    - data_inicio: data inicial do filtro (inclusive)
    - data_fim: data final do filtro (inclusive)
    """
    query = db.query(AuditLog)

    if acao:
        query = query.filter(AuditLog.acao == acao)
    if tabela:
        query = query.filter(AuditLog.tabela == tabela)
    if usuario:
        query = query.filter(AuditLog.usuario == usuario)
    if data_inicio:
        from datetime import datetime
        query = query.filter(AuditLog.timestamp >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        from datetime import datetime
        query = query.filter(AuditLog.timestamp <= datetime.combine(data_fim, datetime.max.time()))

    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    return {
        "items": [audit_log_to_dict(log) for log in logs],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{log_id}", summary="Obter log de auditoria por ID")
async def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log de auditoria não encontrado")
    return audit_log_to_dict(log)


@router.get("/stats/acoes", summary="Obter estatísticas de ações")
async def get_action_stats(
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retorna estatísticas de ações executadas agrupadas por tipo.

    Parameters:
    - data_inicio: data inicial do filtro (opcional)
    - data_fim: data final do filtro (opcional)
    """
    query = db.query(AuditLog)

    if data_inicio:
        from datetime import datetime
        query = query.filter(AuditLog.timestamp >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        from datetime import datetime
        query = query.filter(AuditLog.timestamp <= datetime.combine(data_fim, datetime.max.time()))

    stats = db.query(
        AuditLog.acao,
        func.count(AuditLog.id).label('quantidade')
    ).filter(query.statement.whereclause).group_by(AuditLog.acao).all()

    return {
        "stats": [
            {
                "acao": stat[0],
                "quantidade": stat[1]
            } for stat in stats
        ],
        "total": sum(stat[1] for stat in stats)
    }


@router.get("/stats/tabelas", summary="Obter estatísticas por tabela")
async def get_table_stats(
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retorna estatísticas de alterações agrupadas por tabela.

    Parameters:
    - data_inicio: data inicial do filtro (opcional)
    - data_fim: data final do filtro (opcional)
    """
    query = db.query(AuditLog)

    if data_inicio:
        from datetime import datetime
        query = query.filter(AuditLog.timestamp >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        from datetime import datetime
        query = query.filter(AuditLog.timestamp <= datetime.combine(data_fim, datetime.max.time()))

    stats = db.query(
        AuditLog.tabela,
        AuditLog.acao,
        func.count(AuditLog.id).label('quantidade')
    ).filter(query.statement.whereclause).group_by(AuditLog.tabela, AuditLog.acao).all()

    tabelas = {}
    for stat in stats:
        tabela = stat[0]
        acao = stat[1]
        quantidade = stat[2]

        if tabela not in tabelas:
            tabelas[tabela] = {}

        tabelas[tabela][acao] = quantidade

    return {
        "stats": [
            {
                "tabela": tabela,
                "acoes": acoes
            } for tabela, acoes in tabelas.items()
        ],
        "total_registros": sum(
            sum(acoes.values()) for acoes in tabelas.values()
        )
    }


@router.get("/stats/usuarios", summary="Obter estatísticas por usuário")
async def get_user_stats(
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retorna estatísticas de ações agrupadas por usuário.

    Parameters:
    - data_inicio: data inicial do filtro (opcional)
    - data_fim: data final do filtro (opcional)
    """
    query = db.query(AuditLog)

    if data_inicio:
        from datetime import datetime
        query = query.filter(AuditLog.timestamp >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        from datetime import datetime
        query = query.filter(AuditLog.timestamp <= datetime.combine(data_fim, datetime.max.time()))

    stats = db.query(
        AuditLog.usuario,
        func.count(AuditLog.id).label('quantidade')
    ).filter(query.statement.whereclause).group_by(AuditLog.usuario).all()

    return {
        "stats": [
            {
                "usuario": stat[0],
                "quantidade": stat[1]
            } for stat in stats
        ],
        "total": sum(stat[1] for stat in stats)
    }

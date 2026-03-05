"""
Alert management endpoints for MPCARS.
"""
from typing import Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import (
    AlertaHistorico, Cliente, Contrato, Seguro, IpvaRegistro, Manutencao
)

router = APIRouter()


class AlertaCreate(BaseModel):
    tipo_alerta: str
    urgencia: str = "info"
    entidade_tipo: str
    entidade_id: int
    titulo: str
    descricao: str
    observacoes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def validate_data(cls, data):
        if isinstance(data, dict):
            if not data.get('tipo_alerta'):
                raise ValueError("Tipo de alerta é obrigatório")
            if not data.get('titulo'):
                raise ValueError("Título é obrigatório")
            if not data.get('descricao'):
                raise ValueError("Descrição é obrigatória")
            urgencias_validas = ["info", "warning", "error", "critical"]
            if data.get('urgencia') not in urgencias_validas:
                raise ValueError(f"Urgência deve ser uma de: {', '.join(urgencias_validas)}")
        return data


class AlertaResolverRequest(BaseModel):
    resolvido_por: Optional[str] = None
    acao_tomada: Optional[str] = None


def alerta_to_dict(a):
    return {
        "id": a.id,
        "tipo_alerta": a.tipo_alerta,
        "urgencia": a.urgencia,
        "entidade_tipo": a.entidade_tipo,
        "entidade_id": a.entidade_id,
        "titulo": a.titulo,
        "descricao": a.descricao,
        "data_criacao": a.data_criacao.isoformat() if a.data_criacao else None,
        "data_resolucao": a.data_resolucao.isoformat() if a.data_resolucao else None,
        "resolvido": a.resolvido,
        "resolvido_por": a.resolvido_por,
        "acao_tomada": a.acao_tomada,
        "observacoes": a.observacoes,
    }


@router.get("/", summary="Listar alertas")
async def list_alertas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tipo: Optional[str] = Query(None),
    urgencia: Optional[str] = Query(None),
    resolvido: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = db.query(AlertaHistorico)

    if tipo:
        query = query.filter(AlertaHistorico.tipo_alerta == tipo)
    if urgencia:
        query = query.filter(AlertaHistorico.urgencia == urgencia)
    if resolvido is not None:
        query = query.filter(AlertaHistorico.resolvido == resolvido)

    total = query.count()
    alertas = query.order_by(AlertaHistorico.data_criacao.desc()).offset(skip).limit(limit).all()

    return {
        "items": [alerta_to_dict(a) for a in alertas],
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
    }


@router.get("/{alerta_id}", summary="Obter alerta por ID")
async def get_alerta(
    alerta_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    alerta = db.query(AlertaHistorico).filter(AlertaHistorico.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    return alerta_to_dict(alerta)


@router.post("/", summary="Criar novo alerta")
async def create_alerta(
    alerta_data: AlertaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    try:
        novo_alerta = AlertaHistorico(**alerta_data.model_dump())
        db.add(novo_alerta)
        db.commit()
        db.refresh(novo_alerta)
        return alerta_to_dict(novo_alerta)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar alerta: {str(e)}")


@router.put("/{alerta_id}/resolver", summary="Marcar alerta como resolvido")
async def resolver_alerta(
    alerta_id: int,
    resolver_data: AlertaResolverRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    alerta = db.query(AlertaHistorico).filter(AlertaHistorico.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")

    alerta.resolvido = True
    alerta.data_resolucao = datetime.now()
    alerta.resolvido_por = resolver_data.resolvido_por or current_user.username
    alerta.acao_tomada = resolver_data.acao_tomada

    db.commit()
    db.refresh(alerta)
    return alerta_to_dict(alerta)


@router.get("/gerar/alertas", summary="Gerar alertas automáticos")
async def gerar_alertas(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Gera alertas automáticos verificando:
    - CNH expirando ou expirada (próximos 30 dias)
    - Contratos em atraso
    - Seguro expirando ou expirado (próximos 30 dias)
    - IPVA expirando ou expirado (próximos 30 dias e status Pendente)
    - Manutenções agendadas com data_proxima no passado
    """
    hoje = date.today()
    alertas_criados = []

    try:
        # 1. Check CNH expiring or expired (próximos 30 dias)
        clientes_cnh = db.query(Cliente).filter(
            Cliente.cnh_validade.isnot(None),
            Cliente.cnh_validade <= hoje + timedelta(days=30),
            Cliente.cnh_validade >= hoje - timedelta(days=30)  # Ainda dentro da janela
        ).all()

        for cliente in clientes_cnh:
            dias_restantes = (cliente.cnh_validade - hoje).days
            tipo_urgencia = "critical" if dias_restantes <= 0 else "warning" if dias_restantes <= 7 else "info"

            existe = db.query(AlertaHistorico).filter(
                AlertaHistorico.tipo_alerta == "CNH_EXPIRANDO",
                AlertaHistorico.entidade_tipo == "Cliente",
                AlertaHistorico.entidade_id == cliente.id,
                AlertaHistorico.resolvido == False
            ).first()

            if not existe:
                alerta = AlertaHistorico(
                    tipo_alerta="CNH_EXPIRANDO",
                    urgencia=tipo_urgencia,
                    entidade_tipo="Cliente",
                    entidade_id=cliente.id,
                    titulo=f"CNH de {cliente.nome} expirando",
                    descricao=f"A CNH do cliente {cliente.nome} ({cliente.cpf_cnpj}) "
                              f"vence em {cliente.cnh_validade.strftime('%d/%m/%Y')}. "
                              f"Dias restantes: {dias_restantes}",
                )
                db.add(alerta)
                alertas_criados.append("CNH_EXPIRANDO")

        # 2. Check contratos em atraso
        contratos_atrasados = db.query(Contrato).filter(
            Contrato.status == "Ativo",
            Contrato.data_prevista_devolucao < hoje
        ).all()

        for contrato in contratos_atrasados:
            dias_atraso = (hoje - contrato.data_prevista_devolucao).days

            existe = db.query(AlertaHistorico).filter(
                AlertaHistorico.tipo_alerta == "CONTRATO_ATRASADO",
                AlertaHistorico.entidade_tipo == "Contrato",
                AlertaHistorico.entidade_id == contrato.id,
                AlertaHistorico.resolvido == False
            ).first()

            if not existe:
                tipo_urgencia = "critical" if dias_atraso > 7 else "warning"
                alerta = AlertaHistorico(
                    tipo_alerta="CONTRATO_ATRASADO",
                    urgencia=tipo_urgencia,
                    entidade_tipo="Contrato",
                    entidade_id=contrato.id,
                    titulo=f"Contrato #{contrato.id} em atraso",
                    descricao=f"Contrato #{contrato.id} está {dias_atraso} dias em atraso. "
                              f"Data prevista de devolução: {contrato.data_prevista_devolucao.strftime('%d/%m/%Y')}",
                )
                db.add(alerta)
                alertas_criados.append("CONTRATO_ATRASADO")

        # 3. Check seguros expirando ou expirados (próximos 30 dias)
        seguros_vencimento = db.query(Seguro).filter(
            Seguro.data_vencimento <= hoje + timedelta(days=30),
            Seguro.data_vencimento >= hoje - timedelta(days=30)
        ).all()

        for seguro in seguros_vencimento:
            dias_restantes = (seguro.data_vencimento - hoje).days
            tipo_urgencia = "critical" if dias_restantes <= 0 else "warning" if dias_restantes <= 7 else "info"

            existe = db.query(AlertaHistorico).filter(
                AlertaHistorico.tipo_alerta == "SEGURO_EXPIRANDO",
                AlertaHistorico.entidade_tipo == "Seguro",
                AlertaHistorico.entidade_id == seguro.id,
                AlertaHistorico.resolvido == False
            ).first()

            if not existe:
                alerta = AlertaHistorico(
                    tipo_alerta="SEGURO_EXPIRANDO",
                    urgencia=tipo_urgencia,
                    entidade_tipo="Seguro",
                    entidade_id=seguro.id,
                    titulo=f"Seguro #{seguro.id} expirando",
                    descricao=f"Seguro #{seguro.id} (Apólice: {seguro.numero_apolice}) "
                              f"vence em {seguro.data_vencimento.strftime('%d/%m/%Y')}. "
                              f"Dias restantes: {dias_restantes}",
                )
                db.add(alerta)
                alertas_criados.append("SEGURO_EXPIRANDO")

        # 4. Check IPVA expirando ou expirado (próximos 30 dias, status Pendente)
        ipva_vencimento = db.query(IpvaRegistro).filter(
            IpvaRegistro.status == "Pendente",
            IpvaRegistro.data_vencimento <= hoje + timedelta(days=30),
            IpvaRegistro.data_vencimento >= hoje - timedelta(days=30)
        ).all()

        for ipva in ipva_vencimento:
            dias_restantes = (ipva.data_vencimento - hoje).days
            tipo_urgencia = "critical" if dias_restantes <= 0 else "warning" if dias_restantes <= 7 else "info"

            existe = db.query(AlertaHistorico).filter(
                AlertaHistorico.tipo_alerta == "IPVA_EXPIRANDO",
                AlertaHistorico.entidade_tipo == "IpvaRegistro",
                AlertaHistorico.entidade_id == ipva.id,
                AlertaHistorico.resolvido == False
            ).first()

            if not existe:
                alerta = AlertaHistorico(
                    tipo_alerta="IPVA_EXPIRANDO",
                    urgencia=tipo_urgencia,
                    entidade_tipo="IpvaRegistro",
                    entidade_id=ipva.id,
                    titulo=f"IPVA ano {ipva.ano_referencia} expirando",
                    descricao=f"IPVA do ano {ipva.ano_referencia} (Veículo ID: {ipva.veiculo_id}) "
                              f"vence em {ipva.data_vencimento.strftime('%d/%m/%Y')}. "
                              f"Dias restantes: {dias_restantes}. Valor: R$ {ipva.valor_ipva:.2f}",
                )
                db.add(alerta)
                alertas_criados.append("IPVA_EXPIRANDO")

        # 5. Check manutenções agendadas com data no passado
        manutencoes_atrasadas = db.query(Manutencao).filter(
            Manutencao.status == "Agendada",
            Manutencao.data_proxima < hoje
        ).all()

        for manutencao in manutencoes_atrasadas:
            dias_atraso = (hoje - manutencao.data_proxima).days

            existe = db.query(AlertaHistorico).filter(
                AlertaHistorico.tipo_alerta == "MANUTENCAO_ATRASADA",
                AlertaHistorico.entidade_tipo == "Manutencao",
                AlertaHistorico.entidade_id == manutencao.id,
                AlertaHistorico.resolvido == False
            ).first()

            if not existe:
                alerta = AlertaHistorico(
                    tipo_alerta="MANUTENCAO_ATRASADA",
                    urgencia="warning",
                    entidade_tipo="Manutencao",
                    entidade_id=manutencao.id,
                    titulo=f"Manutenção #{manutencao.id} atrasada",
                    descricao=f"Manutenção #{manutencao.id} ({manutencao.tipo}) "
                              f"está {dias_atraso} dias atrasada. "
                              f"Data agendada: {manutencao.data_proxima.strftime('%d/%m/%Y')}",
                )
                db.add(alerta)
                alertas_criados.append("MANUTENCAO_ATRASADA")

        db.commit()

        return {
            "success": True,
            "alertas_criados": len([a for a in alertas_criados]),
            "tipos": list(set(alertas_criados)),
            "total_tipos": len(set(alertas_criados)),
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao gerar alertas: {str(e)}")

from typing import Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_user, TokenData
from app.models import (
    Veiculo, Cliente, Contrato, Seguro, Multa,
    DespesaVeiculo, DespesaLoja, DespesaOperacional
)

router = APIRouter()


@router.get("/", summary="Dados do Dashboard")
async def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard data including vehicle statistics,
    client count, active contracts, and financial information.
    """
    try:
        # Vehicle statistics
        total_veiculos = db.query(func.count(Veiculo.id)).scalar() or 0
        veiculos_disponiveis = db.query(func.count(Veiculo.id)).filter(
            Veiculo.status == "Disponível"
        ).scalar() or 0
        veiculos_alugados = db.query(func.count(Veiculo.id)).filter(
            Veiculo.status == "Alugado"
        ).scalar() or 0
        veiculos_manutencao = db.query(func.count(Veiculo.id)).filter(
            Veiculo.status == "Manutenção"
        ).scalar() or 0

        # Client statistics
        total_clientes = db.query(func.count(Cliente.id)).scalar() or 0

        # Active contracts
        contratos_ativos = db.query(func.count(Contrato.id)).filter(
            Contrato.status == "Ativo"
        ).scalar() or 0

        # Financial data for current month
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)

        # Calculate revenue from finalized contracts this month
        receita_mes = Decimal("0.00")
        try:
            contratos_mes = db.query(Contrato).filter(
                Contrato.status == "Finalizado",
                Contrato.data_saida >= month_start.date()
            ).all()

            for contrato in contratos_mes:
                if contrato.total:
                    receita_mes += Decimal(str(contrato.total))
                elif contrato.valor_diaria and contrato.quantidade_diarias:
                    receita_mes += Decimal(str(contrato.valor_diaria * contrato.quantidade_diarias))
        except Exception:
            pass

        despesas_mes = Decimal("0.00")
        lucro_mes = receita_mes - despesas_mes

        # Get recent activities (last 10 contracts)
        atividades_recentes = []
        try:
            contratos_recentes = db.query(Contrato).order_by(
                Contrato.data_cadastro.desc()
            ).limit(10).all()

            for contrato in contratos_recentes:
                atividades_recentes.append({
                    "id": contrato.id,
                    "tipo": f"Contrato {contrato.status.lower()}" if contrato.status else "Contrato",
                    "cliente_id": contrato.cliente_id,
                    "veiculo_id": contrato.veiculo_id,
                    "status": contrato.status,
                    "data": contrato.data_saida.isoformat() if contrato.data_saida else None
                })
        except Exception:
            pass

        # Alerts
        alertas = []

        try:
            # Check for expiring licenses (CNH)
            cnh_expirando = db.query(Cliente).filter(
                Cliente.cnh_validade.isnot(None),
                Cliente.cnh_validade <= datetime.utcnow().date() + timedelta(days=30),
                Cliente.cnh_validade > datetime.utcnow().date()
            ).count() or 0

            if cnh_expirando > 0:
                alertas.append({
                    "tipo": "CNH Vencendo",
                    "quantidade": cnh_expirando,
                    "mensagem": f"{cnh_expirando} cliente(s) com CNH vencendo em 30 dias",
                    "severity": "warning"
                })
        except Exception:
            pass

        try:
            # Check for CNH already expired
            cnh_vencida = db.query(Cliente).filter(
                Cliente.cnh_validade.isnot(None),
                Cliente.cnh_validade <= datetime.utcnow().date()
            ).count() or 0

            if cnh_vencida > 0:
                alertas.append({
                    "tipo": "CNH Vencida",
                    "quantidade": cnh_vencida,
                    "mensagem": f"{cnh_vencida} cliente(s) com CNH vencida",
                    "severity": "high"
                })
        except Exception:
            pass

        # Check for vehicles in maintenance
        if veiculos_manutencao > 0:
            alertas.append({
                "tipo": "Veículos em Manutenção",
                "quantidade": veiculos_manutencao,
                "mensagem": f"{veiculos_manutencao} veículo(s) em manutenção",
                "severity": "info"
            })

        try:
            # Check for expiring insurance
            seguros_expirando = db.query(func.count(Seguro.id)).filter(
                Seguro.data_vencimento.isnot(None),
                Seguro.data_vencimento <= datetime.utcnow().date() + timedelta(days=30),
                Seguro.data_vencimento > datetime.utcnow().date(),
                Seguro.status == "Ativo"
            ).scalar() or 0

            if seguros_expirando > 0:
                alertas.append({
                    "tipo": "Seguros Vencendo",
                    "quantidade": seguros_expirando,
                    "mensagem": f"{seguros_expirando} seguro(s) vencendo em 30 dias",
                    "severity": "warning"
                })
        except Exception:
            pass

        try:
            # Check for pending fines
            multas_pendentes = db.query(func.count(Multa.id)).filter(
                Multa.status == "Pendente"
            ).scalar() or 0

            if multas_pendentes > 0:
                alertas.append({
                    "tipo": "Multas Pendentes",
                    "quantidade": multas_pendentes,
                    "mensagem": f"{multas_pendentes} multa(s) pendente(s) de pagamento",
                    "severity": "warning"
                })
        except Exception:
            pass

        return {
            "veiculos": {
                "total": total_veiculos,
                "disponíveis": veiculos_disponiveis,
                "alugados": veiculos_alugados,
                "manutenção": veiculos_manutencao
            },
            "clientes": {
                "total": total_clientes
            },
            "contratos": {
                "ativos": contratos_ativos,
                "total": db.query(func.count(Contrato.id)).scalar() or 0
            },
            "financeiro": {
                "receita_mes_atual": float(receita_mes),
                "despesas_mes_atual": float(despesas_mes),
                "lucro_mes_atual": float(lucro_mes)
            },
            "atividades_recentes": atividades_recentes,
            "alertas": alertas,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        # Return safe defaults if anything fails
        return {
            "veiculos": {"total": 0, "disponíveis": 0, "alugados": 0, "manutenção": 0},
            "clientes": {"total": 0},
            "contratos": {"ativos": 0, "total": 0},
            "financeiro": {"receita_mes_atual": 0, "despesas_mes_atual": 0, "lucro_mes_atual": 0},
            "atividades_recentes": [],
            "alertas": [],
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/stats", summary="Estatísticas do Dashboard")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard statistics with real metrics.

    Returns:
        Dictionary with:
        - total_veiculos: Count of all vehicles
        - veiculos_alugados: Count where status='Alugado'
        - veiculos_disponiveis: Count where status='Disponível'
        - veiculos_manutencao: Count where status='Manutenção'
        - contratos_ativos: Count where status='Ativo'
        - total_clientes: Count of all clients
        - receita_mes: Sum of contracts this month
        - despesas_mes: Sum of all operational expenses this month
        - lucro_mes: Revenue - Expenses
        - taxa_ocupacao: (Alugados / Total) * 100
        - top_clientes: Top 5 clients by contract value
        - top_veiculos: Top 5 vehicles by usage
        - historico_mensal: Last 6 months revenue vs expenses
        - alertas_ativos: Count of active alerts
        - contratos_atrasados: List of overdue contracts
        - previsao_receita: Average revenue from last 3 months
    """
    try:
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        month_end = now

        # Vehicle statistics
        total_veiculos = db.query(func.count(Veiculo.id)).scalar() or 0
        veiculos_disponiveis = db.query(func.count(Veiculo.id)).filter(
            Veiculo.status == "Disponível"
        ).scalar() or 0
        veiculos_alugados = db.query(func.count(Veiculo.id)).filter(
            Veiculo.status == "Alugado"
        ).scalar() or 0
        veiculos_manutencao = db.query(func.count(Veiculo.id)).filter(
            Veiculo.status == "Manutenção"
        ).scalar() or 0

        # Client statistics
        total_clientes = db.query(func.count(Cliente.id)).scalar() or 0

        # Contract statistics
        contratos_ativos = db.query(func.count(Contrato.id)).filter(
            Contrato.status == "Ativo"
        ).scalar() or 0

        # Calculate revenue for current month
        receita_mes = Decimal("0.00")
        try:
            contratos_mes = db.query(Contrato).filter(
                Contrato.status == "Finalizado",
                Contrato.data_saida >= month_start.date()
            ).all()

            for contrato in contratos_mes:
                if contrato.total:
                    receita_mes += Decimal(str(contrato.total))
                elif contrato.valor_diaria and contrato.quantidade_diarias:
                    receita_mes += Decimal(str(contrato.valor_diaria * contrato.quantidade_diarias))
        except Exception:
            pass

        # Calculate expenses for current month
        despesas_mes = Decimal("0.00")
        try:
            # Sum despesas_veiculos
            despesas_veiculo_mes = db.query(func.sum(DespesaVeiculo.valor)).filter(
                DespesaVeiculo.data >= month_start.date(),
                DespesaVeiculo.data <= month_end.date()
            ).scalar() or 0

            despesas_mes += Decimal(str(despesas_veiculo_mes))

            # Sum despesas_loja
            despesas_loja_mes = db.query(func.sum(DespesaLoja.valor)).filter(
                DespesaLoja.mes == now.month,
                DespesaLoja.ano == now.year
            ).scalar() or 0

            despesas_mes += Decimal(str(despesas_loja_mes))

            # Sum despesas_operacionais
            despesas_op_mes = db.query(func.sum(DespesaOperacional.valor)).filter(
                DespesaOperacional.mes == now.month,
                DespesaOperacional.ano == now.year
            ).scalar() or 0

            despesas_mes += Decimal(str(despesas_op_mes))
        except Exception:
            pass

        lucro_mes = receita_mes - despesas_mes

        # Occupancy rate
        taxa_ocupacao = 0.0
        if total_veiculos > 0:
            taxa_ocupacao = (veiculos_alugados / total_veiculos) * 100

        # Top 5 clients by total contract value
        top_clientes = []
        try:
            clientes_top = db.query(
                Cliente.id,
                Cliente.nome,
                func.sum(Contrato.total).label("total_contratos")
            ).join(
                Contrato, Cliente.id == Contrato.cliente_id
            ).filter(
                Contrato.total.isnot(None)
            ).group_by(
                Cliente.id, Cliente.nome
            ).order_by(
                func.sum(Contrato.total).desc()
            ).limit(5).all()

            for cliente_id, cliente_nome, total_value in clientes_top:
                top_clientes.append({
                    "id": cliente_id,
                    "nome": cliente_nome,
                    "total": float(total_value) if total_value else 0
                })
        except Exception:
            pass

        # Top 5 vehicles by contract count
        top_veiculos = []
        try:
            veiculos_top = db.query(
                Veiculo.id,
                Veiculo.marca,
                Veiculo.modelo,
                Veiculo.placa,
                func.count(Contrato.id).label("total_contratos")
            ).join(
                Contrato, Veiculo.id == Contrato.veiculo_id
            ).group_by(
                Veiculo.id, Veiculo.marca, Veiculo.modelo, Veiculo.placa
            ).order_by(
                func.count(Contrato.id).desc()
            ).limit(5).all()

            for veiculo_id, marca, modelo, placa, total_contratos in veiculos_top:
                top_veiculos.append({
                    "id": veiculo_id,
                    "marca": marca,
                    "modelo": modelo,
                    "placa": placa,
                    "total_contratos": total_contratos
                })
        except Exception:
            pass

        # Last 6 months revenue vs expenses
        historico_mensal = []
        try:
            for i in range(5, -1, -1):  # Last 6 months
                month_date = now - timedelta(days=30 * i)
                m = month_date.month
                y = month_date.year

                # Revenue
                receita = Decimal("0.00")
                contratos_periodo = db.query(Contrato).filter(
                    Contrato.status == "Finalizado",
                    func.extract("month", Contrato.data_saida) == m,
                    func.extract("year", Contrato.data_saida) == y
                ).all()

                for contrato in contratos_periodo:
                    if contrato.total:
                        receita += Decimal(str(contrato.total))

                # Expenses
                despesa = Decimal("0.00")
                despesa += Decimal(str(db.query(func.sum(DespesaVeiculo.valor)).filter(
                    func.extract("month", DespesaVeiculo.data) == m,
                    func.extract("year", DespesaVeiculo.data) == y
                ).scalar() or 0))

                despesa += Decimal(str(db.query(func.sum(DespesaLoja.valor)).filter(
                    DespesaLoja.mes == m,
                    DespesaLoja.ano == y
                ).scalar() or 0))

                despesa += Decimal(str(db.query(func.sum(DespesaOperacional.valor)).filter(
                    DespesaOperacional.mes == m,
                    DespesaOperacional.ano == y
                ).scalar() or 0))

                historico_mensal.append({
                    "mes": f"{m:02d}/{y}",
                    "receita": float(receita),
                    "despesa": float(despesa),
                    "lucro": float(receita - despesa)
                })
        except Exception:
            pass

        # Count alerts by severity
        alertas_ativos = {}
        try:
            cnh_expirando = db.query(func.count(Cliente.id)).filter(
                Cliente.cnh_validade.isnot(None),
                Cliente.cnh_validade <= datetime.utcnow().date() + timedelta(days=30),
                Cliente.cnh_validade > datetime.utcnow().date()
            ).scalar() or 0

            cnh_vencida = db.query(func.count(Cliente.id)).filter(
                Cliente.cnh_validade.isnot(None),
                Cliente.cnh_validade <= datetime.utcnow().date()
            ).scalar() or 0

            seguros_expirando = db.query(func.count(Seguro.id)).filter(
                Seguro.data_vencimento.isnot(None),
                Seguro.data_vencimento <= datetime.utcnow().date() + timedelta(days=30),
                Seguro.data_vencimento > datetime.utcnow().date(),
                Seguro.status == "Ativo"
            ).scalar() or 0

            multas_pendentes = db.query(func.count(Multa.id)).filter(
                Multa.status == "Pendente"
            ).scalar() or 0

            alertas_ativos = {
                "warning": cnh_expirando + seguros_expirando,
                "high": cnh_vencida,
                "critical": multas_pendentes
            }
        except Exception:
            alertas_ativos = {"warning": 0, "high": 0, "critical": 0}

        # Overdue contracts
        contratos_atrasados = []
        try:
            contratos_vencidos = db.query(Contrato).filter(
                Contrato.status == "Ativo",
                Contrato.data_prevista_devolucao < datetime.utcnow().date()
            ).all()

            for contrato in contratos_vencidos:
                dias_atraso = (datetime.utcnow().date() - contrato.data_prevista_devolucao).days
                contratos_atrasados.append({
                    "id": contrato.id,
                    "cliente_id": contrato.cliente_id,
                    "veiculo_id": contrato.veiculo_id,
                    "dias_atraso": dias_atraso,
                    "data_prevista": contrato.data_prevista_devolucao.isoformat()
                })
        except Exception:
            pass

        # Forecast: average revenue from last 3 months
        previsao_receita = Decimal("0.00")
        try:
            for i in range(2, -1, -1):  # Last 3 months
                month_date = now - timedelta(days=30 * i)
                m = month_date.month
                y = month_date.year

                contratos_periodo = db.query(Contrato).filter(
                    Contrato.status == "Finalizado",
                    func.extract("month", Contrato.data_saida) == m,
                    func.extract("year", Contrato.data_saida) == y
                ).all()

                for contrato in contratos_periodo:
                    if contrato.total:
                        previsao_receita += Decimal(str(contrato.total))

            previsao_receita = previsao_receita / 3
        except Exception:
            pass

        return {
            "total_veiculos": total_veiculos,
            "veiculos_alugados": veiculos_alugados,
            "veiculos_disponiveis": veiculos_disponiveis,
            "veiculos_manutencao": veiculos_manutencao,
            "contratos_ativos": contratos_ativos,
            "total_clientes": total_clientes,
            "receita_mes": float(receita_mes),
            "despesas_mes": float(despesas_mes),
            "lucro_mes": float(lucro_mes),
            "taxa_ocupacao": taxa_ocupacao,
            "top_clientes": top_clientes,
            "top_veiculos": top_veiculos,
            "historico_mensal": historico_mensal,
            "alertas_ativos": alertas_ativos,
            "contratos_atrasados": contratos_atrasados,
            "previsao_receita": float(previsao_receita),
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            "error": str(e),
            "total_veiculos": 0,
            "veiculos_alugados": 0,
            "veiculos_disponiveis": 0,
            "veiculos_manutencao": 0,
            "contratos_ativos": 0,
            "total_clientes": 0,
            "receita_mes": 0,
            "despesas_mes": 0,
            "lucro_mes": 0,
            "taxa_ocupacao": 0,
            "top_clientes": [],
            "top_veiculos": [],
            "historico_mensal": [],
            "alertas_ativos": {"warning": 0, "high": 0, "critical": 0},
            "contratos_atrasados": [],
            "previsao_receita": 0,
            "timestamp": datetime.utcnow().isoformat()
        }

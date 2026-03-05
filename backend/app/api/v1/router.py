from fastapi import APIRouter

# Import all routers
from app.api.v1 import auth, clientes, veiculos, contratos, empresas
from app.api.v1 import dashboard, financeiro, configuracoes
from app.api.v1 import seguros, multas, manutencoes, reservas, relatorios, ipva
from app.api.v1 import despesas_contrato, prorrogacoes, quilometragem, motoristas_empresa, checkin_checkout
from app.api.v1 import parcelas_seguro, ipva_aliquotas, documentos, alertas, audit_log
from app.api.v1 import uso_veiculo_empresa, despesas_veiculos, despesas_loja

# Create the main router with all subrouters
router = APIRouter()

# Include all API routes with proper tags
router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
router.include_router(clientes.router, prefix="/clientes", tags=["Clientes"])
router.include_router(veiculos.router, prefix="/veiculos", tags=["Veículos"])
router.include_router(contratos.router, prefix="/contratos", tags=["Contratos"])
router.include_router(empresas.router, prefix="/empresas", tags=["Empresas"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
router.include_router(financeiro.router, prefix="/financeiro", tags=["Financeiro"])
router.include_router(configuracoes.router, prefix="/configuracoes", tags=["Configurações"])
router.include_router(seguros.router, prefix="/seguros", tags=["Seguros"])
router.include_router(multas.router, prefix="/multas", tags=["Multas"])
router.include_router(manutencoes.router, prefix="/manutencoes", tags=["Manutenções"])
router.include_router(reservas.router, prefix="/reservas", tags=["Reservas"])
router.include_router(relatorios.router, prefix="/relatorios", tags=["Relatórios"])
router.include_router(ipva.router, prefix="/ipva", tags=["IPVA"])
router.include_router(despesas_contrato.router, prefix="/despesas-contrato", tags=["Despesas de Contrato"])
router.include_router(prorrogacoes.router, prefix="/prorrogacoes", tags=["Prorrogações"])
router.include_router(quilometragem.router, prefix="/quilometragem", tags=["Quilometragem"])
router.include_router(motoristas_empresa.router, prefix="/motoristas-empresa", tags=["Motoristas de Empresa"])
router.include_router(checkin_checkout.router, prefix="/checkin-checkout", tags=["Check-in/Check-out"])
router.include_router(parcelas_seguro.router, prefix="/parcelas-seguro", tags=["Parcelas de Seguro"])
router.include_router(ipva_aliquotas.router, prefix="/ipva-aliquotas", tags=["Alíquotas IPVA"])
router.include_router(documentos.router, prefix="/documentos", tags=["Documentos"])
router.include_router(alertas.router, prefix="/alertas", tags=["Alertas"])
router.include_router(audit_log.router, prefix="/audit-log", tags=["Auditoria"])
router.include_router(uso_veiculo_empresa.router, prefix="/uso-veiculo-empresa", tags=["Uso de Veículo por Empresa"])
router.include_router(despesas_veiculos.router, prefix="/despesas-veiculo", tags=["Despesas de Veículos"])
router.include_router(despesas_loja.router, prefix="/despesas-loja-dedicadas", tags=["Despesas de Loja"])

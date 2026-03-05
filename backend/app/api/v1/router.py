from fastapi import APIRouter

# Import all routers
from app.api.v1 import auth, clientes, veiculos, contratos, empresas
from app.api.v1 import dashboard, financeiro, configuracoes

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

# Note: These routers are defined but minimal implementations are provided:
# - seguros (Seguros)
# - ipva (IPVA)
# - multas (Multas)
# - manutencoes (Manutenções)
# - reservas (Reservas)
# - relatorios (Relatórios)
# - auditoria (Auditoria)
#
# They can be added when their implementations are complete.

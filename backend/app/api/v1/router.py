from fastapi import APIRouter

# Import all routers
from app.api.v1 import auth, clientes, veiculos, contratos, empresas
from app.api.v1 import dashboard, financeiro, configuracoes
from app.api.v1 import seguros, multas, manutencoes, reservas, relatorios, ipva

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

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Dict, Any

from app.api.v1.router import router as api_v1_router
from app.database import engine, Base, SessionLocal
from app.auth import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migrations():
    """Run lightweight schema migrations."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        migrations = [
            "ALTER TABLE veiculos ALTER COLUMN empresa_id DROP NOT NULL",
            "ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_chassi_key",
            "ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_renavam_key",
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_veiculos_chassi_unique ON veiculos (chassi) WHERE chassi IS NOT NULL",
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_veiculos_renavam_unique ON veiculos (renavam) WHERE renavam IS NOT NULL",
        ]
        for sql in migrations:
            try:
                db.execute(text(sql))
                db.commit()
            except Exception as e:
                db.rollback()
                logger.debug(f"Migration skipped: {sql} -> {e}")
        logger.info("Migrations completed successfully")
    except Exception as e:
        logger.error(f"Error in migrations: {e}")
        db.rollback()
    finally:
        db.close()


def seed_admin_user():
    """Create default admin user if no users exist."""
    from app.models.usuario import Usuario
    db = SessionLocal()
    try:
        user_count = db.query(Usuario).count()
        if user_count == 0:
            admin = Usuario(
                email="admin@mpcars.com",
                nome="Administrador",
                hashed_password=get_password_hash("123456"),
                is_admin=True,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Admin user created: admin@mpcars.com / 123456")
        else:
            logger.info(f"Database already has {user_count} user(s), skipping seed.")
    except Exception as e:
        logger.error(f"Error seeding admin user: {e}")
        db.rollback()
    finally:
        db.close()


def seed_default_configs():
    """Seed default system configuration values."""
    from app.models.sistema import Configuracao
    db = SessionLocal()
    try:
        defaults = {
            "empresa_nome": "MPCARS",
            "empresa_subtitulo": "Aluguel de Veículos",
            "empresa_cnpj": "32.471.526/0001-53",
            "empresa_telefone": "(84) 99999-0000",
            "empresa_endereco": "Rua Principal, 100 - Centro",
            "empresa_cidade": "Pau dos Ferros - RN",
            "empresa_cep": "59900-000",
            "valor_diaria_padrao": "150.00",
            "valor_hora_extra_padrao": "15.00",
            "valor_km_excedente_padrao": "1.00",
            "km_livres_dia_padrao": "200",
        }
        created = 0
        for chave, valor in defaults.items():
            exists = db.query(Configuracao).filter(Configuracao.chave == chave).first()
            if not exists:
                config = Configuracao(chave=chave, valor=valor)
                db.add(config)
                created += 1
        if created > 0:
            db.commit()
            logger.info(f"Seeded {created} default configurations")
        else:
            logger.info("Default configurations already exist, skipping seed.")
    except Exception as e:
        logger.error(f"Error seeding configs: {e}")
        db.rollback()
    finally:
        db.close()


def seed_ipva_aliquotas():
    """Seed IPVA aliquotas for common Brazilian states."""
    from app.models.ipva import IpvaAliquota
    db = SessionLocal()
    try:
        count = db.query(IpvaAliquota).count()
        if count > 0:
            logger.info(f"IPVA aliquotas already seeded ({count} records), skipping.")
            return

        aliquotas = [
            # RN
            {"estado": "RN", "tipo_veiculo": "Passeio", "ano_referencia": 2025, "aliquota": 3.0},
            {"estado": "RN", "tipo_veiculo": "Utilitário", "ano_referencia": 2025, "aliquota": 2.5},
            {"estado": "RN", "tipo_veiculo": "Motocicleta", "ano_referencia": 2025, "aliquota": 2.0},
            {"estado": "RN", "tipo_veiculo": "Caminhão", "ano_referencia": 2025, "aliquota": 1.0},
            {"estado": "RN", "tipo_veiculo": "Passeio", "ano_referencia": 2026, "aliquota": 3.0},
            {"estado": "RN", "tipo_veiculo": "Utilitário", "ano_referencia": 2026, "aliquota": 2.5},
            {"estado": "RN", "tipo_veiculo": "Motocicleta", "ano_referencia": 2026, "aliquota": 2.0},
            {"estado": "RN", "tipo_veiculo": "Caminhão", "ano_referencia": 2026, "aliquota": 1.0},
            # SP
            {"estado": "SP", "tipo_veiculo": "Passeio", "ano_referencia": 2025, "aliquota": 4.0},
            {"estado": "SP", "tipo_veiculo": "Utilitário", "ano_referencia": 2025, "aliquota": 2.0},
            {"estado": "SP", "tipo_veiculo": "Motocicleta", "ano_referencia": 2025, "aliquota": 2.0},
            {"estado": "SP", "tipo_veiculo": "Caminhão", "ano_referencia": 2025, "aliquota": 1.5},
            # RJ
            {"estado": "RJ", "tipo_veiculo": "Passeio", "ano_referencia": 2025, "aliquota": 4.0},
            {"estado": "RJ", "tipo_veiculo": "Utilitário", "ano_referencia": 2025, "aliquota": 3.0},
            # MG
            {"estado": "MG", "tipo_veiculo": "Passeio", "ano_referencia": 2025, "aliquota": 4.0},
            {"estado": "MG", "tipo_veiculo": "Utilitário", "ano_referencia": 2025, "aliquota": 3.0},
            # CE
            {"estado": "CE", "tipo_veiculo": "Passeio", "ano_referencia": 2025, "aliquota": 3.0},
            {"estado": "CE", "tipo_veiculo": "Utilitário", "ano_referencia": 2025, "aliquota": 2.5},
            # PB
            {"estado": "PB", "tipo_veiculo": "Passeio", "ano_referencia": 2025, "aliquota": 2.5},
            {"estado": "PB", "tipo_veiculo": "Utilitário", "ano_referencia": 2025, "aliquota": 2.0},
            # PE
            {"estado": "PE", "tipo_veiculo": "Passeio", "ano_referencia": 2025, "aliquota": 3.0},
            {"estado": "PE", "tipo_veiculo": "Utilitário", "ano_referencia": 2025, "aliquota": 2.5},
            # BA
            {"estado": "BA", "tipo_veiculo": "Passeio", "ano_referencia": 2025, "aliquota": 3.5},
            {"estado": "BA", "tipo_veiculo": "Utilitário", "ano_referencia": 2025, "aliquota": 2.5},
        ]

        for data in aliquotas:
            aliq = IpvaAliquota(**data)
            db.add(aliq)

        db.commit()
        logger.info(f"Seeded {len(aliquotas)} IPVA aliquotas")
    except Exception as e:
        logger.error(f"Error seeding IPVA aliquotas: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting MPCARS API application...")

    # Create tables (only creates if they don't exist)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Run lightweight migrations
    try:
        run_migrations()
    except Exception as e:
        logger.error(f"Error running migrations: {e}")

    # Seed admin user
    try:
        seed_admin_user()
    except Exception as e:
        logger.error(f"Error seeding admin: {e}")

    # Seed default configurations
    try:
        seed_default_configs()
    except Exception as e:
        logger.error(f"Error seeding configs: {e}")

    # Seed IPVA aliquotas
    try:
        seed_ipva_aliquotas()
    except Exception as e:
        logger.error(f"Error seeding IPVA aliquotas: {e}")

    logger.info("MPCARS API is ready to accept requests")
    yield
    logger.info("Shutting down MPCARS API application...")


# Create FastAPI application instance
app = FastAPI(
    title="MPCARS API",
    description="API completa para o sistema de aluguel de carros MPCARS",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root() -> Dict[str, Any]:
    return {
        "message": "MPCARS API v2.0",
        "docs": "/docs",
        "version": "2.0.0"
    }


@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    health_status = {
        "status": "healthy",
        "database": "healthy",
    }
    try:
        db = SessionLocal()
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        health_status["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    return health_status


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": str(exc), "status_code": 400},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "An internal server error occurred. Please try again later.", "status_code": 500},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

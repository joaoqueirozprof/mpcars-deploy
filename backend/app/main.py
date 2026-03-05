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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting MPCARS API application...")

    # Drop and recreate all tables (fresh deploy, no real data yet)
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            conn.commit()
        logger.info("Schema dropped and recreated with CASCADE")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully with correct schema")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Seed admin user
    try:
        seed_admin_user()
    except Exception as e:
        logger.error(f"Error seeding admin: {e}")

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
    lifespan=lifespan
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

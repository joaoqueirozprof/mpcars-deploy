from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Dict, Any

from app.api.v1.router import router as api_v1_router
from app.database import engine, get_db, Base
from app.redis_client import redis_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events for the FastAPI application.
    """
    # Startup event
    logger.info("Starting MPCARS API application...")

    # Create tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Test Redis connection
    try:
        redis_client.ping()
        logger.info("Redis connection established successfully")
    except Exception as e:
        logger.warning(f"Warning: Redis connection failed: {e}")

    logger.info("MPCARS API is ready to accept requests")

    yield

    # Shutdown event
    logger.info("Shutting down MPCARS API application...")
    try:
        redis_client.close()
        logger.info("Redis connection closed")
    except Exception as e:
        logger.warning(f"Warning during Redis shutdown: {e}")

    logger.info("MPCARS API has been shut down")


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
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root() -> Dict[str, Any]:
    """
    Root endpoint that provides information about the API.
    """
    return {
        "message": "MPCARS API v2.0",
        "docs": "/docs",
        "version": "2.0.0"
    }


@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint that verifies database and Redis connectivity.
    """
    health_status = {
        "status": "healthy",
        "database": "healthy",
        "redis": "healthy"
    }

    # Check database connection
    try:
        db = next(get_db())
        db.execute("SELECT 1")
        db.close()
    except Exception as e:
        health_status["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    # Check Redis connection
    try:
        redis_client.ping()
    except Exception as e:
        health_status["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    return health_status


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    Handle HTTP exceptions with custom response format.
    """
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """
    Handle ValueError exceptions.
    """
    raise HTTPException(status_code=400, detail=str(exc))


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    Handle general exceptions with a generic error response.
    """
    logger.error(f"Unhandled exception: {str(exc)}")
    raise HTTPException(
        status_code=500,
        detail="An internal server error occurred. Please try again later."
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

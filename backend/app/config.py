"""
Configuration settings for MPCARS FastAPI application using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings managed by Pydantic."""

    # Database Configuration
    DATABASE_URL: str = "postgresql://mpcars:mpcars@postgres:5432/mpcars"

    # Redis Configuration
    REDIS_URL: str = "redis://redis:6379/0"

    # Security Configuration
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Application Configuration
    ENVIRONMENT: str = "production"
    APP_NAME: str = "MPCARS API"
    API_V1_PREFIX: str = "/api/v1"

    # Optional configurations
    ALGORITHM: str = "HS256"

    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        case_sensitive = True


def get_settings() -> Settings:
    """Get application settings instance."""
    return Settings()

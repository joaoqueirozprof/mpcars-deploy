"""
Database configuration and session management for MPCARS.
Uses synchronous SQLAlchemy with psycopg2.
"""
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.config import get_settings

settings = get_settings()

# Create sync engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# Session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# Declarative base for ORM models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI endpoints to inject database Session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

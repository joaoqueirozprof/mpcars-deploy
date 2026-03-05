"""
Celery application configuration for MPCARS.
"""
from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

app = Celery(
    "mpcars",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
)

"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Application
    app_name: str = "Masal AI"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./masal_ai.db"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Groq / AI
    groq_api_key: str = ""
    groq_model_name: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    groq_timeout_seconds: int = 30
    groq_max_retries: int = 2

    # Scoring thresholds
    score_hot_threshold: int = 70
    score_warm_threshold: int = 40

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()

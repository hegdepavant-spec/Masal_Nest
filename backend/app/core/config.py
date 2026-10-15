import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Application
    app_name: str = "MasalNest"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./masal_ai.db"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Groq / AI
    groq_api_key: str = ""
    groq_model_name: str = "openai/gpt-oss-120b"
    groq_timeout_seconds: int = 30
    groq_max_retries: int = 2

    # Scoring thresholds
    score_hot_threshold: int = 70
    score_warm_threshold: int = 40

    @property
    def resolved_database_url(self) -> str:
        """Normalize DATABASE_URL for SQLAlchemy's async engine.

        Handles common provider URL schemes:
        - postgres://       → postgresql+asyncpg://
        - postgresql://     → postgresql+asyncpg://
        - postgresql+asyncpg:// already correct, pass through
        - sqlite+aiosqlite:// pass through

        For asyncpg connections the `channel_binding` query param is not
        supported and must be stripped. `sslmode=require` is preserved so
        that session.py can move it into connect_args where asyncpg expects it.
        """
        url = self.database_url.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # Strip the channel_binding parameter — not supported by asyncpg
        if "channel_binding" in url:
            import re as _re
            url = _re.sub(r"[&?]channel_binding=[^&]*", "", url)
            # Clean up orphaned ? or trailing &
            url = _re.sub(r"\?&", "?", url)
            url = url.rstrip("?&")

        return url

    @property
    def resolved_groq_model(self) -> str:
        """Return the LiteLLM model string prefixed with groq/ to guarantee routing to Groq."""
        name = self.groq_model_name.strip() if self.groq_model_name else "openai/gpt-oss-120b"
        if not name.startswith("groq/"):
            return f"groq/{name}"
        return name

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    settings = Settings()
    if settings.groq_api_key:
        os.environ["GROQ_API_KEY"] = settings.groq_api_key
    return settings



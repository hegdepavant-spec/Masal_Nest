"""SQLAlchemy async engine and session factory."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

# Determine engine configuration based on database dialect
_db_url = settings.resolved_database_url
_is_sqlite = _db_url.startswith("sqlite")

_engine_kwargs: dict = {
    "echo": settings.debug,
    "future": True,
}

if _is_sqlite:
    # SQLite requires check_same_thread=False for async usage
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL (Neon free tier) — conservative pool settings
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 2
    _engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(_db_url, **_engine_kwargs)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables. Called on application startup."""
    from app.db.models import Base  # noqa: F811

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose the engine. Called on application shutdown."""
    await engine.dispose()

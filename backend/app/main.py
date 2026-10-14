"""Masal AI — FastAPI Application Entry Point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.session import init_db, close_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    logger.info("Initializing database schema...")
    await init_db()
    logger.info("Masal AI backend started successfully.")
    yield
    logger.info("Closing database connections...")
    await close_db()
    logger.info("Masal AI backend shut down.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-Powered Real-Estate Lead Prioritization & Sales Copilot Backend",
    lifespan=lifespan,
)

# CORS Middleware
origins = list(settings.cors_origins)
if "*" not in origins:
    origins.extend(["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """Handle known domain application errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Fallback handler for unexpected server errors."""
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again.",
            }
        },
    )


@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint for deployment monitoring."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/", tags=["system"])
async def root():
    """Root redirect / welcome endpoint."""
    return {
        "message": f"Welcome to {settings.app_name} API",
        "docs_url": "/docs",
        "version": settings.app_version,
    }


# Include aggregated API v1 router
app.include_router(api_router)

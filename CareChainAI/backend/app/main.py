"""
CareChainAI Backend - FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import init_db
from app.api.routes import auth, reports, timeline, ai, emergency, admin, preview
from app.api.routes import vitals, medications, appointments


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await init_db()
    yield


app = FastAPI(
    title="CareChainAI API",
    description="AI-Powered Universal Health Record System",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/api/auth",         tags=["Authentication"])
app.include_router(reports.router,      prefix="/api/reports",      tags=["Reports"])
app.include_router(preview.router,      prefix="/api/reports",      tags=["Preview"])
app.include_router(timeline.router,     prefix="/api/timeline",     tags=["Timeline"])
app.include_router(ai.router,           prefix="/api/ai",           tags=["AI / RAG"])
app.include_router(emergency.router,    prefix="/api/emergency",    tags=["Emergency"])
app.include_router(admin.router,        prefix="/api/admin",        tags=["Admin"])
app.include_router(vitals.router,       prefix="/api/vitals",       tags=["Vitals"])
app.include_router(medications.router,  prefix="/api/medications",  tags=["Medications"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "CareChainAI API", "version": "2.0.0"}
"""
MeuMEI Backend — Entry Point
FastAPI application with CORS, Supabase init, and route mounting.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client

from app.config import settings
from app.routers import chat, user

# ─── App ───
app = FastAPI(
    title="Meu MEI API",
    description="Mentor financeiro digital com IA para MEIs",
    version="1.0.0",
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Supabase ───
supabase = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    chat.init_supabase(supabase)
    user.init_supabase(supabase)

# ─── Routes ───
app.include_router(chat.router)
app.include_router(user.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "meu-mei-api",
        "database": "connected" if supabase else "not configured",
    }

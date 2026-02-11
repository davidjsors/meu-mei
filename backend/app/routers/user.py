"""
Router de usuário.
Endpoints para perfil e questionário de maturidade IAMF-MEI.
"""

from fastapi import APIRouter, HTTPException
from supabase import Client

from app.models.schemas import MaturityRequest, ProfileResponse
from app.prompts.system import get_maturity_level

router = APIRouter(prefix="/api/user", tags=["user"])

_supabase: Client | None = None


def init_supabase(client: Client):
    global _supabase
    _supabase = client


def _get_db() -> Client:
    if _supabase is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _supabase


@router.post("/maturity", response_model=ProfileResponse)
async def submit_maturity(request: MaturityRequest):
    """
    Recebe as respostas do questionário IAMF-MEI.
    Calcula o score (5-25) e define o nível de maturidade.
    Cria ou atualiza o perfil do usuário.
    """
    db = _get_db()

    # Calcular score (soma das 5 respostas, cada uma de 1-5)
    score = sum(request.answers)
    level = get_maturity_level(score)

    profile_data = {
        "phone_number": request.phone_number,
        "name": request.name,
        "dream": request.dream,
        "maturity_score": score,
        "maturity_level": level,
    }

    # Upsert — cria ou atualiza
    resp = db.table("profiles").upsert(
        profile_data, on_conflict="phone_number"
    ).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar perfil")

    return ProfileResponse(**resp.data[0])


@router.get("/profile/{phone_number}", response_model=ProfileResponse)
async def get_profile(phone_number: str):
    """Retorna o perfil e nível de maturidade do usuário."""
    db = _get_db()

    resp = db.table("profiles").select("*").eq(
        "phone_number", phone_number
    ).execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    return ProfileResponse(**resp.data[0])

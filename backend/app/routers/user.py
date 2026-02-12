"""
Router de usuário.
Endpoints para perfil, questionário de maturidade IAMF-MEI e resumo financeiro.
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


@router.get("/profile/{phone_number}")
async def get_profile(phone_number: str):
    """Retorna o perfil e nível de maturidade do usuário."""
    db = _get_db()

    resp = db.table("profiles").select("*").eq(
        "phone_number", phone_number
    ).execute()

    if not resp.data:
        return None

    return resp.data[0]


@router.post("/accept-terms")
async def accept_terms(request: dict):
    """Registra o aceite dos termos de uso e privacidade."""
    from datetime import datetime

    db = _get_db()
    phone_number = request.get("phone_number")
    if not phone_number:
        raise HTTPException(status_code=400, detail="phone_number é obrigatório")

    profile_data = {
        "phone_number": phone_number,
        "terms_accepted": True,
        "terms_accepted_at": datetime.utcnow().isoformat(),
    }

    resp = db.table("profiles").upsert(
        profile_data, on_conflict="phone_number"
    ).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar aceite")

    return {"success": True}


@router.get("/finance/{phone_number}")
async def get_finance_summary(phone_number: str):
    """Retorna resumo financeiro (entradas, saídas, saldo) do usuário."""
    db = _get_db()

    resp = db.table("financial_records").select("*").eq(
        "phone_number", phone_number
    ).execute()

    records = resp.data or []

    entradas = sum(
        float(r.get("amount", 0))
        for r in records
        if r.get("type") == "entrada"
    )
    saidas = sum(
        float(r.get("amount", 0))
        for r in records
        if r.get("type") == "saida"
    )

    return {
        "entradas": entradas,
        "saidas": saidas,
        "saldo": entradas - saidas,
    }


@router.get("/finance/{phone_number}/records")
async def get_finance_records(
    phone_number: str,
    start_date: str | None = None,
    end_date: str | None = None,
    category: str | None = None,
):
    """
    Retorna registros financeiros detalhados com filtros opcionais.
    - start_date/end_date: formato ISO (YYYY-MM-DD). Default: mês vigente.
    - category: filtrar por categoria específica.
    """
    from datetime import datetime, date

    db = _get_db()

    # Default: mês vigente
    if not start_date:
        today = date.today()
        start_date = today.replace(day=1).isoformat()
    if not end_date:
        end_date = date.today().isoformat()

    query = db.table("financial_records").select("*").eq(
        "phone_number", phone_number
    ).gte("created_at", f"{start_date}T00:00:00").lte(
        "created_at", f"{end_date}T23:59:59"
    ).order("created_at", desc=True)

    if category and category != "todas":
        query = query.eq("category", category)

    resp = query.execute()

    return {"records": resp.data or []}

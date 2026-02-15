"""
Router de Autenticação.
Implementa Login Social (Google/Gov.br) e PIN numérico.
"""
import hashlib
import os
from fastapi import APIRouter, HTTPException, Depends
from supabase import Client
from typing import Optional

from app.models.schemas import PinRequest, VerifyPinRequest, SocialLoginRequest, ProfileResponse
from app.routers.user import _get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Helpers ---

def hash_pin(pin: str) -> str:
    """Cria um hash SHA-256 do PIN com um salt fixo (para MVP)."""
    # Em produção, usar salt aleatório por usuário e algoritmos como bcrypt/argon2
    salt = os.getenv("PIN_SALT", "meu-mei-secure-salt")
    return hashlib.sha256(f"{pin}{salt}".encode()).hexdigest()

def verify_pin_hash(plain_pin: str, hashed_pin: str) -> bool:
    """Verifica se o PIN corresponde ao hash."""
    return hash_pin(plain_pin) == hashed_pin

# --- Endpoints ---

@router.post("/social-login")
async def social_login(request: SocialLoginRequest):
    """
    Login/Cadastro via Provedor Social (Google/Gov.br).
    - Se o usuário não existir, cria o perfil.
    - Se existir, atualiza tokens/dados.
    - Retorna o perfil do usuário.
    """
    db = _get_db()

    # 1. Verificar token social (Mock para MVP)
    # Na vida real, validaríamos o token com Google/Gov.br aqui
    if not request.token:
        raise HTTPException(status_code=400, detail="Token inválido")

    # 2. Buscar usuário pelo telefone (Chave primária no nosso modelo atual)
    # Idealmente buscaríamos pelo social_id também para evitar duplicidade
    
    # Check if phone exists
    existing = db.table("profiles").select("*").eq("phone_number", request.phone_number).execute()
    
    profile_data = {
        "phone_number": request.phone_number,
        "social_provider": request.provider,
        "social_id": request.social_id,
        "name": request.name or "Empreendedor", # Fallback name
        # Email could be stored if allow column exists, sticking to schema for now
    }

    if existing.data:
        # Update existing
        db.table("profiles").update(profile_data).eq("phone_number", request.phone_number).execute()
    else:
        # Create new
        db.table("profiles").insert(profile_data).execute()

    # Fetch updated profile
    final_profile = db.table("profiles").select("*").eq("phone_number", request.phone_number).execute()
    
    if not final_profile.data:
         raise HTTPException(status_code=500, detail="Erro ao criar/atualizar usuário")

    user = final_profile.data[0]
    
    # Adicionar flag has_pin para o frontend saber se deve pedir criação de PIN
    has_pin = bool(user.get("pin_hash"))
    
    return {
        "success": True,
        "profile": user,
        "has_pin": has_pin
    }

@router.post("/set-pin")
@router.post("/set-pin")
async def set_pin_endpoint(request: PinRequest):
    """
    Define ou atualiza o PIN do usuário.
    Se o usuário não existir (primeiro acesso), cria o registro básico.
    """
    db = _get_db()
    hashed = hash_pin(request.pin)
    
    # Tenta buscar usuário
    existing = db.table("profiles").select("phone_number").eq("phone_number", request.phone_number).execute()
    
    if existing.data:
        # Atualiza PIN
        resp = db.table("profiles").update({"pin_hash": hashed}).eq("phone_number", request.phone_number).execute()
    else:
        # Cria novo usuário com PIN
        resp = db.table("profiles").insert({
            "phone_number": request.phone_number,
            "pin_hash": hashed,
            "name": "Empreendedor" # Nome será atualizado no próximo passo do onboarding
        }).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar PIN")
        
    return {"success": True, "message": "PIN definido com sucesso"}

@router.post("/login-pin")
async def login_pin(request: VerifyPinRequest):
    """Autentica o usuário via PIN."""
    db = _get_db()
    
    resp = db.table("profiles").select("pin_hash, name, phone_number").eq("phone_number", request.phone_number).execute()
    
    if not resp.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    user = resp.data[0]
    stored_hash = user.get("pin_hash")
    
    if not stored_hash:
        raise HTTPException(status_code=400, detail="PIN não configurado. Cadastre-se primeiro.")
        
    if verify_pin_hash(request.pin, stored_hash):
        return {"success": True, "profile": user}
    else:
        raise HTTPException(status_code=401, detail="PIN incorreto")

@router.post("/recover-pin-check")
async def recover_pin_check(request: SocialLoginRequest):
    """
    Verifica se o login social corresponde ao usuário para permitir reset de PIN.
    """
    db = _get_db()
    
    resp = db.table("profiles").select("social_id, social_provider").eq("phone_number", request.phone_number).execute()
    
    if not resp.data:
         raise HTTPException(status_code=404, detail="Usuário não encontrado")
         
    user = resp.data[0]
    
    # Validar se o social_id bate com o que temos guardado
    # Isso garante que é a mesma pessoa dona da conta social
    if user.get("social_id") != request.social_id:
        raise HTTPException(status_code=403, detail="Conta social não corresponde ao cadastro original.")
        
    return {"success": True, "message": "Identidade confirmada. Pode redefinir o PIN."}

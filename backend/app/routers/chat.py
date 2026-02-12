"""
Router de chat.
Endpoints para enviar mensagens (texto + arquivos) e consultar histórico.
Respostas via Server-Sent Events (SSE) para streaming.

Detecta automaticamente se o usuário é novo e inicia o onboarding
conversacional (sonho + IAMF-MEI). Quando o onboarding é concluído
pela IA, o marcador [ONBOARDING_COMPLETE] é parseado e o perfil
é atualizado no banco.
"""

import re
import json
import uuid
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from sse_starlette.sse import EventSourceResponse
from supabase import Client

from app.services.ai import generate_response_stream, summarize_context
from app.services.finance import get_financial_summary
from app.prompts.system import get_maturity_level

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Supabase client será injetado pelo main.py
_supabase: Client | None = None


def init_supabase(client: Client):
    global _supabase
    _supabase = client


def _get_db() -> Client:
    if _supabase is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _supabase


ALLOWED_MIMES = {
    # Imagens
    "image/jpeg", "image/png", "image/webp", "image/gif",
    # Áudio
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4",
    # PDF
    "application/pdf",
}


def _normalize_mime(mime: str) -> str:
    """Remove parâmetros do MIME type (ex: audio/webm;codecs=opus → audio/webm)."""
    return mime.split(";")[0].strip().lower()

# Regex para extrair dados do onboarding
ONBOARDING_PATTERN = re.compile(
    r"\[ONBOARDING_COMPLETE\]\s*"
    r"nome:\s*(.+?)\s*\n"
    r"sonho:\s*(.+?)\s*\n"
    r"score:\s*(\d+)\s*"
    r"\[/ONBOARDING_COMPLETE\]",
    re.IGNORECASE | re.DOTALL,
)

# Regex para extrair transações financeiras
TRANSACTION_PATTERN = re.compile(
    r"\[TRANSACTION\]\s*"
    r"tipo:\s*(entrada|saida)\s*\n"
    r"valor:\s*([\d.]+)\s*\n"
    r"descricao:\s*(.+?)\s*\n"
    r"categoria:\s*(.+?)\s*"
    r"\[/TRANSACTION\]",
    re.IGNORECASE | re.DOTALL,
)

# Regex para resetar finanças (agora com argumento opcional)
# Ex: [RESET_FINANCE: ALL] ou [RESET_FINANCE: 2023-01-01]
RESET_PATTERN = re.compile(r"\[RESET_FINANCE(?::\s*(ALL|[\d-]+))?\]", re.IGNORECASE)


def _parse_onboarding(text: str) -> dict | None:
    """
    Verifica se a resposta da IA contém o marcador de onboarding completo.
    Retorna dict com nome, sonho e score, ou None.
    """
    match = ONBOARDING_PATTERN.search(text)
    if match:
        return {
            "name": match.group(1).strip(),
            "dream": match.group(2).strip(),
            "score": int(match.group(3).strip()),
        }
    return None


def _clean_onboarding_markers(text: str) -> str:
    """Remove marcadores [ONBOARDING_COMPLETE] da resposta visível ao usuário."""
    return ONBOARDING_PATTERN.sub("", text).strip()


def _parse_transactions(text: str) -> list[dict]:
    """
    Extrai todas as transações financeiras marcadas pela IA.
    Retorna lista de dicts com tipo, valor, descricao, categoria.
    """
    transactions = []
    for match in TRANSACTION_PATTERN.finditer(text):
        try:
            transactions.append({
                "type": match.group(1).strip().lower(),
                "amount": float(match.group(2).strip()),
                "description": match.group(3).strip(),
                "category": match.group(4).strip().lower(),
            })
        except (ValueError, IndexError):
            continue
    return transactions


def _clean_transaction_markers(text: str) -> str:
    """Remove marcadores [TRANSACTION] da resposta visível ao usuário."""
    return TRANSACTION_PATTERN.sub("", text).strip()


def _has_reset_marker(text: str) -> bool:
    """Verifica se há marcador de reset de finanças."""
    return bool(RESET_PATTERN.search(text))


def _get_reset_arg(text: str) -> str | None:
    """Retorna o argumento do reset (ALL ou DATA)."""
    match = RESET_PATTERN.search(text)
    if match:
        return match.group(1).upper() if match.group(1) else "ALL"
    return None


def _clean_reset_marker(text: str) -> str:
    """Remove marcador [RESET_FINANCE...]."""
    return RESET_PATTERN.sub("", text).strip()


def _is_onboarding_mode(profile: dict) -> bool:
    """Verifica se o usuário ainda está no onboarding (sem maturity_score)."""
    return profile.get("maturity_score") is None


@router.post("/send")
async def send_message(
    phone_number: str = Form(...),
    message: str = Form(""),
    file: UploadFile | None = File(None),
):
    """
    Envia mensagem ao Meu MEI.
    Aceita texto puro ou texto + arquivo (imagem, áudio, PDF).
    Retorna resposta via SSE (Server-Sent Events) para streaming.

    Se o usuário é novo, cria o perfil automaticamente e entra em
    modo de onboarding conversacional.
    """
    db = _get_db()

    # 1. Buscar ou criar perfil do usuário
    profile_resp = db.table("profiles").select("*").eq(
        "phone_number", phone_number
    ).execute()

    if profile_resp.data:
        profile = profile_resp.data[0]
    else:
        # Novo usuário — criar perfil vazio
        db.table("profiles").insert({
            "phone_number": phone_number,
        }).execute()
        profile = {"phone_number": phone_number}

    is_onboarding = _is_onboarding_mode(profile)
    maturity_score = profile.get("maturity_score")
    dream = profile.get("dream")
    user_summary = profile.get("summary")
    last_summary_at = profile.get("last_summary_at")

    # 2. Processar arquivo (se enviado)
    file_bytes = None
    file_mime = None
    file_name = None
    file_url = None
    content_type = "text"

    if file and file.filename:
        file_mime = file.content_type or "application/octet-stream"
        file_mime_base = _normalize_mime(file_mime)
        if file_mime_base not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de arquivo não suportado: {file_mime}"
            )
        # Usar o MIME normalizado para o Gemini
        file_mime = file_mime_base

        file_bytes = await file.read()
        file_name = file.filename

        # Determinar content_type
        if file_mime.startswith("image/"):
            content_type = "image"
        elif file_mime.startswith("audio/"):
            content_type = "audio"
        elif file_mime == "application/pdf":
            content_type = "pdf"

        # Converter para data URL (evita dependência do Supabase Storage)
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        file_url = f"data:{file_mime};base64,{b64}"

    # 3. Salvar mensagem do usuário
    user_message_data = {
        "phone_number": phone_number,
        "role": "user",
        "content": message or f"[{content_type} enviado: {file_name}]",
        "content_type": content_type,
        "file_url": file_url,
        "file_name": file_name,
    }
    db.table("messages").insert(user_message_data).execute()

    # 4. Gestão de Contexto e Memória (Token Optimization)
    # Busca apenas mensagens posteriores ao último resumo
    query = db.table("messages").select("role, content, created_at").eq("phone_number", phone_number).order("created_at", desc=False)
    
    if last_summary_at:
        query = query.gt("created_at", last_summary_at)
        
    history_resp = query.limit(100).execute()
    messages = history_resp.data or []
    
    chat_history = []
    
    # Se houver muitas mensagens novas, sumariza as antigas
    # Threshold: 20 mensagens. Mantém 10 no contexto, sumariza o resto.
    if len(messages) > 20:
        # Separa: [mensagens para sumarizar] ... [contexto ativo]
        to_summarize = messages[:-10]
        active_context = messages[-10:]
        
        # Gera novo resumo
        try:
            new_summary = await summarize_context(user_summary, to_summarize)
            
            # Atualiza perfil com novo resumo e novo cursor
            last_msg = to_summarize[-1]
            db.table("profiles").update({
                "summary": new_summary,
                "last_summary_at": last_msg["created_at"]
            }).eq("phone_number", phone_number).execute()
            
            user_summary = new_summary
            chat_history = active_context
        except Exception as e:
            print(f"Erro na sumarização: {e}")
            chat_history = messages # Fallback: usa tudo
    else:
        chat_history = messages

    # 5. Contexto financeiro (apenas se não onboarding)
    enriched_message = message
    if not is_onboarding:
        finance_resp = db.table("financial_records").select("*").eq(
            "phone_number", phone_number
        ).execute()
        financial_context = get_financial_summary(finance_resp.data or [])
        if financial_context and message:
            enriched_message = (
                f"{message}\n\n[Contexto financeiro atual do usuário:\n{financial_context}]"
            )

    # 6. Streaming da resposta via SSE
    async def event_generator():
        full_response = []
        try:
            async for chunk in generate_response_stream(
                message=enriched_message,
                chat_history=chat_history,
                maturity_score=maturity_score,
                dream=dream,
                is_onboarding=is_onboarding,
                file_bytes=file_bytes,
                file_mime=file_mime,
                user_summary=user_summary,
            ):
                full_response.append(chunk)
                yield {"event": "message", "data": json.dumps({"text": chunk})}

            # Resposta completa
            assistant_content = "".join(full_response)

            # Verificar se o onboarding foi concluído
            if is_onboarding:
                onboarding_data = _parse_onboarding(assistant_content)
                if onboarding_data:
                    level = get_maturity_level(onboarding_data["score"])
                    db.table("profiles").update({
                        "name": onboarding_data["name"],
                        "dream": onboarding_data["dream"],
                        "maturity_score": onboarding_data["score"],
                        "maturity_level": level,
                    }).eq("phone_number", phone_number).execute()

                    # Limpar marcadores da resposta antes de salvar
                    assistant_content = _clean_onboarding_markers(assistant_content)

                    yield {
                        "event": "onboarding_complete",
                        "data": json.dumps({"level": level}),
                    }

            # Verificar e salvar transações financeiras
            transactions = _parse_transactions(assistant_content)
            if transactions:
                for txn in transactions:
                    db.table("financial_records").insert({
                        "phone_number": phone_number,
                        "type": txn["type"],
                        "amount": txn["amount"],
                        "description": txn["description"],
                        "category": txn["category"],
                    }).execute()

                # Limpar marcadores de transação
                assistant_content = _clean_transaction_markers(assistant_content)

                yield {
                    "event": "finance_updated",
                    "data": json.dumps({"count": len(transactions)}),
                }

            # Verificar comando de RESET
            if _has_reset_marker(assistant_content):
                reset_arg = _get_reset_arg(assistant_content)
                
                query = db.table("financial_records").delete().eq("phone_number", phone_number)
                
                # Se for data, adiciona filtro
                if reset_arg and reset_arg != "ALL":
                    # Assume formato YYYY-MM-DD
                    # Filtra registros criados APÓS ou IGUAL a data (usando string comparison no ISO)
                    query = query.gte("created_at", reset_arg)

                query.execute()
                
                # Só limpa resumo do perfil se for reset total
                if reset_arg == "ALL":
                    db.table("profiles").update({
                        "summary": None, 
                        "last_summary_at": None
                    }).eq("phone_number", phone_number).execute()
                
                # 3. Limpar marcador da resposta
                assistant_content = _clean_reset_marker(assistant_content)
                
                # 4. Enviar evento de atualização
                yield {
                    "event": "finance_updated",
                    "data": json.dumps({"reset": True, "arg": reset_arg}),
                }

            # Salvar resposta no banco (já limpa de marcadores)
            db.table("messages").insert({
                "phone_number": phone_number,
                "role": "assistant",
                "content": assistant_content,
                "content_type": "text",
            }).execute()

            yield {"event": "done", "data": json.dumps({"complete": True})}

        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())


@router.get("/history/{phone_number}")
async def get_history(phone_number: str, limit: int = 50):
    """Retorna o histórico de mensagens do usuário."""
    db = _get_db()

    resp = db.table("messages").select("*").eq(
        "phone_number", phone_number
    ).order("created_at", desc=False).limit(limit).execute()

    return {"messages": resp.data or []}

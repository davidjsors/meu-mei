"""
Router de chat.
Endpoints para enviar mensagens (texto + arquivos) e consultar histórico.
Respostas via Server-Sent Events (SSE) para streaming.
"""

import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from sse_starlette.sse import EventSourceResponse
from supabase import Client

from app.services.ai import generate_response_stream
from app.services.finance import get_financial_summary

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
    """
    db = _get_db()

    # 1. Buscar perfil do usuário
    profile_resp = db.table("profiles").select("*").eq(
        "phone_number", phone_number
    ).execute()

    if not profile_resp.data:
        raise HTTPException(
            status_code=404,
            detail="Perfil não encontrado. Complete o onboarding primeiro."
        )

    profile = profile_resp.data[0]
    maturity_score = profile.get("maturity_score", 10)
    dream = profile.get("dream", "crescer o negócio")

    # 2. Processar arquivo (se enviado)
    file_bytes = None
    file_mime = None
    file_name = None
    file_url = None
    content_type = "text"

    if file and file.filename:
        file_mime = file.content_type or "application/octet-stream"
        if file_mime not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de arquivo não suportado: {file_mime}"
            )

        file_bytes = await file.read()
        file_name = file.filename

        # Determinar content_type
        if file_mime.startswith("image/"):
            content_type = "image"
        elif file_mime.startswith("audio/"):
            content_type = "audio"
        elif file_mime == "application/pdf":
            content_type = "pdf"

        # Upload para Supabase Storage
        storage_path = f"{phone_number}/{file_name}"
        try:
            db.storage.from_("attachments").upload(
                storage_path, file_bytes,
                file_options={"content-type": file_mime}
            )
            file_url_resp = db.storage.from_("attachments").get_public_url(storage_path)
            file_url = file_url_resp
        except Exception:
            # Se falhar o upload, continua sem URL mas com o conteúdo em memória
            file_url = None

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

    # 4. Buscar histórico recente (últimas 20 mensagens)
    history_resp = db.table("messages").select("role, content").eq(
        "phone_number", phone_number
    ).order("created_at", desc=False).limit(20).execute()

    chat_history = history_resp.data[:-1] if history_resp.data else []

    # 5. Buscar registros financeiros para contexto
    finance_resp = db.table("financial_records").select("*").eq(
        "phone_number", phone_number
    ).execute()

    financial_context = get_financial_summary(finance_resp.data or [])

    # Adicionar contexto financeiro à mensagem
    enriched_message = message
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
                maturity_score=maturity_score,
                dream=dream,
                chat_history=chat_history,
                file_bytes=file_bytes,
                file_mime=file_mime,
            ):
                full_response.append(chunk)
                yield {"event": "message", "data": json.dumps({"text": chunk})}

            # Salvar resposta completa no banco
            assistant_content = "".join(full_response)
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

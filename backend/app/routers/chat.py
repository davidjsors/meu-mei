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
from app.services.tts import text_to_speech_base64
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

# Regex para extrair dados do onboarding (Flexibilizado)
ONBOARDING_PATTERN = re.compile(
    r"\[ONBOARDING_COMPLETE\]\s*"
    r"(?:\*\*)?nome:(?:\*\*)?\s*(.+?)\s*\n"
    r"(?:\*\*)?negocio:(?:\*\*)?\s*(.+?)\s*\n"
    r"(?:\*\*)?sonho:(?:\*\*)?\s*(.+?)\s*\n"
    r"(?:\*\*)?score:(?:\*\*)?\s*(\d+)\s*"
    r"\[/ONBOARDING_COMPLETE\]",
    re.IGNORECASE | re.DOTALL,
)

# Regex para extrair transações financeiras (Altamente Flexível)
TRANSACTION_PATTERN = re.compile(
    r"\[TRANSACTION\]\s*"
    r"(?:\*+)?tipo:(?:\*+)?\s*(entrada|saída|saida|receita|despesa).*?\n"
    r"(?:\*+)?valor:(?:\*+)?\s*([\d,.\s]*\d+\s*[kK]?|[\d,.]+).*?\n"
    r"(?:\*+)?descricao:(?:\*+)?\s*(.*?)\n"
    r"(?:\*+)?categoria:(?:\*+)?\s*(.*?)\n?\s*"
    r"\[/TRANSACTION\]",
    re.IGNORECASE | re.DOTALL,
)

# Regex para extrair áudio (voz do mentor)
AUDIO_PATTERN = re.compile(r"\[AUDIO\](.*?)\[/AUDIO\]", re.IGNORECASE | re.DOTALL)

# Regex para resetar finanças (agora com argumento opcional)
# Ex: [RESET_FINANCE: ALL] ou [RESET_FINANCE: 2023-01-01]
RESET_PATTERN = re.compile(r"\[RESET_FINANCE(?::\s*(ALL|[\d-]+))?\]", re.IGNORECASE)

# Regex para deletar uma transação específica (Flexibilizado)
DELETE_TRANSACTION_PATTERN = re.compile(
    r"\[DELETE_TRANSACTION\]\s*"
    r"(?:\*+)?valor:(?:\*+)?\s*([\d.]+)\s*\n"
    r"(?:\*+)?descricao:(?:\*+)?\s*(.+?)\s*"
    r"\[/DELETE_TRANSACTION\]",
    re.IGNORECASE | re.DOTALL,
)


def _parse_onboarding(text: str) -> dict | None:
    """
    Verifica se a resposta da IA contém o marcador de onboarding completo.
    Retorna dict com nome, negocio, sonho e score, ou None.
    """
    match = ONBOARDING_PATTERN.search(text)
    if match:
        return {
            "name": match.group(1).strip(),
            "business_type": match.group(2).strip(),
            "dream": match.group(3).strip(),
            "score": int(match.group(4).strip()),
        }
    return None


def _clean_onboarding_markers(text: str) -> str:
    """Remove marcadores [ONBOARDING_COMPLETE] da resposta visível ao usuário."""
    return ONBOARDING_PATTERN.sub("", text).strip()


def _parse_transactions(text: str) -> list[dict]:
    """
    Extrai todas as transações financeiras marcadas pela IA.
    """
    transactions = []
    seen = set()
    for match in TRANSACTION_PATTERN.finditer(text):
        try:
            tipo_raw = match.group(1).strip().lower()
            tipo = "entrada" if tipo_raw in ["entrada", "receita"] else "saida"
            
            # Trata formatos brasileiros (1.234,56) e gírias (1k, 2k)
            v_raw = match.group(2).strip().lower()
            
            # Reconhece "k" como milhar
            multiplier = 1
            if "k" in v_raw:
                multiplier = 1000
                v_raw = v_raw.replace("k", "").strip()
            
            # Limpeza de números (remove R$, espaços, etc se o regex pegou)
            v_clean = re.sub(r"[^\d,.]", "", v_raw)
            
            if "," in v_clean and "." in v_clean:
                # Se tem ambos, o último é o decimal (BRA: 1.234,56 | USA: 1,234.56)
                if v_clean.rfind(",") > v_clean.rfind("."):
                    v_clean = v_clean.replace(".", "").replace(",", ".")
                else:
                    v_clean = v_clean.replace(",", "")
            elif "," in v_clean:
                v_clean = v_clean.replace(",", ".")
            
            valor = float(v_clean) * multiplier
            desc = match.group(3).strip()
            cat = match.group(4).strip().lower()
            
            tx_key = (tipo, valor, desc, cat)
            if tx_key not in seen:
                transactions.append({
                    "type": tipo,
                    "amount": valor,
                    "description": desc,
                    "category": cat,
                })
                seen.add(tx_key)
        except (ValueError, IndexError):
            continue
    return transactions


def _clean_transaction_markers(text: str) -> str:
    """Remove marcadores [TRANSACTION] e limpa espaços extras."""
    cleaned = TRANSACTION_PATTERN.sub("", text)
    # Remove excesso de quebras de linha (colapsa 3+ em 2)
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


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


def _parse_deletions(text: str) -> list[dict]:
    """Extrai transações para deletar."""
    deletions = []
    for match in DELETE_TRANSACTION_PATTERN.finditer(text):
        try:
            deletions.append({
                "amount": float(match.group(1).strip()),
                "description": match.group(2).strip(),
            })
        except (ValueError, IndexError):
            continue
    return deletions


def _clean_delete_markers(text: str) -> str:
    """Remove [DELETE_TRANSACTION] da resposta."""
    return DELETE_TRANSACTION_PATTERN.sub("", text).strip()


def _is_onboarding_mode(profile: dict) -> bool:
    """Verifica se o usuário ainda está no onboarding (sem maturity_score)."""
    return profile.get("maturity_score") is None


def _parse_audio(text: str) -> str | None:
    """Extrai o texto para conversão em áudio."""
    match = AUDIO_PATTERN.search(text)
    return match.group(1).strip() if match else None


def _clean_audio_markers(text: str) -> str:
    """Remove [AUDIO] marcadores da resposta."""
    return AUDIO_PATTERN.sub("", text).strip()


@router.post("/send")
async def send_message(
    phone_number: str = Form(...),
    message: str = Form(None),
    file: UploadFile = File(None),
    parent_id: str = Form(None),
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
        # Novo usuário — criar perfil (upsert para garantir unicidade)
        db.table("profiles").upsert({
            "phone_number": phone_number,
        }, on_conflict="phone_number").execute()
        profile = {"phone_number": phone_number}

    is_onboarding = _is_onboarding_mode(profile)
    maturity_score = profile.get("maturity_score")
    dream = profile.get("dream")
    business_type = profile.get("business_type")
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
        "parent_id": parent_id,
        "processed": False, # Nova coluna de controle
    }
    insert_resp = db.table("messages").insert(user_message_data).execute()
    current_msg_id = insert_resp.data[0]["id"] if insert_resp.data else None

    # 4. Gestão de Contexto e Memória (Token Optimization)
    # Busca apenas mensagens posteriores ao último resumo
    # Inclui ID para filtrar a mensagem atual e evitar duplicação no prompt
    # Busca as últimas mensagens (recente para antigo)
    query = db.table("messages").select("id, role, content, created_at, processed").eq("phone_number", phone_number).order("created_at", desc=True)
    
    if last_summary_at:
        query = query.gt("created_at", last_summary_at)
        
    history_resp = query.limit(100).execute()
    raw_messages = history_resp.data or []

    # Identifica mensagens pendentes (não processadas e vindas do usuário)
    pending_messages = [msg["content"] for msg in raw_messages if msg["role"] == "user" and not msg.get("processed", True)]
    
    # Inverte para ordem cronológica (antigo para recente)
    messages = sorted(raw_messages, key=lambda x: x["created_at"])
    messages = [msg for msg in messages if msg["id"] != current_msg_id]
    
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

    # 6. Contexto de Resposta (Reply To)
    replied_to_content = None
    if parent_id:
        parent_resp = db.table("messages").select("content, role").eq("id", parent_id).execute()
        if parent_resp.data:
            pmsg = parent_resp.data[0]
            author = "Meu MEI" if pmsg["role"] == "assistant" else "Você"
            replied_to_content = f"[{author}: {pmsg['content']}]"

    # 7. Streaming da resposta via SSE
    async def event_generator():
        full_response = []
        try:
            async for chunk in generate_response_stream(
                message=enriched_message,
                chat_history=chat_history,
                maturity_score=maturity_score,
                dream=dream,
                business_type=business_type,
                is_onboarding=is_onboarding,
                file_bytes=file_bytes,
                file_mime=file_mime,
                user_summary=user_summary,
                pending_messages=pending_messages,
                replied_to_content=replied_to_content, # Passa o conteúdo da citação
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
                        "business_type": onboarding_data["business_type"],
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

            # Verificar e excluir transações (Estorno)
            deletions = _parse_deletions(assistant_content)
            if deletions:
                for dln in deletions:
                    # Tenta deletar pelo valor e descrição (match parcial na descrição)
                    db.table("financial_records").delete().eq(
                        "phone_number", phone_number
                    ).eq("amount", dln["amount"]).ilike("description", f"%{dln['description']}%").execute()
                
                assistant_content = _clean_delete_markers(assistant_content)
                yield {
                    "event": "finance_updated",
                    "data": json.dumps({"deleted": len(deletions)}),
                }

            # Verificar se há áudio para gerar (NÃO salvar no DB para evitar sobrecarga/limites)
            try:
                audio_text = _parse_audio(assistant_content)
                if audio_text:
                    audio_b64 = await text_to_speech_base64(audio_text)
                    if audio_b64:
                        yield {
                            "event": "agent_audio",
                            "data": json.dumps({"audio": audio_b64}),
                        }
            except Exception as audio_err:
                print(f"Erro silencioso no áudio: {audio_err}")
            
            # Limpar marcadores de áudio do conteúdo final ANTES de salvar
            assistant_content = _clean_audio_markers(assistant_content)

            # Salvar resposta de texto no banco (Sempre salvar, mesmo se o áudio falhar)
            try:
                db.table("messages").insert({
                    "phone_number": phone_number,
                    "role": "assistant",
                    "content": assistant_content,
                    "content_type": "text",
                }).execute()
            except Exception as db_err:
                print(f"Erro ao salvar mensagem no banco: {db_err}")

            # 4. Marcar a mensagem do usuário ORIGINAL como processada (Sucesso Total)
            if current_msg_id:
                try:
                    db.table("messages").update({"processed": True}).eq("id", current_msg_id).execute()
                except Exception as up_err:
                    print(f"Erro ao atualizar status de processamento: {up_err}")

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

    # Busca as últimas mensagens primeiro (DESC) para respeitar o limite, depois inverte para exibir em ordem (ASC)
    resp = db.table("messages").select("*").eq(
        "phone_number", phone_number
    ).order("created_at", desc=True).limit(limit).execute()

    messages = sorted(resp.data or [], key=lambda x: x["created_at"])
    return {"messages": messages}

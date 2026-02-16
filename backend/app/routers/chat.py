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
import os
import shutil
import uuid
from datetime import datetime
from app.config import settings

from app.services.ai import generate_response_stream, summarize_context, transcribe_audio
from app.services.finance import get_financial_summary
from app.services.tts import text_to_speech_base64
from app.prompts.system import get_maturity_level

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Configurações de Upload
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    "image/jpeg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mp3",
    "audio/wav": "audio/wav", # WAV geralmente é x-wav ou wav
    "audio/x-wav": "audio/wav",
    "audio/webm": "audio/webm",
    "audio/ogg": "audio/ogg",
    "audio/mp4": "audio/mp4",
    "application/pdf": "application/pdf"
}


def _normalize_mime(mime: str) -> str:
    """Remove parâmetros do MIME type (ex: audio/webm;codecs=opus → audio/webm)."""
    base = mime.split(";")[0].strip().lower()
    # Verifica se base está nas chaves ou valores (para compatibilidade com set antigo)
    if base in ALLOWED_MIMES:
        return ALLOWED_MIMES[base]
    # Fallback para procurar nos valores se for um set virando dict
    return base

# Marcadores base (apenas tags externas)
ONBOARDING_RE_BLOCK = re.compile(r"\[ONBOARDING_COMPLETE\](.*?)\[/ONBOARDING_COMPLETE\]", re.IGNORECASE | re.DOTALL)
TRANSACTION_RE_BLOCK = re.compile(r"\[TRANSACTION\](.*?)\[/TRANSACTION\]", re.IGNORECASE | re.DOTALL)

# Padrões para extração interna de campos
RE_FIELD_NAME = re.compile(r"(?:\*+)?nome:(?:\*+)?\s*(.+)", re.IGNORECASE)
RE_FIELD_NEGOCIO = re.compile(r"(?:\*+)?negocio:(?:\*+)?\s*(.+)", re.IGNORECASE)
RE_FIELD_SONHO = re.compile(r"(?:\*+)?sonho:(?:\*+)?\s*(.+)", re.IGNORECASE)
RE_FIELD_SCORE = re.compile(r"(?:\*+)?score:(?:\*+)?\s*(\d+)", re.IGNORECASE)

RE_FIELD_TIPO = re.compile(r"(?:\*+)?tipo:(?:\*+)?\s*(entrada|saída|saida|receita|despesa)", re.IGNORECASE)
RE_FIELD_VALOR = re.compile(r"(?:\*+)?valor:(?:\*+)?\s*([\d,.\s]*\d+\s*[kK]?|[\d,.]+)", re.IGNORECASE)
RE_FIELD_DESC = re.compile(r"(?:\*+)?descricao:(?:\*+)?\s*(.+)", re.IGNORECASE)
RE_FIELD_CAT = re.compile(r"(?:\*+)?categoria:(?:\*+)?\s*(.+)", re.IGNORECASE)

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
    """Extrai dados do onboarding via blocos."""
    match_block = ONBOARDING_RE_BLOCK.search(text)
    if not match_block:
        return None
    
    inner = match_block.group(1)
    name_m = RE_FIELD_NAME.search(inner)
    biz_m = RE_FIELD_NEGOCIO.search(inner)
    dream_m = RE_FIELD_SONHO.search(inner)
    score_m = RE_FIELD_SCORE.search(inner)
    
    if all([name_m, biz_m, dream_m, score_m]):
        return {
            "name": name_m.group(1).strip(),
            "business_type": biz_m.group(1).strip(),
            "dream": dream_m.group(1).strip(),
            "score": int(score_m.group(1).strip()),
        }
    return None

def _clean_onboarding_markers(text: str) -> str:
    """Remove blocos de onboarding."""
    return ONBOARDING_RE_BLOCK.sub("", text).strip()


def _parse_transactions(text: str) -> list[dict]:
    """Extrai transações via blocos."""
    transactions = []
    seen = set()
    
    for match_block in TRANSACTION_RE_BLOCK.finditer(text):
        inner = match_block.group(1)
        
        tipo_m = RE_FIELD_TIPO.search(inner)
        valor_m = RE_FIELD_VALOR.search(inner)
        desc_m = RE_FIELD_DESC.search(inner)
        cat_m = RE_FIELD_CAT.search(inner)
        
        if not all([tipo_m, valor_m, desc_m, cat_m]):
            continue
            
        try:
            tipo_raw = tipo_m.group(1).strip().lower()
            tipo = "entrada" if tipo_raw in ["entrada", "receita"] else "saida"
            
            v_raw = valor_m.group(1).strip().lower()
            multiplier = 1000 if "k" in v_raw else 1
            v_clean = re.sub(r"[^\d,.]", "", v_raw.replace("k", ""))
            
            if "," in v_clean and "." in v_clean:
                if v_clean.rfind(",") > v_clean.rfind("."):
                    v_clean = v_clean.replace(".", "").replace(",", ".")
                else:
                    v_clean = v_clean.replace(",", "")
            elif "," in v_clean:
                v_clean = v_clean.replace(",", ".")
            
            valor = float(v_clean) * multiplier
            desc = desc_m.group(1).strip()
            cat = cat_m.group(1).strip().lower()
            
            tx_key = (tipo, valor, desc, cat)
            if tx_key not in seen:
                transactions.append({
                    "type": tipo,
                    "amount": valor,
                    "description": desc,
                    "category": cat,
                })
                seen.add(tx_key)
        except Exception:
            continue
            
    return transactions

def _clean_transaction_markers(text: str) -> str:
    """Remove blocos de transação."""
    cleaned = TRANSACTION_RE_BLOCK.sub("", text)
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
    message: str | None = Form(None),
    file: UploadFile | None = File(None),
    parent_id: str | None = Form(None), # ID da mensagem sendo respondida
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
        print(f"Chat: Perfil encontrado para {phone_number}: {profile.get('name')} | Score: {profile.get('maturity_score')}")
    else:
        # Novo usuário — criar perfil (upsert para garantir unicidade)
        print(f"Chat: Perfil NÃO encontrado para {phone_number}. Criando perfil temporário.")
        db.table("profiles").upsert({
            "phone_number": phone_number,
        }, on_conflict="phone_number").execute()
        profile = {"phone_number": phone_number}

    is_onboarding = _is_onboarding_mode(profile)
    user_name = profile.get("name") or "Empreendedor"
    maturity_score = profile.get("maturity_score")
    dream = profile.get("dream")
    business_type = profile.get("business_type")
    revenue_goal = profile.get("revenue_goal", 0.0)
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
        if file_mime_base not in ALLOWED_MIMES.values(): # Check against values of the dict
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

        # Save to disk (backend/uploads)
        if not os.path.exists(UPLOAD_DIR):
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            
        ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
        safe_filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, safe_filename)
        
        with open(filepath, "wb") as f:
            f.write(file_bytes)

        # Generate URL
        # Uses BACKEND_URL from settings (default http://localhost:8000)
        file_url = f"{settings.BACKEND_URL}/uploads/{safe_filename}"
        
        # Se for áudio, transcrever para adicionar ao histórico/contexto
        if content_type == "audio":
            try:
                transcript = await transcribe_audio(file_bytes, file_mime)
                if transcript:
                    if message:
                        message += f"\n\n[Transcrição]: {transcript}"
                    else:
                        message = f"[Áudio]: {transcript}"
            except Exception as e:
                print(f"Erro ao transcrever áudio recebido: {e}")

    # Validar se parent_id é um UUID válido
    if parent_id:
        try:
            uuid.UUID(str(parent_id))
        except ValueError:
            # Se não for UUID válido (ex: ID temporário do frontend), ignorar
            parent_id = None

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
    raw_messages: list[dict] = history_resp.data or []

    # Identifica mensagens pendentes (não processadas e vindas do usuário)
    pending_messages: list[str] = [msg["content"] for msg in raw_messages if msg["role"] == "user" and not msg.get("processed", True)]
    
    # Inverte para ordem cronológica (antigo para recente)
    messages: list[dict] = sorted(raw_messages, key=lambda x: x["created_at"])
    messages = [msg for msg in messages if msg["id"] != current_msg_id]
    
    chat_history: list[dict] = []
    
    # Só sumariza se houver pelo menos 25 mensagens (para dar um fôlego de 5 mensagens entre resumos)
    if len(messages) >= 25:
        # Separa: [mensagens para sumarizar] ... [contexto ativo]
        to_summarize: list[dict] = list(messages[:-10])
        active_context: list[dict] = list(messages[-10:])
        
        # Só gera resumo se o último resumo gravado não for de AGORA (evita repetição inútil)
        # (Nesta versão simplificada, apenas aumentamos o threshold para 25 para economizar chamadas)
        try:
            new_summary = await summarize_context(user_summary, to_summarize)
            
            # Atualiza perfil com novo resumo
            db.table("profiles").update({
                "summary": new_summary,
            }).eq("phone_number", phone_number).execute()
            
            user_summary = new_summary
            chat_history = active_context
        except Exception as e:
            print(f"Erro na sumarizacao: {e}")
            chat_history = messages
    else:
        chat_history = messages

    # 5. Contexto financeiro (apenas se não onboarding)
    enriched_message = message
    if not is_onboarding:
        finance_resp = db.table("financial_records").select("*").eq(
            "phone_number", phone_number
        ).execute()
        
        # Obter saldo inicial do perfil para o resumo
        initial_balance = float(profile.get("initial_balance", 0) or 0)
        
        financial_context = get_financial_summary(finance_resp.data or [], initial_balance)
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
        # Envia logo um sinal de vida para evitar timeout do browser
        yield {"event": "status", "data": json.dumps({"status": "Iniciando mentor..."})}
        
        full_response_list = []
        buffer = ""
        in_tag = False
        hidden_depth = 0 # > 0 significa que estamos dentro de um bloco oculto (ex: [AUDIO]...[/AUDIO])
        
        # Comandos que abrem/fecham blocos de conteúdo oculto
        BLOCK_COMMANDS = ["AUDIO", "TRANSACTION", "DELETE_TRANSACTION", "ONBOARDING_COMPLETE"]
        # Comandos de tag única que devem ser ocultados (mas não têm conteúdo fechado)
        SINGLE_COMMANDS = ["RESET_FINANCE", "DELETE", "CONTEXTO", "ONBOARDING"] 

        try:
            async for chunk in generate_response_stream(
                message=enriched_message,
                chat_history=chat_history,
                user_name=user_name,
                maturity_score=maturity_score,
                dream=dream,
                business_type=business_type,
                revenue_goal=revenue_goal,
                is_onboarding=is_onboarding,
                file_bytes=file_bytes,
                file_mime=file_mime,
                user_summary=user_summary,
                pending_messages=pending_messages,
                replied_to_content=replied_to_content,
            ):
                buffer += chunk

                while True:
                    if not in_tag:
                        start = buffer.find('[')
                        if start == -1:
                            if buffer:
                                full_response_list.append(buffer)
                                # Só envia para front se NÃO estiver dentro de um bloco oculto
                                if hidden_depth == 0:
                                    yield {"event": "message", "data": json.dumps({"text": buffer})}
                                buffer = ""
                            break
                        else:
                            safe_text = buffer[:start]
                            if safe_text:
                                full_response_list.append(safe_text)
                                if hidden_depth == 0:
                                    yield {"event": "message", "data": json.dumps({"text": safe_text})}
                            
                            buffer = buffer[start:]
                            in_tag = True
                    else:
                        end = buffer.find(']')
                        if end == -1:
                            break
                        else:
                            tag_content = buffer[:end+1]
                            full_response_list.append(tag_content)
                            
                            # Analisar a Tag
                            inner = tag_content[1:-1].strip().upper() # Remove [] e espaços
                            is_closing = inner.startswith("/")
                            clean_tag = inner[1:] if is_closing else inner
                            # Remover argumentos (ex: RESET_FINANCE: ALL -> RESET_FINANCE)
                            clean_cmd = clean_tag.split(":")[0].strip()
                            
                            # Lógica de Bloco
                            if clean_cmd in BLOCK_COMMANDS:
                                if is_closing:
                                    hidden_depth = max(0, hidden_depth - 1)
                                    if hidden_depth == 0:
                                        yield {"event": "status", "data": json.dumps({"status": "Finalizando processamento..."})}
                                else:
                                    hidden_depth = hidden_depth + 1
                                    if clean_cmd == "AUDIO":
                                        yield {"event": "status", "data": json.dumps({"status": "Gerando resposta em áudio..."})}
                                    elif clean_cmd == "TRANSACTION":
                                        yield {"event": "status", "data": json.dumps({"status": "Registrando transação..."})}
                                is_hidden_tag = True
                            elif clean_cmd in SINGLE_COMMANDS:
                                is_hidden_tag = True # Tag isolada oculta
                            else:
                                is_hidden_tag = False # Tag normal (ex: [1])
                            
                            # Se a tag NÃO for oculta E não estivermos em um bloco oculto, enviamos a tag
                            # Se estivermos em bloco oculto, a tag também é oculta
                            if not is_hidden_tag and hidden_depth == 0:
                                yield {"event": "message", "data": json.dumps({"text": tag_content})}
                            
                            buffer = buffer[end+1:]
                            in_tag = False

            # Processar resto do buffer
            if buffer:
                full_response_list.append(buffer)
                if hidden_depth == 0 and not in_tag:
                    yield {"event": "message", "data": json.dumps({"text": buffer})}

            # Sinalizar que o texto visível acabou
            yield {"event": "text_done", "data": json.dumps({"done": True})}

            # Resposta completa para processamento
            assistant_content = "".join(full_response_list)

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

            # Verificar se há áudio para gerar
            try:
                audio_text = _parse_audio(assistant_content)
                if audio_text:
                    audio_b64 = await text_to_speech_base64(audio_text)
                    if audio_b64:
                        # 1. Decodificar e Salvar no Disco
                        audio_bytes = base64.b64decode(audio_b64)
                        filename = f"tts-{uuid.uuid4()}.mp3"
                        filepath = os.path.join(UPLOAD_DIR, filename)
                        
                        with open(filepath, "wb") as f:
                            f.write(audio_bytes)
                            
                        audio_url = f"{settings.BACKEND_URL}/uploads/{filename}"

                        # 2. Salvar mensagem de áudio no Banco de Dados (Persistência)
                        db.table("messages").insert({
                            "phone_number": phone_number,
                            "role": "assistant",
                            "content": "Áudio do Mentor",
                            "content_type": "audio",
                            "file_url": audio_url,
                            "created_at": datetime.utcnow().isoformat()
                        }).execute()

                        # 3. Enviar URL para o frontend
                        yield {
                            "event": "agent_audio",
                            "data": json.dumps({"audio": audio_url}),
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
            print(f"ERRO SSE: {e}")
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

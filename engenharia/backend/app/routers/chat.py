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
import asyncio
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
# Configurações de Upload
# (Removido UPLOAD_DIR local pois agora usamos Supabase Storage e Vercel é Read-Only)

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

# Removemos todos os regex e funcoes de marcação de texto antigas (onboarding, finance, tags html-like).
# A lógica de processar estes eventos foi movida para as Function Calls (Tools) nativas do Gemini.

def _is_onboarding_mode(profile: dict) -> bool:
    """Verifica se o usuário ainda está no onboarding (sem maturity_score)."""
    return profile.get("maturity_score") is None

@router.post("/send")
async def send_message(
    phone_number: str = Form(...),
    message: str | None = Form(None),
    file: UploadFile | None = File(None),
    parent_id: str | None = Form(None), # ID da mensagem sendo respondida
    replied_to_text: str | None = Form(None), # Texto da mensagem original (fallback se ID falhar)
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

        file_url = None
        
        try:
            # Novo Fluxo: Upload para Supabase Storage (Bucket 'uploads')
            # 1. Definir caminho do arquivo no bucket
            ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
            safe_filename = f"{uuid.uuid4()}.{ext}"
            file_path_in_bucket = f"user_files/{safe_filename}" # Organiza em subpastas

            # 2. Upload usando o cliente Supabase Storage
            # Note: file_bytes já foi lido anteriormente
            # 'file_mime' (content-type) é importante
            print(f"Chat: Iniciando upload para Supabase Storage: {file_path_in_bucket}")
            
            # Usamos o cliente injetado _get_db() que tem acesso ao storage
            storage_resp = _get_db().storage.from_("uploads").upload(
                file=file_bytes,
                path=file_path_in_bucket,
                file_options={"content-type": file_mime}
            )

            # 3. Gerar URL Pública
            # O método get_public_url retorna a URL completa
            file_url = _get_db().storage.from_("uploads").get_public_url(file_path_in_bucket)
            print(f"Chat: Upload concluído. URL: {file_url}")

        except Exception as e:
            print(f"ERRO CRÍTICO NO UPLOAD PARA SUPABASE: {e}")
            raise HTTPException(status_code=500, detail="Falha ao salvar arquivo no armazenamento nuvem.")

        
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
        to_summarize = list(messages[:-10])
        active_context = list(messages[-10:])
        
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
    
    if not replied_to_content and replied_to_text:
        replied_to_content = f"[{replied_to_text}]"

    # 7. Streaming da resposta via SSE
    async def event_generator():
        yield {"event": "status", "data": json.dumps({"status": "Iniciando mentor..."})}
        
        full_response_list = []
        has_tool_calls_flag = False

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
                is_tool_call = False
                if "__tool_call" in chunk:
                    try:
                        chunk_data = json.loads(chunk.strip())
                        if isinstance(chunk_data, dict) and chunk_data.get("__tool_call"):
                            is_tool_call = True
                            has_tool_calls_flag = True
                            tool_queue.append(chunk_data)
                    except json.JSONDecodeError:
                        pass
                
                if not is_tool_call:
                    full_response_list.append(chunk)
                    yield {"event": "message", "data": json.dumps({"text": chunk})}

            # Sinalizar que o texto visível acabou
            yield {"event": "text_done", "data": json.dumps({"done": True})}
            
            # Processa as ferramentas empilhadas agora que o stream da API Gemini já finalizou (evitar timeout/lock)
            for chunk_data in tool_queue:
                tool_name = chunk_data.get("name")
                args = chunk_data.get("args", {})
                
                if tool_name == "registrar_transacao":
                    db.table("financial_records").insert({
                        "phone_number": phone_number,
                        "type": args.get("tipo"),
                        "amount": args.get("valor"),
                        "description": args.get("descricao"),
                        "category": args.get("categoria", ""),
                        "created_at": datetime.utcnow().isoformat()
                    }).execute()
                    yield {"event": "finance_updated", "data": json.dumps({"count": 1})}
                    yield {"event": "status", "data": json.dumps({"status": "Registrando transação..."})}

                elif tool_name == "deletar_transacao_estorno":
                    db.table("financial_records").delete().eq(
                        "phone_number", phone_number
                    ).eq("amount", args.get("valor")).ilike("description", f"%{args.get('descricao')}%").execute()
                    yield {"event": "finance_updated", "data": json.dumps({"deleted": 1})}

                elif tool_name == "concluir_onboarding":
                    level = get_maturity_level(args.get("score"))
                    update_payload = {
                        "name": args.get("nome"),
                        "business_type": args.get("negocio"),
                        "dream": args.get("sonho"),
                        "maturity_score": args.get("score"),
                        "maturity_level": level,
                    }
                    if args.get("pontos_fracos"):
                        update_payload["summary"] = f"Pontos de atenção (Diagnóstico IAMF-MEI): {args['pontos_fracos']}"
                    
                    db.table("profiles").update(update_payload).eq("phone_number", phone_number).execute()
                    yield {"event": "onboarding_complete", "data": json.dumps({"level": level})}

                elif tool_name == "atualizar_perfil":
                    updates = {}
                    if "nova_meta_vendas" in args:
                        updates["revenue_goal"] = args["nova_meta_vendas"]
                    if "novo_sonho" in args:
                        updates["dream"] = args["novo_sonho"]
                    if updates:
                        db.table("profiles").update(updates).eq("phone_number", phone_number).execute()
                        yield {"event": "profile_updated", "data": json.dumps({"updated_fields": list(updates.keys())})}

                elif tool_name == "resetar_financas":
                    reset_arg = str(args.get("data_corte", "ALL")).upper()
                    query = db.table("financial_records").delete().eq("phone_number", phone_number)
                    if reset_arg and reset_arg != "ALL":
                        query = query.gte("created_at", reset_arg)
                    query.execute()
                    
                    if reset_arg == "ALL":
                        db.table("profiles").update({"summary": None, "last_summary_at": None}).eq("phone_number", phone_number).execute()
                    yield {"event": "finance_updated", "data": json.dumps({"reset": True, "arg": reset_arg})}

                elif tool_name == "gerar_resposta_audio":
                    yield {"event": "status", "data": json.dumps({"status": "Gerando resposta em áudio..."})}
                    audio_text = args.get("texto_para_falar")
                    import logging
                    logger = logging.getLogger("uvicorn.error")
                    logger.warning(f"DEBUG AUDIO: Starting generation for text len {len(audio_text) if audio_text else 0}")
                    if audio_text:
                        logger.warning("DEBUG AUDIO: Calling text_to_speech_base64 locally via thread")
                        def _run_tts():
                            return asyncio.run(text_to_speech_base64(audio_text))
                        audio_b64 = await asyncio.to_thread(_run_tts)
                        logger.warning(f"DEBUG AUDIO: Got base64 with length {len(audio_b64) if audio_b64 else 0}")
                        if audio_b64:
                            if "," in audio_b64:
                                audio_b64_data = audio_b64.split(",", 1)[1]
                            else:
                                audio_b64_data = audio_b64
                            audio_bytes = base64.b64decode(audio_b64_data)
                            filename = f"tts-{uuid.uuid4()}.mp3"
                            file_path_in_bucket = f"tts_audio/{filename}"
                            def _upload_audio():
                                logger.warning("DEBUG AUDIO: Inside thread, uploading to supabase...")
                                _get_db().storage.from_("uploads").upload(
                                    file=audio_bytes, path=file_path_in_bucket,
                                    file_options={"content-type": "audio/mpeg"}
                                )
                                logger.warning("DEBUG AUDIO: Upload complete.")
                            logger.warning("DEBUG AUDIO: Awaiting thread")
                            await asyncio.to_thread(_upload_audio)
                            logger.warning("DEBUG AUDIO: Getting public URL...")
                            audio_url = _get_db().storage.from_("uploads").get_public_url(file_path_in_bucket)
                            logger.warning(f"DEBUG AUDIO: Inserting message. File URL: {audio_url}")
                            db.table("messages").insert({
                                "phone_number": phone_number,
                                "role": "assistant",
                                "content": "Áudio do Mentor",
                                "content_type": "audio",
                                "file_url": audio_url,
                                "created_at": datetime.utcnow().isoformat()
                            }).execute()
                            logger.warning("DEBUG AUDIO: Emitting SSE agent_audio...")
                            yield {"event": "agent_audio", "data": json.dumps({"audio": audio_url})}

            assistant_content = "".join(full_response_list)
            
            if not assistant_content.strip() and has_tool_calls_flag:
                assistant_content = "Ação registrada com sucesso! Como posso continuar te ajudando?"
                yield {"event": "message", "data": json.dumps({"text": assistant_content})}

            # Salvar resposta de texto no banco
            if assistant_content.strip():
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

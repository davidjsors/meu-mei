"""
Serviço de integração com Google Gemini API.
Suporta texto, imagem, áudio e PDF (multimodal).
Usa o SDK google-genai (atual).
"""

import os
from google import genai
from google.genai import types
from app.config import settings
from app.prompts.system import build_system_prompt, build_onboarding_prompt

# Inicializa o gerenciador de chaves
class GeminiManager:
    def __init__(self, api_keys: list[str]):
        self.api_keys = api_keys
        import random
        self.current_index = random.randint(0, len(api_keys) - 1) if api_keys else 0
        self._client = None
        self._initialize_client()

    def _initialize_client(self):
        if not self.api_keys:
            raise ValueError("Nenhuma GEMINI_API_KEY configurada no .env")
        key = str(self.api_keys[self.current_index])
        self._client = genai.Client(api_key=key)
        suffix = key[-4:] if len(key) > 4 else key
        print("Gemini: Usando chave indice " + str(self.current_index) + " (final " + str(suffix) + ")")

    @property
    def client(self):
        return self._client

    def rotate_key(self, used_indices: set[int] = None):
        """Muda para uma chave que ainda não foi tentada nesta requisição."""
        if len(self.api_keys) <= 1:
            return False
            
        # Tenta achar um índice que ainda não foi usado
        available = [i for i in range(len(self.api_keys)) if i not in (used_indices or set())]
        if not available:
            return False # Todas as chaves falharam
            
        import random
        self.current_index = random.choice(available)
        self._initialize_client()
        return True

    def is_rotatable_error(self, e: Exception) -> bool:
        """Verifica se o erro justifica rodar a chave (Quota, Chave Inválida, etc)."""
        err_msg = str(e).lower()
        patterns = [
            "429", "400", "403", "401", "404", 
            "quota", "limit", "invalid", "not found", 
            "permission", "resource_exhausted", "unauthenticated"
        ]
        return any(p in err_msg for p in patterns)

manager = GeminiManager(settings.GEMINI_API_KEYS)


def get_embedding(text: str) -> list[float]:
    """Gera embedding usando o modelo do Gemini com retry."""
    tried_indices = {manager.current_index}
    max_retries = len(manager.api_keys)
    for _ in range(max_retries):
        try:
            response = manager.client.models.embed_content(
                model="models/gemini-embedding-001",
                contents=str(text)
            )
            return response.embeddings[0].values
        except Exception as e:
            if manager.is_rotatable_error(e) and manager.rotate_key(tried_indices):
                tried_indices.add(manager.current_index)
                continue
            print("Erro na geracao de embedding: " + str(e))
            break
    return [0.0] * 768


async def search_knowledge(query: str, limit: int = 5) -> str:
    """Busca conhecimento relevante no Supabase usando busca vetorial."""
    from app.routers.chat import _get_db
    
    try:
        embedding = get_embedding(query)
        db = _get_db()
        
        rpc_params = {
            "query_embedding": embedding,
            "match_threshold": 0.5,
            "match_count": limit,
        }
        
        resp = db.rpc("match_knowledge", rpc_params).execute()
        
        if not (resp and resp.data):
            return ""
            
        context_parts = []
        for match in resp.data:
            content = str(match.get("content", ""))
            source = str(match.get("metadata", {}).get("filename", "desconhecido"))
            context_parts.append("--- Fonte: " + source + " ---\n" + content)
            
        return "\n\n".join(context_parts)
    except Exception as e:
        print("Erro na busca vetorial: " + str(e))
        return ""


async def transcribe_audio(file_bytes: bytes, mime_type: str) -> str:
    """Transcreve áudio usando Gemini Flash com retry."""
    tried_indices = {manager.current_index}
    max_retries = len(manager.api_keys)
    for _ in range(max_retries):
        try:
            prompt = "Transcreva o seguinte áudio fielmente. Retorne APENAS o texto transcrito, sem comentários."
            
            response = manager.client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[
                    types.Content(
                       role="user",
                       parts=[
                           types.Part.from_text(text=prompt),
                           types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
                       ]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.0,
                ),
            )
            return response.text.strip() if (response and response.text) else ""
        except Exception as e:
            if manager.is_rotatable_error(e) and manager.rotate_key(tried_indices):
                tried_indices.add(manager.current_index)
                continue
            print("Erro na transcricao: " + str(e))
            break
    return ""


async def generate_response_stream(
    message: str,
    chat_history: list[dict],
    maturity_score: int | None = None,
    dream: str | None = None,
    business_type: str | None = None,
    is_onboarding: bool = False,
    file_bytes: bytes | None = None,
    file_mime: str | None = None,
    user_summary: str | None = None,
    pending_messages: list[str] | None = None,
    replied_to_content: str | None = None,
):
    if is_onboarding:
        system_prompt = str(build_onboarding_prompt())
    else:
        system_prompt = str(build_system_prompt(
            maturity_score or 10, 
            dream or "crescer o negocio", 
            business_type or "empreendedor",
            user_summary
        ))

    if replied_to_content:
        system_prompt = system_prompt + "\n\n## CONTEXTO DE RESPOSTA\n" + str(replied_to_content)

    if pending_messages:
        pending_context = "\n".join([str(m) for m in pending_messages])
        system_prompt = system_prompt + "\n\n## PENDENTES\n" + pending_context

    knowledge_context = await search_knowledge(message)
    if knowledge_context:
        system_prompt = system_prompt + "\n\n## Conhecimento:\n" + str(knowledge_context)

    user_parts = []
    if file_bytes and file_mime:
        user_parts.append(types.Part.from_bytes(data=file_bytes, mime_type=file_mime))
    if message:
        user_parts.append(types.Part.from_text(text=str(message)))

    history = []
    for msg in chat_history:
        role = "user" if msg["role"] == "user" else "model"
        history.append(types.Content(role=role, parts=[types.Part.from_text(text=str(msg.get("content", "")))]))
    
    history.append(types.Content(role="user", parts=user_parts))

    tried_indices = {manager.current_index}
    max_retries = len(manager.api_keys)
    for attempt in range(max_retries):
        chunk_count = 0
        try:
            response = manager.client.models.generate_content_stream(
                model=settings.GEMINI_MODEL,
                contents=history,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7,
                    max_output_tokens=8192,
                    safety_settings=[
                        types.SafetySetting(category="HATE_SPEECH", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARASSMENT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                    ],
                ),
            )

            for chunk in response:
                if chunk.text:
                    chunk_count = chunk_count + 1
                    # Log para debug no terminal
                    print("Yielding chunk " + str(chunk_count) + ": " + str(chunk.text)[:40].replace('\n', ' '))
                    yield str(chunk.text)
            return
            
        except Exception as e:
            if manager.is_rotatable_error(e) and manager.rotate_key(tried_indices):
                tried_indices.add(manager.current_index)
                print("Erro mid-stream. Rotacionando chave...")
                continue
            print("Erro fatal no stream (chunk " + str(chunk_count) + "): " + str(e))
            raise e


async def generate_response(
    message: str,
    chat_history: list[dict],
    maturity_score: int | None = None,
    dream: str | None = None,
    business_type: str | None = None,
    is_onboarding: bool = False,
    file_bytes: bytes | None = None,
    file_mime: str | None = None,
    user_summary: str | None = None,
) -> str:
    full_response = []
    async for chunk in generate_response_stream(
        message, chat_history, maturity_score, dream, business_type,
        is_onboarding, file_bytes, file_mime, user_summary
    ):
        full_response.append(chunk)
    return "".join(full_response)


async def summarize_context(current_summary: str | None, recent_messages: list[dict]) -> str:
    history_text = ""
    for msg in recent_messages:
        role = "Usuário" if msg["role"] == "user" else "Meu MEI"
        content = str(msg.get("content", ""))
        if content:
            history_text = history_text + role + ": " + content + "\n"

    prompt = "Sumarize o perfil do usuário:\nResumo Anterior: " + str(current_summary) + "\nNovas: " + str(history_text)

    max_retries = len(manager.api_keys)
    for _ in range(max_retries):
        try:
            response = manager.client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.5, max_output_tokens=1024),
            )
            return response.text if (response and response.text) else (current_summary or "")
        except Exception as e:
            if manager.is_rotatable_error(e) and manager.rotate_key():
                continue
            break
    return current_summary or ""

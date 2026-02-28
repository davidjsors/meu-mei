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
            meta = match.get("metadata", {})
            # Recupera o contexto GIGANTE que salvamos na indexação, o LLM lê isso em vez do resumo de busca
            full_content = str(meta.get("full_content", match.get("content", ""))) 
            source = str(meta.get("filename", "desconhecido"))
            page = str(meta.get("page_number", "?"))
            title = str(meta.get("page_title", "Página " + page))
            
            context_parts.append(f"--- Fonte: {source} (Seção: {title}) ---\n{full_content}")
            
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


registrar_transacao_func = types.FunctionDeclaration(
    name="registrar_transacao",
    description="Registra uma nova transação financeira de entrada ou saída",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "tipo": types.Schema(type=types.Type.STRING, description="Tipo da transação: 'entrada' ou 'saida'"),
            "valor": types.Schema(type=types.Type.NUMBER, description="Valor numérico da transação. Use formato decimal com ponto."),
            "descricao": types.Schema(type=types.Type.STRING, description="Descrição curta do gasto ou receita"),
            "categoria": types.Schema(type=types.Type.STRING, description="Categoria do gasto ou receita"),
        },
        required=["tipo", "valor", "descricao", "categoria"]
    )
)

deletar_transacao_func = types.FunctionDeclaration(
    name="deletar_transacao_estorno",
    description="Exclui ou cancela uma transação registrada anteriormente (estorno)",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "valor": types.Schema(type=types.Type.NUMBER, description="Valor da transação a ser deletada"),
            "descricao": types.Schema(type=types.Type.STRING, description="Trecho da descrição para identificar a transação"),
        },
        required=["valor", "descricao"]
    )
)

concluir_onboarding_func = types.FunctionDeclaration(
    name="concluir_onboarding",
    description="Acionada APENAS quando o questionário de diagnóstico chegar ao fim e for possível calcular o score.",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "nome": types.Schema(type=types.Type.STRING, description="Nome do empreendedor"),
            "negocio": types.Schema(type=types.Type.STRING, description="Tipo do negócio"),
            "sonho": types.Schema(type=types.Type.STRING, description="O sonho do dono do negócio"),
            "score": types.Schema(type=types.Type.INTEGER, description="A soma dos pontos do diagnóstico IAMF-MEI (0 a 10)"),
            "pontos_fracos": types.Schema(type=types.Type.STRING, description="Pontos fracos ou de atenção identificados"),
        },
        required=["nome", "negocio", "sonho", "score", "pontos_fracos"]
    )
)

atualizar_perfil_func = types.FunctionDeclaration(
    name="atualizar_perfil",
    description="Atualiza a meta de vendas ou o sonho do empreendedor",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "nova_meta_vendas": types.Schema(type=types.Type.NUMBER, description="Nova meta de faturamento mensal em Reais"),
            "novo_sonho": types.Schema(type=types.Type.STRING, description="Novo sonho ou objetivo do negócio"),
        }
    )
)

resetar_financas_func = types.FunctionDeclaration(
    name="resetar_financas",
    description="Apaga o histórico financeiro do usuário ou parte dele, APENAS mediante confirmação.",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "data_corte": types.Schema(type=types.Type.STRING, description="Se for para apagar tudo, mande 'ALL'. Se for uma data, formato YYYY-MM-DD para apagar registros daquela data em diante."),
        }
    )
)

gerar_resposta_audio_func = types.FunctionDeclaration(
    name="gerar_resposta_audio",
    description="Gera um áudio que o usuário poderá escutar, ideal para explicações mais densas (pílula educativa)",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "texto_para_falar": types.Schema(type=types.Type.STRING, description="Texto escrito da forma que deve ser falada, de forma natural, sem markdown."),
        },
        required=["texto_para_falar"]
    )
)

meu_mei_tools = types.Tool(
    function_declarations=[
        registrar_transacao_func,
        deletar_transacao_func,
        concluir_onboarding_func,
        atualizar_perfil_func,
        resetar_financas_func,
        gerar_resposta_audio_func
    ]
)


async def generate_response_stream(
    message: str,
    chat_history: list[dict],
    user_name: str | None = None,
    maturity_score: int | None = None,
    dream: str | None = None,
    business_type: str | None = None,
    is_onboarding: bool = False,
    file_bytes: bytes | None = None,
    file_mime: str | None = None,
    user_summary: str | None = None,
    revenue_goal: float | None = None,
    pending_messages: list[str] | None = None,
    replied_to_content: str | None = None,
):
    if is_onboarding:
        system_prompt = str(build_onboarding_prompt())
    else:
        # Usar apenas o primeiro nome do usuário para maior proximidade
        first_name = (user_name or "Empreendedor").strip().split(" ")[0]
        print(f"Gerando resposta para: {first_name}, Score: {maturity_score}, Dream: {dream}")
        system_prompt = str(build_system_prompt(
            first_name,
            maturity_score or 10, 
            dream or "crescer o negócio", 
            business_type or "empreendedor",
            user_summary,
            revenue_goal or 0.0
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
    
    ag_tools = [meu_mei_tools] if not is_onboarding else [types.Tool(function_declarations=[concluir_onboarding_func])]

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
                    tools=ag_tools,
                    safety_settings=[
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE
                        ),
                    ],
                ),
            )

            import json
            for chunk in response:
                print(f"CHUNK RAW: {repr(chunk)}")
                if chunk.function_calls:
                    for fc in chunk.function_calls:
                        args_dict = dict(fc.args) if fc.args else {}
                        # Yield as a structured internal string that our SSE router can parse easily
                        fc_data = json.dumps({
                            "__tool_call": True,
                            "name": fc.name,
                            "args": args_dict
                        })
                        yield fc_data + "\n"
                elif chunk.text:
                    chunk_count += 1
                    # Log para debug no terminal
                    print(f"Yielding chunk {chunk_count}: {str(chunk.text)[:40].replace(chr(10), ' ')}")
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
    user_name: str | None = None,
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
        message, chat_history, user_name, maturity_score, dream, business_type,
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
            history_text += f"{role}: {content}\n"

    prompt = f"Sumarize o perfil do usuário:\nResumo Anterior: {current_summary}\nNovas: {history_text}"

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

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

# Inicializa o cliente Gemini
client = genai.Client(api_key=settings.GEMINI_API_KEY)


def get_embedding(text: str) -> list[float]:
    """Gera embedding usando o modelo do Gemini."""
    response = client.models.embed_content(
        model="models/gemini-embedding-001",
        contents=text
    )
    return response.embeddings[0].values


async def search_knowledge(query: str, limit: int = 5) -> str:
    """Busca conhecimento relevante no Supabase usando busca vetorial."""
    from app.routers.chat import _get_db
    
    try:
        embedding = get_embedding(query)
        db = _get_db()
        
        # Chama a função RPC personalizada do Supabase (precisa estar criada no DB)
        # O nome da função no SQL seria 'match_knowledge'
        rpc_params = {
            "query_embedding": embedding,
            "match_threshold": 0.5,
            "match_count": limit,
        }
        
        resp = db.rpc("match_knowledge", rpc_params).execute()
        
        if not resp.data:
            return ""
            
        context_parts = []
        for match in resp.data:
            content = match.get("content", "")
            source = match.get("metadata", {}).get("filename", "desconhecido")
            context_parts.append(f"--- Fonte: {source} ---\n{content}")
            
        return "\n\n".join(context_parts)
    except Exception as e:
        print(f"Erro na busca vetorial: {e}")
        return ""


async def transcribe_audio(file_bytes: bytes, mime_type: str) -> str:
    """Transcreve áudio usando Gemini Flash (rápido e barato)."""
    try:
        prompt = "Transcreva o seguinte áudio fielmente. Retorne APENAS o texto transcrito, sem comentários."
        
        response = client.models.generate_content(
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
                temperature=0.0, # Mais determinístico para transcrição
            ),
        )
        return response.text.strip() if response.text else ""
    except Exception as e:
        print(f"Erro na transcrição: {e}")
        return ""


def _build_chat_history(messages: list[dict]) -> list[types.Content]:
    """Converte histórico do banco em formato Gemini."""
    history = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        history.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.get("content", ""))],
            )
        )
    return history


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
    pending_messages: list[str] | None = None, # Recebe as mensagens que ficaram sem resposta
    replied_to_content: str | None = None, # Conteúdo da mensagem citada (Reply)
):
    """
    Gera resposta da IA via streaming.
    Suporta mensagens multimodal (texto + arquivo).

    Se is_onboarding=True, usa o prompt de onboarding conversacional.
    Caso contrário, usa o prompt de mentor com nível de maturidade.

    Yields chunks de texto conforme o Gemini responde.
    """
    if is_onboarding:
        system_prompt = build_onboarding_prompt()
    else:
        system_prompt = build_system_prompt(
            maturity_score or 10, 
            dream or "crescer o negócio", 
            business_type or "empreendedor",
            user_summary
        )

    # Se o usuário está respondendo a uma mensagem específica (Reply)
    if replied_to_content:
        system_prompt += (
            f"\n\n## CONTEXTO DE RESPOSTA (REPLY)\n"
            f"O usuário está respondendo especificamente à seguinte mensagem anterior:\n"
            f"{replied_to_content}\n"
            f"Leve isso em conta para dar uma resposta direta e contextualizada."
        )

    # Se houver mensagens pendentes de erros passados, avisa a IA
    if pending_messages:
        pending_context = "\n".join([f"- {m}" for m in pending_messages])
        system_prompt += (
            f"\n\n## ATENÇÃO: MENSAGENS PENDENTES\n"
            f"As seguintes mensagens do usuário foram enviadas anteriormente mas não foram processadas por erro técnico.\n"
            f"Por favor, responda a elas agora antes de prosseguir com o assunto atual:\n"
            f"{pending_context}"
        )

    # RAG: Busca conhecimento relevante
    knowledge_context = await search_knowledge(message)
    if knowledge_context:
        system_prompt += (
            "\n\n## Conhecimento Extraído da Base (Referência Técnica)\n"
            "Utilize as informações oficiais abaixo para fundamentar sua resposta técnica:\n"
            + knowledge_context
        )

    # Monta as partes da mensagem do usuário
    user_parts = []

    if file_bytes and file_mime:
        user_parts.append(
            types.Part.from_bytes(data=file_bytes, mime_type=file_mime)
        )

    if message:
        user_parts.append(types.Part.from_text(text=message))

    # Monta o conteúdo completo
    history = _build_chat_history(chat_history)
    history.append(
        types.Content(role="user", parts=user_parts)
    )

    # Chamada streaming ao Gemini
    response = client.models.generate_content_stream(
        model=settings.GEMINI_MODEL,
        contents=history,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.7,
            max_output_tokens=8192,
        ),
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text


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
    """Versão não-streaming (para testes ou fallback)."""
    full_response = []
    async for chunk in generate_response_stream(
        message, chat_history, maturity_score, dream, business_type,
        is_onboarding, file_bytes, file_mime, user_summary
    ):
        full_response.append(chunk)
    return "".join(full_response)


async def summarize_context(current_summary: str | None, recent_messages: list[dict]) -> str:
    """
    Gera um novo resumo combinando o resumo anterior e as mensagens recentes.
    """
    # Converte mensagens para texto simples
    history_text = ""
    for msg in recent_messages:
        role = "Usuário" if msg["role"] == "user" else "Meu MEI"
        content = msg.get("content", "")
        if content:
            history_text += f"{role}: {content}\n"

    prompt = f"""
Você é um especialista em sumarização de contexto para assistentes de IA.
Seu objetivo é criar um perfil atualizado do usuário com base no resumo anterior (se houver) e nas novas interações.

## Resumo Anterior:
{current_summary or "Nenhum resumo anterior."}

## Novas Interações:
{history_text}

## Instruções:
1. Atualize o resumo mantendo fatos importantes: Nome, Tipo de Negócio (ramo), Grande Sonho, Dores/Dificuldades Financeiras, Faturamento/Custos mencionados.
2. Descarte cumprimentos ou conversas triviais.
3. Se houver informações conflitantes, priorize as mais recentes.
4. Mantenha o texto conciso, direto e informativo.
5. SAÍDA: Apenas o texto do novo resumo.
"""

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.5,
            max_output_tokens=1024,
        ),
    )
    
    return response.text if response.text else (current_summary or "")

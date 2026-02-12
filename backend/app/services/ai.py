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


def _load_knowledge_context() -> str:
    """
    Carrega arquivos .txt e .md da pasta knowledge/ como contexto adicional.
    PDFs são referenciados mas não parseados aqui (Gemini aceita PDF direto).
    """
    context_parts = []
    knowledge_dir = settings.KNOWLEDGE_DIR

    if not os.path.exists(knowledge_dir):
        return ""

    for filename in os.listdir(knowledge_dir):
        filepath = os.path.join(knowledge_dir, filename)
        if filename.endswith((".txt", ".md")) and os.path.isfile(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                context_parts.append(
                    f"\n--- Documento de Referência: {filename} ---\n{content}\n"
                )

    return "\n".join(context_parts)


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
    is_onboarding: bool = False,
    file_bytes: bytes | None = None,
    file_mime: str | None = None,
    user_summary: str | None = None,
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
            maturity_score or 10, dream or "crescer o negócio", user_summary
        )

    knowledge_context = _load_knowledge_context()
    if knowledge_context:
        system_prompt += (
            "\n\n## Base de Conhecimento (Grounding)\n"
            "Use as informações abaixo como referência para fundamentar suas respostas:\n"
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
    is_onboarding: bool = False,
    file_bytes: bytes | None = None,
    file_mime: str | None = None,
    user_summary: str | None = None,
) -> str:
    """Versão não-streaming (para testes ou fallback)."""
    full_response = []
    async for chunk in generate_response_stream(
        message, chat_history, maturity_score, dream,
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

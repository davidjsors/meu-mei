import edge_tts
import io
import base64
import asyncio

async def text_to_speech_base64(text: str, voice: str = "pt-BR-FranciscaNeural") -> str:
    """
    Converte texto em áudio usando Edge TTS e retorna como uma Data URL base64.
    Para evitar travamento do WebSockets com textos longos (comum no edge-tts), 
    o texto é quebrado e enviado em "chunks" menores.
    """
    import re
    try:
        sentences = re.split(r'(?<=[.!?]) +', text.strip())
        audio_data = b""
        
        chunk_text = ""
        chunks = []
        for s in sentences:
            if len(chunk_text) + len(s) > 300:
                chunks.append(chunk_text)
                chunk_text = s
            else:
                chunk_text += " " + s if chunk_text else s
        if chunk_text:
            chunks.append(chunk_text)

        for c in chunks:
            communicate = edge_tts.Communicate(c, voice)
            async for chunk_ev in communicate.stream():
                if chunk_ev["type"] == "audio":
                    audio_data += chunk_ev["data"]
            
        if not audio_data: return ""
            
        b64 = base64.b64encode(audio_data).decode("utf-8")
        return f"data:audio/mpeg;base64,{b64}"
    except Exception as e:
        print(f"Erro ao gerar áudio com Edge TTS: {e}")
        return ""

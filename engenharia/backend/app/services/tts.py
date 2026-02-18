import edge_tts
import io
import base64
import asyncio

async def text_to_speech_base64(text: str, voice: str = "pt-BR-FranciscaNeural") -> str:
    """
    Converte texto em áudio usando Edge TTS e retorna como uma Data URL base64.
    """
    try:
        communicate = edge_tts.Communicate(text, voice)
        # edge-tts doesn't direct write to buffer easily without file, but we can iterate chunks
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        if not audio_data:
            return ""
            
        b64 = base64.b64encode(audio_data).decode("utf-8")
        return f"data:audio/mpeg;base64,{b64}"
    except Exception as e:
        print(f"Erro ao gerar áudio com Edge TTS: {e}")
        return ""

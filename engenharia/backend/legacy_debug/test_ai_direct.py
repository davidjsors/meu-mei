import asyncio
import os
from dotenv import load_dotenv

# Mock app.config settings
class Settings:
    GEMINI_API_KEYS = []
    GEMINI_MODEL = "gemini-2.0-flash"

load_dotenv()
api_keys_raw = os.getenv("GEMINI_API_KEY", "")
Settings.GEMINI_API_KEYS = [k.strip() for k in api_keys_raw.split(",") if k.strip()]

# Instead of importing from app.services.ai (which might have relative import issues in this script),
# I'll just copy the relevant logic or import it carefully.
import sys
sys.path.append(os.getcwd())

from app.services.ai import generate_response_stream

async def main():
    print("Iniciando teste direto do stream...")
    history = []
    message = "Oi, como voce pode me ajudar?"
    
    try:
        async for chunk in generate_response_stream(
            message=message,
            chat_history=history,
            is_onboarding=False
        ):
            print(f"CHUNK RECEBIDO: {chunk}")
    except Exception as e:
        print(f"ERRO NO TESTE: {e}")

if __name__ == "__main__":
    asyncio.run(main())

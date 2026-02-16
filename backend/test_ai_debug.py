import asyncio
import os
from dotenv import load_dotenv
import sys

load_dotenv()

# Setup paths
sys.path.append(os.getcwd())
from app.services.ai import generate_response_stream

async def main():
    print("Iniciando teste detalhado do stream...")
    history = []
    message = "Oi, como voce pode me ajudar?"
    
    try:
        # Força o logging de erro fatal para ver o que está acontecendo
        async for chunk in generate_response_stream(
            message=message,
            chat_history=history,
            is_onboarding=False
        ):
            print(f"CHUNK: {chunk}")
    except Exception as e:
        print(f"\nERRO FINAL CAPTURADO: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(main())

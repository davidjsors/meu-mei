import asyncio
import os
from dotenv import load_dotenv
import sys

load_dotenv()
sys.path.append(os.getcwd())
from app.services.ai import generate_response_stream

async def main():
    with open("debug_results.txt", "w", encoding="utf-8") as f:
        f.write("Iniciando teste...\n")
        history = []
        message = "Oi, como voce pode me ajudar?"
        
        try:
            async for chunk in generate_response_stream(
                message=message,
                chat_history=history,
                is_onboarding=False
            ):
                f.write(f"CHUNK: {chunk}\n")
                f.flush()
        except Exception as e:
            f.write(f"\nERRO: {type(e).__name__}: {str(e)}\n")
            import traceback
            f.write(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(main())

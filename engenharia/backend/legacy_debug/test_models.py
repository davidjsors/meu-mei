import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

keys = os.getenv("GEMINI_API_KEY", "").split(",")
for i, key in enumerate(keys):
    key = key.strip()
    if not key: continue
    print(f"\n--- TESTANDO CHAVE {i} ({key[:10]}...) ---")
    client = genai.Client(api_key=key)
    for model_name in ["gemini-1.5-flash", "gemini-2.0-flash"]:
        try:
            resp = client.models.generate_content(model=model_name, contents="test")
            print(f"✅ {model_name}: OK")
            break # Se uma funcionou, essa chave tá boa
        except Exception as e:
            print(f"❌ {model_name}: {str(e)[:100]}")

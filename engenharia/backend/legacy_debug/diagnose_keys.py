import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

keys = os.getenv("GEMINI_API_KEY", "").split(",")
for i, key in enumerate(keys):
    key = key.strip()
    if not key: continue
    print(f"\n--- CHAVE {i} ({key[:10]}...) ---")
    try:
        client = genai.Client(api_key=key)
        # Testando com o modelo mais básico e provável
        resp = client.models.generate_content(model="gemini-2.0-flash", contents="Test")
        print("✅ OK")
    except Exception as e:
        print(f"❌ ERRO: {e}")

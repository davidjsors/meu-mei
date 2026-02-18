import os
from google import genai
from dotenv import load_dotenv
import time

load_dotenv()

keys_raw = os.getenv("GEMINI_API_KEY", "")
keys = [k.strip() for k in keys_raw.split(",") if k.strip()]
print(f"Total de chaves: {len(keys)}")

for i, key in enumerate(keys):
    print(f"\n--- CHAVE {i} ({key[-4:]}) ---")
    client = genai.Client(api_key=key)
    for model in ["gemini-1.5-flash", "gemini-2.0-flash"]:
        try:
            resp = client.models.generate_content(model=model, contents="Test")
            print(f"  [OK] {model}")
        except Exception as e:
            print(f"  [ERRO] {model}: {str(e)[:50]}")
    time.sleep(1)

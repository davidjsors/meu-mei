import os
from google import genai
from dotenv import load_dotenv
import time

load_dotenv()

keys_raw = os.getenv("GEMINI_API_KEY", "")
keys = [k.strip() for k in keys_raw.split(",") if k.strip()]
print(f"Total de chaves encontradas: {len(keys)}")

for i, key in enumerate(keys):
    print(f"\n--- TESTANDO CHAVE {i} ---")
    try:
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(model="gemini-2.0-flash", contents="Test")
        print(f"✅ CHAVE {i}: FUNCIONANDO!")
    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            print(f"❌ CHAVE {i}: 429 (Limite esgotado)")
        elif "400" in err_str:
            print(f"❌ CHAVE {i}: 400 (Chave inválida ou erro de argumento)")
        else:
            print(f"❌ CHAVE {i}: OUTRO ERRO -> {err_str[:200]}")
    time.sleep(1) # Evita spam

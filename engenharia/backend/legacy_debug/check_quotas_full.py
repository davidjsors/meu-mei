import os
from google import genai
from dotenv import load_dotenv
import time

load_dotenv()

keys_raw = os.getenv("GEMINI_API_KEY", "")
keys = [k.strip() for k in keys_raw.split(",") if k.strip()]
keys = [k.strip() for k in keys_raw.split(",") if k.strip()]
print(f"Total de chaves: {len(keys)}")
for k in keys:
    print(f"  - Key: ...{k[-4:]}")

for i, key in enumerate(keys):
    print(f"\n--- CHAVE {i} ({key[-4:]}) ---")
    client = genai.Client(api_key=key)
    # Testing models with models/ prefix
    env_model = os.getenv("GEMINI_MODEL", "models/gemini-2.0-flash")
    for model in [env_model, "models/gemini-2.0-flash"]:
        try:
            resp = client.models.generate_content(model=model, contents="Test")
            print(f"  [OK] {model}")
        except Exception as e:
            msg = str(e)
            if "429" in msg:
                print(f"  [429] {model}: Quota esgotada")
            elif "404" in msg:
                print(f"  [404] {model}: Nao encontrado")
            else:
                print(f"  [ERRO] {model}: {msg[:50]}")
    time.sleep(0.5)

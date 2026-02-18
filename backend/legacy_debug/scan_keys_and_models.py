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
    try:
        client = genai.Client(api_key=key)
        # Test model availability
        models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"]
        for model in models:
            try:
                resp = client.models.generate_content(model=model, contents="Oi")
                print(f"  [OK] Model {model} funcionando!")
                break
            except Exception as e:
                err = str(e)
                if "429" in err:
                    print(f"  [429] Model {model}: Quota esgotada.")
                elif "404" in err:
                    print(f"  [404] Model {model}: Nao encontrado.")
                else:
                    print(f"  [ERRO] Model {model}: {err[:50]}")
    except Exception as e:
        print(f"  [FALHA GERAL] {e}")
    time.sleep(0.5)

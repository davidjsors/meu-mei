import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

keys = os.getenv("GEMINI_API_KEY", "").split(",")
models_to_test = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-exp"]

for i, key in enumerate(keys):
    key = key.strip()
    if not key: continue
    client = genai.Client(api_key=key)
    for m in models_to_test:
        try:
            client.models.generate_content(model=m, contents="hi")
            print(f"SUCESSO: Chave {i} com modelo {m}")
            exit(0)
        except Exception as e:
            if "404" in str(e):
                print(f"404: Chave {i} não conhece {m}")
            elif "429" in str(e):
                print(f"429: Chave {i} esgotada para {m}")
            else:
                print(f"ERRO: Chave {i} / {m} -> {e}")
print("NENHUMA combinação funcionou.")

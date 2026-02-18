import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY", "").split(",")[0].strip()
client = genai.Client(api_key=key)

print("Modelos disponiveis:")
for model in client.models.list():
    print(f"- {model.name} (ID: {model.name})")

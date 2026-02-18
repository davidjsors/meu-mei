
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY", "").split(",")[0].strip()
print(f"Using key: {key[:5]}...{key[-5:]}")

try:
    client = genai.Client(api_key=key)
    with open("models_dump.txt", "w", encoding="utf-8") as f:
        f.write("Modelos disponiveis:\n")
        for model in client.models.list():
            f.write(f"- {model.name} (DisplayName: {model.display_name})\n")
    print("Models dumped to models_dump.txt")
except Exception as e:
    print(f"Error: {e}")

import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY", "").split(",")[0].strip()
client = genai.Client(api_key=key)

with open("available_models.txt", "w") as f:
    for model in client.models.list():
        f.write(f"{model.name}\n")
print("Lista salva em available_models.txt")

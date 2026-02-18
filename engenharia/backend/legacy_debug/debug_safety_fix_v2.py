
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GEMINI_API_KEY", "").split(",")[0].strip()
client = genai.Client(api_key=key)

print(f"Testing with key: {key[:5]}...")

# Try to find the correct threshold enum by inspecting types
try:
    # Based on truncation, it might be HarmBlockThreshold
    threshold_enum = types.HarmBlockThreshold
    print("Found HarmBlockThreshold")
except AttributeError:
    print("HarmBlockThreshold not found, trying to inspect...")
    # fallback
    threshold_enum = None

if threshold_enum:
    print("Using HarmBlockThreshold")
    safety_settings_current = [
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold=threshold_enum.BLOCK_NONE
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold=threshold_enum.BLOCK_NONE
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold=threshold_enum.BLOCK_NONE
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=threshold_enum.BLOCK_NONE
        ),
    ]

    print("Trying current settings with HarmBlockThreshold...")
    try:
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents="Hello settings",
            config=types.GenerateContentConfig(
                safety_settings=safety_settings_current
            )
        )
        print("Success with HarmBlockThreshold settings!")
        print(response.text)
    except Exception as e:
        print(f"Failed with HarmBlockThreshold settings: {e}")
else:
    print("Could not find threshold enum.")

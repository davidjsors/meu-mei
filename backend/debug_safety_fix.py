
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GEMINI_API_KEY", "").split(",")[0].strip()
client = genai.Client(api_key=key)

print(f"Testing with key: {key[:5]}...")

# Settings as they are in the file currently
safety_settings_current = [
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=types.HarmContentBlockThreshold.BLOCK_NONE
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=types.HarmContentBlockThreshold.BLOCK_NONE
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold=types.HarmContentBlockThreshold.BLOCK_NONE
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=types.HarmContentBlockThreshold.BLOCK_NONE
    ),
]

print("Trying current settings...")
try:
    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents="Hello settings",
        config=types.GenerateContentConfig(
            safety_settings=safety_settings_current
        )
    )
    print("Success with current settings!")
    print(response.text)
except Exception as e:
    print(f"Failed with current settings: {e}")

# Try with simple strings if the above fails
print("\nTrying with simplified strings (HARM_CATEGORY_...)...")
try:
    safety_settings_strings = [
        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
    ]
    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents="Hello strings",
        config=types.GenerateContentConfig(
            safety_settings=safety_settings_strings
        )
    )
    print("Success with string settings!")
    print(response.text)
except Exception as e:
    print(f"Failed with string settings: {e}")

# Try with no settings
print("\nTrying with NO safety settings...")
try:
    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents="Hello no settings",
        config=types.GenerateContentConfig()
    )
    print("Success with NO settings!")
    print(response.text)
except Exception as e:
    print(f"Failed with NO settings: {e}")

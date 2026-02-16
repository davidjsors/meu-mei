
from google import genai
from google.genai import types

print("HarmCategory members:")
try:
    # Attempt to list attributes of HarmCategory if it's an enum-like object
    # Or just print dir(types.HarmCategory)
    # The error message mentioned type.googleapis.com/google.ai.generativelanguage.v1beta.HarmCategory
    
    # In the new SDK, it might be separate.
    # Let's check available attributes in types related to safety.
    
    print(dir(types.HarmCategory))
except Exception as e:
    print(f"Error accessing HarmCategory: {e}")

# Also try to create a client and see what it expects if possible, but inspection is better.


from google.genai import types

print("HarmCategory attributes:")
for attr in dir(types.HarmCategory):
    if attr.isupper():
        print(attr)

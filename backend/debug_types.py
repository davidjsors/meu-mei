
from google.genai import types

print("Attributes of google.genai.types:")
for attr in dir(types):
    if attr.isupper():
        print(attr)

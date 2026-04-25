import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def list_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: No GEMINI_API_KEY found.")
        return

    client = genai.Client(api_key=api_key, http_options={'api_version': 'v1beta'})
    
    print("Available Models (v1beta):")
    for model in client.models.list():
        print(f" - {model.name}")

if __name__ == "__main__":
    list_models()

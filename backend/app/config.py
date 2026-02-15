"""
Configuração central do backend MeuMEI.
Carrega variáveis de ambiente.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Google Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")

    # Knowledge base path
    KNOWLEDGE_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "knowledge"
    )


settings = Settings()

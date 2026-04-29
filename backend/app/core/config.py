import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    LLM_URL = os.getenv("LLM_URL", "http://10.10.3.2:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "")

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL", "")

    MONGODB_URI = os.getenv("MONGODB_URI", "")

    ENV = os.getenv("ENV", "development")
    JWT_SECRET = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

settings = Settings()
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    LLM_URL = os.getenv("LLM_URL", "http://10.10.3.10:11434")
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    MONGODB_URI = os.getenv("MONGODB_URI", "")
    ENV = os.getenv("ENV", "development")
    JWT_SECRET = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

settings = Settings()
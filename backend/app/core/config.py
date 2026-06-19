import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ReguFlow AI"
    
    # Database Configuration
    # Fallback to local sqlite or placeholder if DATABASE_URL is not set
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/postgres"
    )
    
    # Security Configuration
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "sb_publishable_RRgq-hFweC6PptaSiJgzrw_aKukmLXp")
    
    # AI API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    REGUFLOW_API_KEY: str = os.getenv("REGUFLOW_API_KEY", "")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

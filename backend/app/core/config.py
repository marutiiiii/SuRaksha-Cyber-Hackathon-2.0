import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ReguFlow AI"
    
    # Environment mode: development or production
    ENV: str = os.getenv("ENV", "development")
    
    # Whether to allow mock auth token bypass ("mock-access-token")
    ALLOW_MOCK_AUTH: bool = os.getenv("ALLOW_MOCK_AUTH", "True").lower() in ("true", "1", "yes")
    
    # CORS Configuration - comma-separated list of origins
    BACKEND_CORS_ORIGINS: list = [
        x.strip() for x in os.getenv("BACKEND_CORS_ORIGINS", "*").split(",") if x.strip()
    ]
    
    # Custom root storage directory (optional, defaults to local folder inside backend)
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "")
    
    @property
    def STORAGE_PATH(self) -> str:
        if self.STORAGE_DIR:
            return self.STORAGE_DIR
        return os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
            "storage"
        )

    # Database Configuration
    # Fallback to local sqlite file when DATABASE_URL is not set
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./backend.db"
    )
    
    # ChromaDB Configuration
    CHROMADB_PATH: str = os.getenv("CHROMADB_PATH", "./chroma_db")
    
    # Security Configuration
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "sb_publishable_RRgq-hFweC6PptaSiJgzrw_aKukmLXp")
    
    # AI API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    REGUFLOW_API_KEY: str = os.getenv("REGUFLOW_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama3-8b-8192")
    QWEN_MODEL_PATH: str = os.getenv("QWEN_MODEL_PATH", "C:/AI-Models/Qwen2.5-VL-3B-Instruct")
    
    # Embedding Configuration
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")
    
    # Ollama Local Configuration
    # Preferred: llama3, fallback: llama3.2, qwen2.5:7b, qwen3
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
    OLLAMA_PREFERRED_MODELS: list = ["llama3", "llama3.2", "qwen2.5:7b", "qwen3", "tinyllama"]

    # ReguFlow Validation Engine — local Qwen2.5-VL-3B-Instruct model path
    # Used for AI-powered MAP evidence verification
    QWEN_MODEL_PATH: str = os.getenv("QWEN_MODEL_PATH", "D:/AI-Models/Qwen2.5-VL-3B-Instruct")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

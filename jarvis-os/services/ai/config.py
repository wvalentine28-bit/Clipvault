from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    app_name: str = "JARVIS AI Service"
    debug: bool = False
    port: int = 8080

    # Database
    database_url: str = "postgresql://jarvis:jarvispassword@localhost:5432/jarvisdb"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # AI Providers
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"

    # Vector DB
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    pinecone_api_key: Optional[str] = None
    pinecone_index: str = "jarvis-memory"

    # Search
    serpapi_api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None

    # Wake word
    picovoice_api_key: Optional[str] = None
    wake_word_sensitivity: float = 0.5

    # Whisper
    whisper_model: str = "base"

    # Security
    api_secret: str = "jarvis-internal-secret"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

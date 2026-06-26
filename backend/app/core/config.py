from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from functools import lru_cache

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

class Settings(BaseSettings):
    APP_NAME: str = "Siya Dental Care API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = Field(default=True)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/dentassist"
    SECRET_KEY: str = "change-me"
    CRON_SECRET: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"
    WA_PHONE_NUMBER_ID: str = ""
    WA_ACCESS_TOKEN: str = ""
    WA_VERIFY_TOKEN: str = "dentassist-verify"
    WA_APP_SECRET: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    ANTHROPIC_API_KEY: str = ""
    N8N_BASE_URL: str = "http://localhost:5678"

    model_config = {"env_file": str(ENV_FILE), "extra": "ignore"}

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            v_lower = v.strip().lower()
            if v_lower in ("true", "1", "yes", "on", "release"):  # tolerate 'release' as truthy for dev
                return True
            return False
        return bool(v)

@lru_cache
def get_settings() -> Settings:
    return Settings()

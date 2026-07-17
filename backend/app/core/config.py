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
    GOOGLE_PLACES_API_KEY: str = ""
    GOOGLE_REVIEWS_SYNC_ENABLED: bool = True
    GOOGLE_REVIEWS_SYNC_MINUTES: int = 360
    GOOGLE_REVIEWS_STARTUP_DELAY_SECONDS: int = 5
    N8N_BASE_URL: str = "http://localhost:5678"

    model_config = {"env_file": str(ENV_FILE), "extra": "ignore"}

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v):
        if not isinstance(v, str):
            return v
        url = v.strip()
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://") and "+asyncpg" not in url:
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

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
    s = Settings()
    # Refuse to run outside DEBUG with the default JWT signing key — forged
    # staff tokens (including admin) would be trivial otherwise.
    if not s.DEBUG and s.SECRET_KEY == "change-me":
        raise RuntimeError(
            "SECRET_KEY is still the default 'change-me'. "
            "Set a strong SECRET_KEY in backend/.env before running with DEBUG=false."
        )
    return s

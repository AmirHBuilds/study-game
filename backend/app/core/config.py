import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://studygame:studygame@localhost:5432/studygame",
    )
    app_name: str = "Study Garden API"


settings = Settings()

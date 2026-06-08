from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    MEDIA_DIR: str
    THUMBNAIL_DIR: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

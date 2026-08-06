from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="OPS_", env_file=".env", extra="ignore")

    data_mode: Literal["mock", "live"] = "mock"
    db_path: str = ""
    knowledge_root: str = ""
    ops_token: str = ""
    host: str = "127.0.0.1"
    port: int = 8000


@lru_cache
def get_settings() -> Settings:
    return Settings()

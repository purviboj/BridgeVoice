from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    app_env: str = Field(default='development', alias='APP_ENV')
    openai_api_key: str = Field(default='', alias='OPENAI_API_KEY')
    elevenlabs_api_key: str = Field(default='', alias='ELEVENLABS_API_KEY')
    supabase_url: str = Field(default='', alias='SUPABASE_URL')
    supabase_service_key: str = Field(default='', alias='SUPABASE_SERVICE_KEY')
    default_target_language: str = Field(default='es', alias='DEFAULT_TARGET_LANGUAGE')
    backend_api_token: str = Field(default='', alias='BACKEND_API_TOKEN')
    rate_limit_per_minute: int = Field(default=90, alias='RATE_LIMIT_PER_MINUTE')
    websocket_connects_per_minute: int = Field(default=30, alias='WEBSOCKET_CONNECTS_PER_MINUTE')
    max_audio_chunk_bytes: int = Field(default=2_500_000, alias='MAX_AUDIO_CHUNK_BYTES')
    ws_max_message_chars: int = Field(default=3000, alias='WS_MAX_MESSAGE_CHARS')
    allowed_hosts: str = Field(default='localhost,127.0.0.1', alias='ALLOWED_HOSTS')
    medical_terms_dataset_paths: str = Field(
        default=(
            '/Users/saha/Downloads/archive (2)/full_data.csv,'
            '/Users/saha/Downloads/archive (2)/pretrain_subset/train.csv,'
            '/Users/saha/Downloads/archive (2)/pretrain_subset/valid.csv,'
            '/Users/saha/Downloads/archive (2)/pretrain_subset/test.csv'
        ),
        alias='MEDICAL_TERMS_DATASET_PATHS',
    )
    medical_terms_max_rows_per_file: int = Field(
        default=120000,
        alias='MEDICAL_TERMS_MAX_ROWS_PER_FILE',
    )
    medical_terms_max_unique_labels: int = Field(
        default=50000,
        alias='MEDICAL_TERMS_MAX_UNIQUE_LABELS',
    )
    frontend_origins: str = Field(
        default='http://localhost:3000,http://127.0.0.1:3000',
        alias='FRONTEND_ORIGINS'
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

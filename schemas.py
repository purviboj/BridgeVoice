from datetime import datetime
from pydantic import BaseModel, Field


class TranscriptEvent(BaseModel):
    text: str
    source_language: str = 'en'
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TranslationEvent(BaseModel):
    text: str
    target_language: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SummaryEvent(BaseModel):
    summary: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SessionRecord(BaseModel):
    session_id: str
    transcript: str
    translation: str | None = None
    summary: str | None = None
    user_id: str = 'anonymous'
    source_language: str = 'English'
    target_language: str = 'Spanish'
    created_at: datetime = Field(default_factory=datetime.utcnow)

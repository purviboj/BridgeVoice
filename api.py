from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class StartRecordingRequest(BaseModel):
    patient_id: str = Field(min_length=1)
    source_language: str = Field(default='en', min_length=2, max_length=10)
    target_language: str = Field(default='es', min_length=2, max_length=10)


class StartRecordingResponse(BaseModel):
    session_id: str
    status: str
    started_at: datetime


class ProcessAudioResponse(BaseModel):
    transcript: str
    timestamp: str


class GenerateSummaryRequest(BaseModel):
    session_id: str = Field(min_length=1)
    transcript: str = Field(min_length=1)


class GenerateSummaryResponse(BaseModel):
    session_id: str
    summary: str


class GenerateVisitSummaryRequest(BaseModel):
    transcript: str = Field(min_length=1)
    target_language: Literal['English', 'Spanish', 'French', 'Hindi'] = 'English'


class GenerateVisitSummaryResponse(BaseModel):
    summary: str


class RiskAnalysisRequest(BaseModel):
    transcript: str = Field(min_length=1)


class RiskAnalysisResponse(BaseModel):
    risk_level: Literal['low', 'medium', 'high']
    alert: str


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1)
    target_language: Literal['English', 'Spanish', 'French', 'Hindi']


class TranslateResponse(BaseModel):
    translated_text: str


class TextToSpeechRequest(BaseModel):
    translated_text: str = Field(min_length=1)
    voice_id: str = Field(min_length=1)


class ImpactMetricsResponse(BaseModel):
    visits_processed: int
    languages_translated: int
    summaries_generated: int
    patients_helped: int

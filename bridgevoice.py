from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from models.api import (
    GenerateSummaryRequest,
    GenerateSummaryResponse,
    GenerateVisitSummaryRequest,
    GenerateVisitSummaryResponse,
    ImpactMetricsResponse,
    ProcessAudioResponse,
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    StartRecordingRequest,
    StartRecordingResponse,
    TextToSpeechRequest,
    TranslateRequest,
    TranslateResponse,
)
from services.ai_service import OpenAIService
from services.risk_detection_service import RiskDetectionService
from services.session_service import SessionService
from services.speech_service import ElevenLabsSpeechService
from services.translation_service import TranslationService
from services.tts_service import ElevenLabsTTSService
from utils.config import get_settings
from utils.security import api_rate_limit, require_api_token

router = APIRouter(tags=['bridgevoice'])
settings = get_settings()
ai_service = OpenAIService()
speech_service = ElevenLabsSpeechService()
tts_service = ElevenLabsTTSService()
translation_service = TranslationService()
risk_detection_service = RiskDetectionService()
session_service = SessionService()


@router.post('/start-recording', response_model=StartRecordingResponse)
async def start_recording(
    payload: StartRecordingRequest,
    _auth: None = Depends(require_api_token),
    _rate: None = Depends(api_rate_limit),
) -> StartRecordingResponse:
    _ = payload
    return StartRecordingResponse(
        session_id=str(uuid4()),
        status='recording_started',
        started_at=datetime.utcnow(),
    )


@router.post('/process-audio', response_model=ProcessAudioResponse)
async def process_audio(
    audio_chunk: UploadFile = File(...),
    language: str = Form(default='en'),
    _auth: None = Depends(require_api_token),
    _rate: None = Depends(api_rate_limit),
) -> ProcessAudioResponse:
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=500, detail='ELEVENLABS_API_KEY is not configured.')

    audio_bytes = await audio_chunk.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail='Empty audio chunk.')
    if len(audio_bytes) > settings.max_audio_chunk_bytes:
        raise HTTPException(status_code=413, detail='Audio chunk exceeds allowed size.')

    transcript = await speech_service.transcribe_audio(
        audio_bytes=audio_bytes,
        filename=audio_chunk.filename or 'chunk.webm',
        content_type=audio_chunk.content_type or 'audio/webm',
        language=language,
    )
    return ProcessAudioResponse(
        transcript=transcript,
        timestamp=datetime.utcnow().isoformat(),
    )


@router.post('/generate-summary', response_model=GenerateSummaryResponse)
async def generate_summary(
    payload: GenerateSummaryRequest,
    _auth: None = Depends(require_api_token),
    _rate: None = Depends(api_rate_limit),
) -> GenerateSummaryResponse:
    summary = await ai_service.summarize_medical_text(payload.transcript)
    return GenerateSummaryResponse(session_id=payload.session_id, summary=summary)


@router.post('/generate-visit-summary', response_model=GenerateVisitSummaryResponse)
async def generate_visit_summary(
    payload: GenerateVisitSummaryRequest,
    _auth: None = Depends(require_api_token),
    _rate: None = Depends(api_rate_limit),
) -> GenerateVisitSummaryResponse:
    summary = await ai_service.generate_patient_visit_summary(payload.transcript)
    if payload.target_language != 'English':
        summary = await translation_service.translate_text(summary, payload.target_language)
    return GenerateVisitSummaryResponse(summary=summary)


@router.post('/translate', response_model=TranslateResponse)
async def translate(
    payload: TranslateRequest,
    _auth: None = Depends(require_api_token),
    _rate: None = Depends(api_rate_limit),
) -> TranslateResponse:
    try:
        translated_text = await translation_service.translate_text(payload.text, payload.target_language)
        return TranslateResponse(translated_text=translated_text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'Translation service failed: {exc}') from exc


@router.post('/detect-risk', response_model=RiskAnalysisResponse)
async def detect_risk(
    payload: RiskAnalysisRequest,
    _auth: None = Depends(require_api_token),
    _rate: None = Depends(api_rate_limit),
) -> RiskAnalysisResponse:
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail='OPENAI_API_KEY is not configured.')

    result = await risk_detection_service.detect_risk(payload.transcript)
    return RiskAnalysisResponse(risk_level=result['risk_level'], alert=result['alert'])


@router.post('/text-to-speech')
async def text_to_speech(
    payload: TextToSpeechRequest,
    _auth: None = Depends(require_api_token),
    _rate: None = Depends(api_rate_limit),
) -> StreamingResponse:
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=500, detail='ELEVENLABS_API_KEY is not configured.')

    audio_stream = tts_service.stream_text_to_speech(
        translated_text=payload.translated_text,
        voice_id=payload.voice_id,
    )
    return StreamingResponse(
        audio_stream,
        media_type='audio/mpeg',
        headers={'Content-Disposition': 'inline; filename=bridgevoice-tts.mp3'},
    )


@router.get('/impact-metrics', response_model=ImpactMetricsResponse)
async def impact_metrics(
    _rate: None = Depends(api_rate_limit),
) -> ImpactMetricsResponse:
    try:
        metrics = session_service.get_impact_metrics()
        return ImpactMetricsResponse(**metrics)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Unable to load impact metrics: {exc}') from exc

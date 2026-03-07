import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from models.schemas import SessionRecord
from services.ai_service import OpenAIService
from services.session_service import SessionService
from services.translation_service import TranslationService
from utils.config import get_settings
from utils.logger import get_logger
from utils.security import enforce_websocket_security

router = APIRouter(tags=['websocket'])
logger = get_logger(__name__)
settings = get_settings()
ai_service = OpenAIService()
session_service = SessionService()
translation_service = TranslationService()


def normalize_language_name(value: str) -> str:
    normalized = (value or '').strip().lower()
    language_map = {
        'english': 'English',
        'en': 'English',
        'spanish': 'Spanish',
        'es': 'Spanish',
        'french': 'French',
        'fr': 'French',
        'hindi': 'Hindi',
        'hi': 'Hindi',
    }
    return language_map.get(normalized, 'Spanish')


@router.websocket('/ws/session/{session_id}')
async def session_socket(websocket: WebSocket, session_id: str) -> None:
    await enforce_websocket_security(websocket)
    if websocket.application_state == WebSocketState.DISCONNECTED:
        return
    await websocket.accept()
    await websocket.send_json(
        {
            'type': 'status',
            'payload': 'Connected to BridgeVoice session',
            'timestamp': datetime.utcnow().isoformat()
        }
    )

    transcript_buffer: list[str] = []

    try:
        while True:
            raw = await websocket.receive_text()
            if len(raw) > settings.ws_max_message_chars:
                await websocket.send_json(
                    {
                        'type': 'error',
                        'payload': 'Message too large.',
                        'timestamp': datetime.utcnow().isoformat(),
                    }
                )
                continue
            data = json.loads(raw)
            text = data.get('text', '').strip()
            requested_target_language = data.get('target_language', settings.default_target_language)
            target_language = normalize_language_name(str(requested_target_language))

            if not text:
                continue

            transcript_buffer.append(text)
            await websocket.send_json(
                {
                    'type': 'transcript',
                    'payload': text,
                    'timestamp': datetime.utcnow().isoformat()
                }
            )

            translated = ''
            try:
                translated = await translation_service.translate_text(text, target_language)
                await websocket.send_json(
                    {
                        'type': 'translation',
                        'payload': translated,
                        'language': target_language,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )
            except Exception as exc:
                await websocket.send_json(
                    {
                        'type': 'error',
                        'payload': f'Translation failed: {exc}',
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )

            running_summary = ''
            try:
                running_summary = await ai_service.summarize_medical_text(' '.join(transcript_buffer))
                await websocket.send_json(
                    {
                        'type': 'summary',
                        'payload': running_summary,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )
            except Exception as exc:
                logger.warning('Summary generation failed for session %s: %s', session_id, exc)
                await websocket.send_json(
                    {
                        'type': 'error',
                        'payload': 'Summary generation unavailable right now; live translation is still active.',
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )

            session_service.persist_session_event(
                SessionRecord(
                    session_id=session_id,
                    transcript=text,
                    translation=translated,
                    summary=running_summary,
                    source_language='English',
                    target_language=target_language
                )
            )
    except WebSocketDisconnect:
        logger.info('Session disconnected: %s', session_id)

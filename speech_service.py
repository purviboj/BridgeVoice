import httpx
from fastapi import HTTPException
from utils.config import get_settings


class ElevenLabsSpeechService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = 'https://api.elevenlabs.io/v1'
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            # Reuse one connection pool to reduce per-chunk handshake overhead.
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=2.0, read=10.0, write=10.0, pool=2.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
                headers={'xi-api-key': self.settings.elevenlabs_api_key},
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = 'chunk.webm',
        content_type: str = 'audio/webm',
        language: str = 'en',
        model_id: str = 'scribe_v1',
    ) -> str:
        if not audio_bytes:
            return ''

        if not self.settings.elevenlabs_api_key:
            raise HTTPException(status_code=500, detail='ELEVENLABS_API_KEY is not configured.')

        client = self._get_client()
        payload: dict
        for attempt in range(2):
            try:
                response = await client.post(
                    f'{self.base_url}/speech-to-text',
                    data={
                        'model_id': model_id,
                        'language_code': language,
                    },
                    files={'file': (filename, audio_bytes, content_type)},
                )
                response.raise_for_status()
                payload = response.json()
                break
            except (httpx.ReadTimeout, httpx.ConnectTimeout) as exc:
                if attempt == 1:
                    raise HTTPException(
                        status_code=504,
                        detail=f'ElevenLabs STT timeout after retry: {exc}',
                    ) from exc
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=502, detail=f'ElevenLabs STT request failed: {exc}') from exc

        transcript = payload.get('text') or payload.get('transcript') or ''
        return transcript.strip()

import httpx
from fastapi import HTTPException
from utils.config import get_settings


class ElevenLabsTTSService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = 'https://api.elevenlabs.io/v1'
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=2.0, read=30.0, write=10.0, pool=2.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
                headers={'xi-api-key': self.settings.elevenlabs_api_key},
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def stream_text_to_speech(
        self,
        translated_text: str,
        voice_id: str,
        model_id: str = 'eleven_multilingual_v2',
    ):
        if not translated_text.strip():
            raise HTTPException(status_code=400, detail='translated_text cannot be empty.')

        if not self.settings.elevenlabs_api_key:
            raise HTTPException(status_code=500, detail='ELEVENLABS_API_KEY is not configured.')

        client = self._get_client()
        url = f'{self.base_url}/text-to-speech/{voice_id}/stream'
        payload = {
            'text': translated_text,
            'model_id': model_id,
            'output_format': 'mp3_44100_128',
            'voice_settings': {'stability': 0.35, 'similarity_boost': 0.7},
        }

        async with client.stream('POST', url, json=payload) as response:
            if response.status_code >= 400:
                error_text = await response.aread()
                raise HTTPException(
                    status_code=502,
                    detail=f'ElevenLabs TTS request failed: {error_text.decode("utf-8", errors="ignore")}',
                )

            async for chunk in response.aiter_bytes():
                if chunk:
                    yield chunk

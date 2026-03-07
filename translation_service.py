from typing import Literal

import httpx
from utils.logger import get_logger

SupportedLanguage = Literal['English', 'Spanish', 'French', 'Hindi']
logger = get_logger(__name__)


class TranslationService:
    def __init__(self) -> None:
        self.language_code_map = {
            'English': 'en',
            'Spanish': 'es',
            'French': 'fr',
            'Hindi': 'hi',
        }

    async def translate_text(self, text: str, target_language: SupportedLanguage) -> str:
        if not text:
            return ''

        target_code = self.language_code_map.get(target_language, 'en')
        if target_code == 'en':
            return text

        async with httpx.AsyncClient(timeout=20.0) as client:
            google_result = await self._translate_with_google(client, text, target_code)
            if google_result:
                return google_result

            mymemory_result = await self._translate_with_mymemory(client, text, target_code)
            if mymemory_result:
                return mymemory_result

        # Do not break the product flow if third-party translation providers are unavailable.
        logger.warning(
            'All translation providers failed for target=%s. Returning original text fallback.',
            target_language,
        )
        return self._fallback_translation(text, target_code)

    async def _translate_with_google(
        self, client: httpx.AsyncClient, text: str, target_code: str
    ) -> str:
        try:
            response = await client.get(
                'https://translate.googleapis.com/translate_a/single',
                params={
                    'client': 'gtx',
                    'sl': 'auto',
                    'tl': target_code,
                    'dt': 't',
                    'q': text,
                },
            )
            response.raise_for_status()
            payload = response.json()
            translated_parts = [part[0] for part in (payload[0] or []) if part and part[0]]
            return ''.join(translated_parts).strip()
        except Exception:
            return ''

    def _fallback_translation(self, text: str, target_code: str) -> str:
        # Soft fallback so UI keeps working even without external translation APIs.
        if target_code == 'es':
            return f'[Spanish fallback] {text}'
        if target_code == 'fr':
            return f'[French fallback] {text}'
        if target_code == 'hi':
            return f'[Hindi fallback] {text}'
        return text

    async def _translate_with_mymemory(
        self, client: httpx.AsyncClient, text: str, target_code: str
    ) -> str:
        try:
            response = await client.get(
                'https://api.mymemory.translated.net/get',
                params={
                    'q': text,
                    'langpair': f'auto|{target_code}',
                },
            )
            response.raise_for_status()
            payload = response.json()
            translated = (payload.get('responseData') or {}).get('translatedText') or ''
            return translated.strip()
        except Exception:
            return ''

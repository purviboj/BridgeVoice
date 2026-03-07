import re

from openai import AsyncOpenAI
from services.openai_compat import generate_text
from utils.config import get_settings


class HealthLiteracyService:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def simplify_medical_explanation(self, text: str) -> str:
        """
        Convert complex medical language into patient-friendly wording.
        Constraints:
        - Maximum 2 sentences
        - Non-technical language
        - Easy to understand
        """
        if not text.strip():
            return ''

        simplified = await generate_text(
            self.client,
            system_prompt=(
                'Rewrite medical explanations in plain language for patients. '
                'Use non-technical words. Keep it accurate and reassuring. '
                'Maximum 2 short sentences.'
            ),
            user_prompt=f'Simplify this: {text}',
        )
        return self._enforce_two_sentences(simplified)

    def _enforce_two_sentences(self, text: str) -> str:
        cleaned = ' '.join(text.split())
        if not cleaned:
            return ''

        sentences = re.split(r'(?<=[.!?])\s+', cleaned)
        limited = ' '.join(sentences[:2]).strip()

        if limited and limited[-1] not in '.!?':
            limited += '.'
        return limited

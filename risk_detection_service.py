import json

from openai import AsyncOpenAI
from services.openai_compat import generate_text
from utils.config import get_settings


class RiskDetectionService:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def detect_risk(self, transcript: str) -> dict[str, str]:
        if not transcript.strip():
            return {
                'risk_level': 'low',
                'alert': 'No conversation content provided for risk analysis.',
            }

        text = await generate_text(
            self.client,
            system_prompt=(
                'You analyze medical conversations for patient safety risks and '
                'misunderstandings. Prioritize these triggers: patient stopping medication, '
                'incorrect dosage, and severe symptoms. '
                'Return strict JSON with keys: risk_level, alert. '
                'risk_level must be one of: low, medium, high.'
            ),
            user_prompt=transcript,
        )

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return {
                'risk_level': 'medium',
                'alert': 'Potential misunderstanding detected. Please review instructions with patient.',
            }

        risk_level = str(parsed.get('risk_level', 'medium')).lower()
        if risk_level not in {'low', 'medium', 'high'}:
            risk_level = 'medium'

        alert = str(parsed.get('alert', '')).strip()
        if not alert:
            alert = 'Potential risk detected. Please review patient understanding.'

        return {'risk_level': risk_level, 'alert': alert}

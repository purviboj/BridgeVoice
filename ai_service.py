from openai import AsyncOpenAI
import re
from services.openai_compat import generate_text
from services.terminology_service import TerminologyService
from utils.config import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class OpenAIService:
    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        self.terminology_service = TerminologyService()

    async def translate_text(self, text: str, target_language: str) -> str:
        if not text:
            return ''

        return await generate_text(
            self.client,
            system_prompt='Translate healthcare speech accurately and simply.',
            user_prompt=f'Target language: {target_language}. Text: {text}',
        )

    async def summarize_medical_text(self, transcript: str) -> str:
        if not transcript:
            return ''
        if not self.client:
            return self._fallback_running_summary(transcript)
        try:
            return await generate_text(
                self.client,
                system_prompt=(
                    'Summarize medical visit notes with sections: '
                    'Symptoms, Doctor Advice, Medication, Follow-up.'
                ),
                user_prompt=transcript,
            )
        except Exception as exc:
            logger.warning('OpenAI running summary failed; using fallback: %s', exc)
            return self._fallback_running_summary(transcript)

    async def generate_patient_visit_summary(self, transcript: str) -> str:
        if not transcript:
            return ''
        glossary_hints = self.terminology_service.glossary_hints_for_text(transcript)
        if not self.client:
            return self.terminology_service.simplify_with_dataset(
                self._fallback_visit_summary(transcript)
            )
        try:
            summary = await generate_text(
                self.client,
                system_prompt=(
                    'Create a structured visit summary in very simple, non-technical '
                    'language for patients with low health literacy. '
                    'Use exactly this format and headings:\\n\\n'
                    'Visit Summary\\n\\n'
                    'Diagnosis:\\n'
                    'Medications:\\n'
                    'Instructions:\\n'
                    'Lifestyle Advice:\\n'
                    'Follow-Up Appointment:\\n'
                    'Warnings:\\n\\n'
                    'Keep each section short and clear. If unknown, write \"Not discussed.\"'
                    '\\nWhen a term is technical, replace it with plain words.'
                ),
                user_prompt=(
                    f'{transcript}\\n\\n'
                    'Technical terms detected from medical dataset:\\n'
                    f'{glossary_hints or "none"}'
                ),
            )
            return self.terminology_service.simplify_with_dataset(summary)
        except Exception as exc:
            logger.warning('OpenAI visit summary failed; using fallback: %s', exc)
            return self.terminology_service.simplify_with_dataset(
                self._fallback_visit_summary(transcript)
            )

    def _fallback_running_summary(self, transcript: str) -> str:
        cleaned = ' '.join(transcript.split())
        preview = cleaned[:260] + ('...' if len(cleaned) > 260 else '')
        return (
            'Symptoms: Not fully captured.\n'
            'Doctor Advice: Not fully captured.\n'
            'Medication: Not fully captured.\n'
            f'Follow-up: Ongoing conversation. Notes: {preview}'
        )

    def _fallback_visit_summary(self, transcript: str) -> str:
        cleaned = ' '.join(transcript.split())
        preview = cleaned[:320] + ('...' if len(cleaned) > 320 else '')
        diagnosis = self._extract_diagnosis(cleaned)
        medications = self._extract_medications(cleaned)
        return (
            'Visit Summary\n\n'
            f'Diagnosis: {diagnosis}\n'
            f'Medications: {medications}\n'
            'Instructions: Take medicines exactly as prescribed and ask if any instruction is unclear.\n'
            'Lifestyle Advice: Drink water, rest, and follow your care plan.\n'
            'Follow-Up Appointment: Ask your clinic for the next visit date.\n'
            f'Warnings: Seek urgent care for severe symptoms. Notes heard: {preview}'
        )

    def _extract_diagnosis(self, transcript: str) -> str:
        text = transcript.lower()
        findings: list[str] = []
        if 'hyperlipidemia' in text or 'high cholesterol' in text or 'dyslipidemia' in text:
            findings.append('high cholesterol')
        if 'hypertension' in text or 'high blood pressure' in text:
            findings.append('high blood pressure')
        if not findings:
            return 'Not clearly stated yet.'
        if len(findings) == 1:
            return findings[0].capitalize() + '.'
        return ', and '.join(findings).capitalize() + '.'

    def _extract_medications(self, transcript: str) -> str:
        text = transcript.lower()
        meds: list[str] = []

        if re.search(r'\batorvastatin\b|\batorva\w+\b|\btour\s+of\s+vest\w+\b', text):
            meds.append('a cholesterol medicine')
        if re.search(r'\blisinopril\b|\blisino\w+\b|\blycinop\w+\b', text):
            meds.append('a blood pressure medicine')
        if 'statin' in text and 'a cholesterol medicine' not in meds:
            meds.append('a cholesterol medicine')

        if not meds:
            return 'Not clearly stated yet.'
        if len(meds) == 1:
            return meds[0].capitalize() + '.'
        return ', and '.join(meds).capitalize() + '.'

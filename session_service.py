import uuid

from models.schemas import SessionRecord
from utils.logger import get_logger
from utils.supabase_client import get_supabase_client

logger = get_logger(__name__)


class SessionService:
    def __init__(self) -> None:
        try:
            self.supabase = get_supabase_client()
        except Exception as exc:
            logger.warning('Supabase client unavailable; persistence disabled: %s', exc)
            self.supabase = None

    def _stable_uuid(self, key: str) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f'bridgevoice:{key}'))

    def _ensure_user(self, external_user_id: str, preferred_language: str) -> str:
        if self.supabase is None:
            raise RuntimeError('Supabase client unavailable')
        user_uuid = self._stable_uuid(external_user_id)
        payload = {
            'id': user_uuid,
            'external_user_id': external_user_id,
            'preferred_language': preferred_language,
        }
        self.supabase.table('users').upsert(payload, on_conflict='external_user_id').execute()
        return user_uuid

    def _ensure_visit(
        self,
        user_id: str,
        session_id: str,
        source_language: str,
        target_language: str,
    ) -> str:
        if self.supabase is None:
            raise RuntimeError('Supabase client unavailable')
        visit_payload = {
            'user_id': user_id,
            'external_session_id': session_id,
            'source_language': source_language,
            'target_language': target_language,
        }
        self.supabase.table('visits').upsert(visit_payload, on_conflict='external_session_id').execute()
        result = (
            self.supabase.table('visits')
            .select('id')
            .eq('external_session_id', session_id)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            raise RuntimeError(f'Visit not found for session_id={session_id}')
        return rows[0]['id']

    def persist_session_event(self, record: SessionRecord) -> None:
        if self.supabase is None:
            return
        preferred_language = record.target_language or 'Spanish'
        try:
            user_id = self._ensure_user(record.user_id, preferred_language)
            visit_id = self._ensure_visit(
                user_id=user_id,
                session_id=record.session_id,
                source_language=record.source_language,
                target_language=record.target_language,
            )

            transcript_payload = {
                'visit_id': visit_id,
                'transcript_text': record.transcript,
                'translated_text': record.translation,
                'source_language': record.source_language,
                'target_language': record.target_language,
            }
            self.supabase.table('transcripts').insert(transcript_payload).execute()

            if record.summary:
                summary_payload = {
                    'visit_id': visit_id,
                    'summary_text': record.summary,
                }
                self.supabase.table('summaries').upsert(summary_payload, on_conflict='visit_id').execute()
        except Exception as exc:
            logger.warning('Failed to persist session event: %s', exc)

    def _count_rows(self, table_name: str) -> int:
        if self.supabase is None:
            return 0
        result = self.supabase.table(table_name).select('id', count='exact').limit(1).execute()
        if getattr(result, 'count', None) is not None:
            return int(result.count)
        return len(result.data or [])

    def get_impact_metrics(self) -> dict[str, int]:
        if self.supabase is None:
            return {
                'visits_processed': 0,
                'languages_translated': 0,
                'summaries_generated': 0,
                'patients_helped': 0,
            }
        visits_processed = self._count_rows('visits')
        summaries_generated = self._count_rows('summaries')
        patients_helped = self._count_rows('users')

        language_rows = self.supabase.table('transcripts').select('target_language').execute().data or []
        languages = {
            str(row.get('target_language')).strip().lower()
            for row in language_rows
            if row.get('target_language')
        }

        return {
            'visits_processed': visits_processed,
            'languages_translated': len(languages),
            'summaries_generated': summaries_generated,
            'patients_helped': patients_helped,
        }

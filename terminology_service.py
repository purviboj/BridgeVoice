import csv
import re
from functools import lru_cache
from pathlib import Path

from utils.config import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class TerminologyService:
    def __init__(self) -> None:
        settings = get_settings()
        configured = [p.strip() for p in settings.medical_terms_dataset_paths.split(',') if p.strip()]
        self.dataset_paths = [Path(p).expanduser() for p in configured]
        self.max_rows_per_file = settings.medical_terms_max_rows_per_file
        self.max_unique_labels = settings.medical_terms_max_unique_labels
        self.supplemental_patterns: list[tuple[re.Pattern[str], str]] = [
            (re.compile(r'\bhyperlipid(?:emia|emia)\b', flags=re.IGNORECASE), 'high cholesterol'),
            (re.compile(r'\bhypertension\b', flags=re.IGNORECASE), 'high blood pressure'),
            (re.compile(r'\bdyslipidemia\b', flags=re.IGNORECASE), 'high cholesterol'),
            (re.compile(r'\batorvastatin\b', flags=re.IGNORECASE), 'cholesterol medicine'),
            (re.compile(r'\blisinopril\b', flags=re.IGNORECASE), 'blood pressure medicine'),
            (re.compile(r'\batorva\w+\b', flags=re.IGNORECASE), 'cholesterol medicine'),
            (re.compile(r'\blisino\w+\b', flags=re.IGNORECASE), 'blood pressure medicine'),
            (
                re.compile(r'\btour\s+of\s+vest\w+\b', flags=re.IGNORECASE),
                'cholesterol medicine',
            ),
            (
                re.compile(r'\blycinop\w+\b', flags=re.IGNORECASE),
                'blood pressure medicine',
            ),
        ]

    @lru_cache(maxsize=1)
    def known_terms(self) -> set[str]:
        terms: set[str] = set()
        for path in self.dataset_paths:
            if not path.exists():
                continue
            try:
                with path.open('r', encoding='utf-8', newline='') as handle:
                    reader = csv.DictReader(handle)
                    row_count = 0
                    for row in reader:
                        row_count += 1
                        if row_count > self.max_rows_per_file:
                            break
                        label_value = (row.get('LABEL') or '').strip()
                        if not label_value:
                            continue
                        for token in label_value.split('|'):
                            normalized = self._normalize(token)
                            if len(normalized) >= 4:
                                terms.add(normalized)
                        if len(terms) >= self.max_unique_labels:
                            break
            except Exception as exc:
                logger.warning('Unable to load terminology dataset %s: %s', path, exc)
            if len(terms) >= self.max_unique_labels:
                break
        logger.info('Loaded %s terminology labels for simplification.', len(terms))
        return terms

    def simplify_with_dataset(self, text: str) -> str:
        cleaned = ' '.join(text.split())
        if not cleaned:
            return ''

        terms = self._find_terms_in_text(cleaned)
        simplified = cleaned
        # Replace longer terms first to avoid partial overlaps.
        for term in sorted(terms, key=len, reverse=True)[:10]:
            plain = self._plain_language_hint(term)
            if plain == 'a medical term':
                continue
            pattern = re.compile(rf'\b{re.escape(term)}\b', flags=re.IGNORECASE)
            simplified = pattern.sub(plain, simplified)
        for pattern, replacement in self.supplemental_patterns:
            simplified = pattern.sub(replacement, simplified)
        return simplified

    def glossary_hints_for_text(self, text: str) -> str:
        terms = self._find_terms_in_text(text)
        normalized_text = self._normalize(text)
        supplemental_hints: list[str] = []
        for pattern, replacement in self.supplemental_patterns:
            if pattern.search(normalized_text):
                token = pattern.pattern.replace(r'\b', '').replace('\\', '')
                supplemental_hints.append(f'{token} -> {replacement}')
        combined = sorted(terms)[:12]
        hints = [f'{term} -> {self._plain_language_hint(term)}' for term in combined]
        hints.extend(supplemental_hints[:6])
        if not hints:
            return ''
        return '\n'.join(hints)

    def _find_terms_in_text(self, text: str) -> set[str]:
        normalized_text = self._normalize(text)
        padded_text = f' {normalized_text} '
        found: set[str] = set()
        for term in self.known_terms():
            if len(term) < 4:
                continue
            if f' {term} ' in padded_text:
                found.add(term)
        return found

    def _normalize(self, value: str) -> str:
        return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s-]', ' ', value.lower())).strip()

    def _plain_language_hint(self, term: str) -> str:
        if any(x in term for x in ('carcinoma', 'lymphoma', 'sarcoma', 'cancer')):
            return 'a type of cancer'
        if any(x in term for x in ('angioplasty', 'resection', 'transfusion', 'embolization')):
            return 'a medical procedure to treat a problem'
        if any(x in term for x in ('fibrosis', 'inflammation')):
            return 'damage or swelling in body tissue'
        if any(x in term for x in ('hyperglycemia', 'glucose', 'diabetes')):
            return 'high blood sugar'
        if any(x in term for x in ('anemia', 'hemoglobin')):
            return 'low healthy red blood levels'
        if any(x in term for x in ('syndrome', 'disease', 'infection')):
            return 'a health problem'
        return 'a medical term'

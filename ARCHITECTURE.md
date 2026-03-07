# BridgeVoice Architecture Components

## Core Modules

- **Frontend (Next.js):** Captures user/session context, connects to WebSocket, renders transcript/translation/summary in real time.
- **WebSocket Gateway (FastAPI):** Maintains live session channel and emits event stream.
- **Speech Layer (ElevenLabs STT/TTS):** Converts speech to text and text to optional spoken output.
- **AI Layer (OpenAI):** Handles translation and structured medical summarization.
- **Data Layer (Supabase):** Persists session events for auditability and follow-up care.

## Event Sequence

1. Client streams speech chunk or transcript event.
2. Backend normalizes and tags the event.
3. STT output is translated to patient language.
4. Running transcript is summarized into clinically readable notes.
5. All events are broadcast and persisted.

## Future Extensions

- Clinician dashboard for after-visit review
- Multi-speaker diarization
- EHR/FHIR integration
- Consent and compliance workflows (HIPAA-ready controls)

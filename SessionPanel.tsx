'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { useBridgeVoiceSession } from '@/hooks/useBridgeVoiceSession';

export default function SessionPanel({ sessionId }: { sessionId: string }) {
  const { connected, messages, sendText, clearMessages } = useBridgeVoiceSession(sessionId);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const translationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [translatedSpeech, setTranslatedSpeech] = useState('');
  const [simpleExplanationOriginal, setSimpleExplanationOriginal] = useState('');
  const [simpleExplanationTranslated, setSimpleExplanationTranslated] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Spanish' | 'French' | 'Hindi'>('Spanish');
  const [translationError, setTranslationError] = useState('');
  const [explanationError, setExplanationError] = useState('');
  const [audioError, setAudioError] = useState('');
  const defaultVoiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';
  const apiBaseUrl = getApiBaseUrl();

  const englishTranscript = useMemo(
    () => messages.filter((m) => m.type === 'transcript').map((m) => m.payload).join(' '),
    [messages]
  );
  const liveEnglishTranscript = englishTranscript;

  const canRecordAudio =
    typeof window !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleTranslate = async () => {
    if (!liveEnglishTranscript.trim()) return;
    if (selectedLanguage === 'English') {
      setTranslatedSpeech(liveEnglishTranscript);
      setTranslationError('');
      return;
    }
    setIsTranslating(true);
    setTranslationError('');
    try {
      const response = await fetch(`${apiBaseUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: liveEnglishTranscript,
          target_language: selectedLanguage
        })
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(errorBody.detail || 'translate failed');
      }
      const data = (await response.json()) as { translated_text?: string };
      const next = data.translated_text ?? '';
      if (!next) {
        setTranslationError('No translation returned from service.');
      } else {
        setTranslatedSpeech(next);
      }
    } catch (err: any) {
      setTranslationError(err?.message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const latestError = [...messages].reverse().find((m) => m.type === 'error');
    if (latestError) {
      setTranslationError(latestError.payload);
    }
  }, [messages]);

  useEffect(() => {
    if (!liveEnglishTranscript.trim()) {
      setTranslatedSpeech('');
      return;
    }
    if (selectedLanguage === 'English') {
      setTranslatedSpeech(liveEnglishTranscript);
      return;
    }

    if (translationTimerRef.current) {
      clearTimeout(translationTimerRef.current);
    }

    translationTimerRef.current = setTimeout(() => {
      handleTranslate();
    }, 350);

    return () => {
      if (translationTimerRef.current) {
        clearTimeout(translationTimerRef.current);
      }
    };
  }, [liveEnglishTranscript, selectedLanguage]);

  const handleGenerateExplanation = async () => {
    if (!englishTranscript.trim()) return;
    setIsGeneratingExplanation(true);
    setExplanationError('');
    try {
      const [originalRes, translatedRes] = await Promise.all([
        fetch(`${apiBaseUrl}/generate-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: englishTranscript, target_language: 'English' })
        }),
        fetch(`${apiBaseUrl}/generate-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: englishTranscript, target_language: selectedLanguage })
        })
      ]);

      if (!originalRes.ok) {
        const errorBody = (await originalRes.json().catch(() => ({}))) as { detail?: string };
        throw new Error(errorBody.detail || 'Generate original explanation failed.');
      }
      if (!translatedRes.ok) {
        const errorBody = (await translatedRes.json().catch(() => ({}))) as { detail?: string };
        throw new Error(errorBody.detail || 'Generate translated explanation failed.');
      }

      const originalData = (await originalRes.json()) as { summary?: string };
      const translatedData = (await translatedRes.json()) as { summary?: string };
      setSimpleExplanationOriginal(originalData.summary ?? '');
      setSimpleExplanationTranslated(translatedData.summary ?? '');
    } catch (err: any) {
      setExplanationError(err?.message || 'Unable to generate explanation right now.');
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  const handlePlayTranslatedAudio = async () => {
    if (!translatedSpeech.trim()) return;
    setIsPlaying(true);
    setAudioError('');
    try {
      const response = await fetch(`${apiBaseUrl}/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translated_text: translatedSpeech,
          voice_id: defaultVoiceId
        })
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(errorBody.detail || 'Failed to generate audio.');
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
      };
      await audio.play();
    } catch (err: any) {
      setAudioError(err?.message || 'Unable to play translated audio.');
      setIsPlaying(false);
    }
  };

  const handleToggleSpeak = () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!canRecordAudio) {
      setAudioError('Audio recording is not supported in this browser.');
      return;
    }

    setAudioError('');
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = async () => {
          setIsListening(false);
          const chunks = audioChunksRef.current;
          audioChunksRef.current = [];
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;

          const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          if (!audioBlob.size) {
            setAudioError('No audio captured. Please try again.');
            return;
          }

          try {
            const formData = new FormData();
            formData.append('audio_chunk', audioBlob, 'bridgevoice-recording.webm');
            formData.append('language', 'en');

            const response = await fetch(`${apiBaseUrl}/process-audio`, {
              method: 'POST',
              body: formData
            });

            if (!response.ok) {
              const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
              throw new Error(errorBody.error || 'Failed to transcribe audio.');
            }

            const data = (await response.json()) as { transcript?: string };
            const transcript = data.transcript?.trim() ?? '';
            if (!transcript) {
              throw new Error('No transcript returned from speech service.');
            }

            sendText(transcript, selectedLanguage);
          } catch (err: any) {
            setAudioError(err?.message || 'Unable to process recorded audio.');
          }
        };

        recorder.start();
        setIsListening(true);
      } catch (err: any) {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setAudioError(err?.message || 'Could not access the microphone.');
        setIsListening(false);
      }
    })();
  };

  const handleResetTranscript = () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
    }
    clearMessages();
    audioChunksRef.current = [];
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setTranslatedSpeech('');
    setSimpleExplanationOriginal('');
    setSimpleExplanationTranslated('');
    setTranslationError('');
    setExplanationError('');
    setAudioError('');
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">BridgeVoice</h1>
        <p className="mt-2 text-sm text-slate-600">
          Session: <span className="font-mono">{sessionId}</span>
        </p>
        <p className="mt-2 text-sm">
          Connection:{' '}
          <span className={connected ? 'text-emerald-600' : 'text-rose-600'}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </p>
      </header>

      <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <h2 className="text-lg font-medium uppercase tracking-wide text-slate-300">Doctor Speech</h2>
        <p className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
          {isListening ? 'Listening...' : liveEnglishTranscript || 'English transcript'}
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">English Transcript</h3>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleToggleSpeak}
              >
                {isListening ? 'Stop Recording' : 'Tap to Speak'}
              </button>
              <button
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                onClick={handleResetTranscript}
              >
                Reset
              </button>
            </div>
          </div>
          <p className="mt-3 min-h-24 text-lg leading-relaxed text-slate-700">
            {liveEnglishTranscript || 'Waiting for speech...'}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-xl font-semibold">Translated Speech</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Translate to</label>
            <select
              value={selectedLanguage}
              onChange={(e) =>
                setSelectedLanguage(e.target.value as 'English' | 'Spanish' | 'French' | 'Hindi')
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>
          <p className="mt-3 min-h-24 text-lg leading-relaxed text-slate-700">
            {translatedSpeech || `Live ${selectedLanguage} transcript will appear here.`}
          </p>
          {translationError ? (
            <p className="mt-2 text-xs text-rose-600">{translationError}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleTranslate}
              disabled={!liveEnglishTranscript || isTranslating}
            >
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
            <button
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handlePlayTranslatedAudio}
              disabled={!translatedSpeech || isPlaying}
            >
              {isPlaying ? 'Playing...' : 'Playback Translated Audio'}
            </button>
          </div>
          {audioError ? <p className="mt-2 text-xs text-rose-600">{audioError}</p> : null}
        </article>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-xl font-semibold">Simple Explanation</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">AI generated explanation</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Original (English)
            </p>
            <p className="mt-2 min-h-24 whitespace-pre-line text-base leading-relaxed text-slate-700">
              {simpleExplanationOriginal || 'English explanation will appear here.'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Translated ({selectedLanguage})
            </p>
            <p className="mt-2 min-h-24 whitespace-pre-line text-base leading-relaxed text-slate-700">
              {simpleExplanationTranslated || `${selectedLanguage} explanation will appear here.`}
            </p>
          </div>
        </div>
        {explanationError ? (
          <p className="mt-2 text-xs text-rose-600">{explanationError}</p>
        ) : null}
        <button
          className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleGenerateExplanation}
          disabled={!englishTranscript || isGeneratingExplanation}
        >
          {isGeneratingExplanation ? 'Generating...' : 'Generate Explanation'}
        </button>
      </section>
    </main>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useBridgeVoiceSession } from '@/hooks/useBridgeVoiceSession';

export default function SessionPanel({ sessionId }: { sessionId: string }) {
  const { connected, messages, sendText, clearMessages } = useBridgeVoiceSession(sessionId);
  const speechRecognitionRef = useRef<any>(null);
  const translationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [translatedSpeech, setTranslatedSpeech] = useState('');
  const [simpleExplanationOriginal, setSimpleExplanationOriginal] = useState('');
  const [simpleExplanationTranslated, setSimpleExplanationTranslated] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [liveSpeechDraft, setLiveSpeechDraft] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Spanish' | 'French' | 'Hindi'>('Spanish');
  const [translationError, setTranslationError] = useState('');
  const [explanationError, setExplanationError] = useState('');
  const [audioError, setAudioError] = useState('');
  const defaultVoiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';

  const englishTranscript = useMemo(
    () => messages.filter((m) => m.type === 'transcript').map((m) => m.payload).join(' '),
    [messages]
  );
  const liveEnglishTranscript = useMemo(
    () => `${englishTranscript}${liveSpeechDraft ? ` ${liveSpeechDraft}` : ''}`.trim(),
    [englishTranscript, liveSpeechDraft]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const spokenText = event.results?.[i]?.[0]?.transcript?.trim();
        if (!spokenText) continue;
        if (event.results[i].isFinal) {
          sendText(spokenText, selectedLanguage);
        } else {
          interimText = `${interimText} ${spokenText}`.trim();
        }
      }
      setLiveSpeechDraft(interimText);
    };
    recognition.onend = () => {
      setIsListening(false);
      setLiveSpeechDraft('');
    };
    recognition.onerror = () => {
      setIsListening(false);
      setLiveSpeechDraft('');
    };
    speechRecognitionRef.current = recognition;
  }, [sendText, selectedLanguage]);

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
      const response = await fetch('/api/translate', {
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
        fetch('/api/generate-visit-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: englishTranscript, target_language: 'English' })
        }),
        fetch('/api/generate-visit-summary', {
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
      const response = await fetch('/api/text-to-speech', {
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
    const recognition = speechRecognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }
    setIsListening(true);
    recognition.start();
  };

  const handleResetTranscript = () => {
    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    clearMessages();
    setLiveSpeechDraft('');
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
          {liveEnglishTranscript || 'English transcript'}
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
                disabled={!speechSupported}
              >
                {isListening ? 'Stop Speaking' : 'Tap to Speak'}
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

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-lg font-medium">Speak or Test Input</h3>
        <p className="mt-1 text-sm text-slate-500">
          Click the button and speak. Your speech is converted to text and pushed into the live feed.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            onClick={() =>
              sendText(
                'Your hemoglobin levels are low due to iron deficiency anemia.',
                selectedLanguage
              )
            }
          >
            Send Sample Doctor Speech
          </button>
        </div>
        {!speechSupported ? (
          <p className="mt-2 text-xs text-rose-600">
            Speech recognition is not supported in this browser. Try Chrome on desktop.
          </p>
        ) : null}
      </section>
    </main>
  );
}

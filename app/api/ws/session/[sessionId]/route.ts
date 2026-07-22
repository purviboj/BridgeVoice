import { experimental_upgradeWebSocket, type WebSocketData } from '@vercel/functions';

type ClientMessage = {
  type?: string;
  text?: string;
  target_language?: 'English' | 'Spanish' | 'French' | 'Hindi';
};

type SessionMessage = {
  type: 'status' | 'transcript' | 'translation' | 'summary' | 'error';
  payload: string;
  language?: string;
  timestamp: string;
};

function send(ws: WebSocket, message: SessionMessage): void {
  ws.send(JSON.stringify(message));
}

function normalizeLanguageName(value: string | undefined): 'English' | 'Spanish' | 'French' | 'Hindi' {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'english' || normalized === 'en') return 'English';
  if (normalized === 'french' || normalized === 'fr') return 'French';
  if (normalized === 'hindi' || normalized === 'hi') return 'Hindi';
  return 'Spanish';
}

async function translateText(text: string, targetLanguage: string): Promise<string> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');
  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured.');
  }

  const response = await fetch(`${apiBaseUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, target_language: targetLanguage })
  });

  const data = (await response.json().catch(() => ({}))) as { translated_text?: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Translation failed.');
  }

  return data.translated_text ?? '';
}

async function generateSummary(transcript: string): Promise<string> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');
  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured.');
  }

  const response = await fetch(`${apiBaseUrl}/generate-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 'mobile-demo', transcript })
  });

  const data = (await response.json().catch(() => ({}))) as { summary?: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Summary generation failed.');
  }

  return data.summary ?? '';
}

async function handleClientMessage(
  ws: WebSocket,
  rawData: WebSocketData,
  transcriptBuffer: string[]
): Promise<void> {
  let payload: ClientMessage;
  try {
    payload = JSON.parse(rawData.toString()) as ClientMessage;
  } catch {
    return;
  }

  if (payload.type !== 'text') return;

  const text = (payload.text ?? '').trim();
  if (!text) return;

  const targetLanguage = normalizeLanguageName(payload.target_language);
  transcriptBuffer.push(text);

  send(ws, {
    type: 'transcript',
    payload: text,
    timestamp: new Date().toISOString()
  });

  try {
    const translatedText = await translateText(text, targetLanguage);
    if (translatedText) {
      send(ws, {
        type: 'translation',
        payload: translatedText,
        language: targetLanguage,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    send(ws, {
      type: 'error',
      payload: `Translation failed: ${error?.message || 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const summary = await generateSummary(transcriptBuffer.join(' '));
    if (summary) {
      send(ws, {
        type: 'summary',
        payload: summary,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    send(ws, {
      type: 'error',
      payload: `Summary generation failed: ${error?.message || 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
}

export function GET(
  _request: Request,
  context: { params: { sessionId: string } }
): ReturnType<typeof experimental_upgradeWebSocket> {
  const { sessionId } = context.params;

  return experimental_upgradeWebSocket((ws) => {
    send(ws, {
      type: 'status',
      payload: `Connected to BridgeVoice session ${sessionId}`,
      timestamp: new Date().toISOString()
    });

    const transcriptBuffer: string[] = [];

    ws.on('message', (data: WebSocketData) => {
      void handleClientMessage(ws, data, transcriptBuffer);
    });

    ws.on('close', () => {
      transcriptBuffer.length = 0;
    });
  });
}

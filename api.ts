const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function browserHost(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.hostname || null;
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  const host = browserHost();
  if (!host || LOCAL_HOSTS.has(host)) {
    return 'http://127.0.0.1:8000';
  }

  return `${window.location.protocol}//${host}:8000`;
}

export function getSessionWsUrl(sessionId: string): string {
  const envWs = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (envWs) return envWs.replace('local-demo', sessionId);

  const host = browserHost();
  if (!host || LOCAL_HOSTS.has(host)) {
    return `ws://127.0.0.1:8000/ws/session/${sessionId}`;
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}:8000/ws/session/${sessionId}`;
}

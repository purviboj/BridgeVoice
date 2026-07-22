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

export function getSessionWsUrl(_sessionId: string): string | null {
  const envWs = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (envWs) return envWs.replace('local-demo', _sessionId);

  const host = browserHost();
  if (!host) return null;

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}/api/ws/session/${_sessionId}`;
}

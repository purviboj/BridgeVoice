from collections import defaultdict, deque
from dataclasses import dataclass
from hmac import compare_digest
from threading import Lock
from time import monotonic

from fastapi import Header, HTTPException, Request, WebSocket

from utils.config import get_settings


def client_ip_from_request(request: Request) -> str:
    forwarded = request.headers.get('x-forwarded-for', '').split(',')[0].strip()
    if forwarded:
        return forwarded
    if request.client and request.client.host:
        return request.client.host
    return 'unknown'


def client_ip_from_websocket(websocket: WebSocket) -> str:
    forwarded = websocket.headers.get('x-forwarded-for', '').split(',')[0].strip()
    if forwarded:
        return forwarded
    if websocket.client and websocket.client.host:
        return websocket.client.host
    return 'unknown'


@dataclass
class RateConfig:
    limit: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, config: RateConfig) -> bool:
        now = monotonic()
        cutoff = now - config.window_seconds
        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= config.limit:
                return False
            bucket.append(now)
            return True


rate_limiter = InMemoryRateLimiter()


async def require_api_token(x_bridgevoice_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    expected = settings.backend_api_token.strip()
    if not expected:
        return
    provided = (x_bridgevoice_token or '').strip()
    if not compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail='Unauthorized.')


async def api_rate_limit(request: Request) -> None:
    settings = get_settings()
    config = RateConfig(limit=settings.rate_limit_per_minute, window_seconds=60)
    key = f"http:{request.url.path}:{client_ip_from_request(request)}"
    if not rate_limiter.allow(key, config):
        raise HTTPException(status_code=429, detail='Rate limit exceeded. Please retry shortly.')


async def enforce_websocket_security(websocket: WebSocket) -> None:
    settings = get_settings()
    config = RateConfig(limit=settings.websocket_connects_per_minute, window_seconds=60)
    key = f"ws-connect:{client_ip_from_websocket(websocket)}"
    if not rate_limiter.allow(key, config):
        await websocket.close(code=1013, reason='Websocket rate limit exceeded.')

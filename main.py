from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from routes.bridgevoice import router as bridgevoice_router
from routes.health import router as health_router
from routes.sessions import router as sessions_router
from routes.ws import router as ws_router
from utils.config import get_settings

app = FastAPI(title='BridgeVoice API', version='0.1.0')
settings = get_settings()
configured_origins = [origin.strip() for origin in settings.frontend_origins.split(',') if origin.strip()]
default_origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
]
allowed_origins = list(dict.fromkeys([*default_origins, *configured_origins]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)
trusted_hosts = [host.strip() for host in settings.allowed_hosts.split(',') if host.strip()]
if trusted_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)


@app.middleware('http')
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(self), geolocation=()'
    response.headers['Cache-Control'] = 'no-store'
    return response

app.include_router(health_router)
app.include_router(bridgevoice_router)
app.include_router(sessions_router, prefix='/api')
app.include_router(ws_router)

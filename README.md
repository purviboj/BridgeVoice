# BridgeVoice Mobile (Expo)

This is a fully functional mobile client for BridgeVoice.

## 1) Configure backend URLs for your phone

Create `.env` from `.env.example` and set your machine LAN IP (not localhost):

- `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LAN_IP>:8000`
- `EXPO_PUBLIC_WS_URL=ws://<YOUR_LAN_IP>:8000/ws/session/mobile-demo`

## 2) Install and run

```bash
cd mobile
npm install
npx expo start --tunnel
```

`expo start --tunnel` prints a QR code in terminal. Scan it with Expo Go.

## 3) Backend

Run FastAPI backend in another terminal:

```bash
cd ../backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Use `--host 0.0.0.0` so phone can reach the API.

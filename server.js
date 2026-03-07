import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer();

const port = Number(process.env.PORT || 4000);
const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
const flaskUrl = process.env.FLASK_URL || 'http://localhost:5000';
const origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000').split(',').map((v) => v.trim());

app.use(cors({ origin: origins }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bridgevoice-node' });
});

app.post('/translate', async (req, res) => {
  const upstream = await fetch(`${flaskUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  const data = await upstream.json();
  res.status(upstream.status).json(data);
});

app.post('/generate-summary', async (req, res) => {
  const upstream = await fetch(`${flaskUrl}/generate-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  const data = await upstream.json();
  res.status(upstream.status).json(data);
});

app.post('/process-audio', upload.single('audio_chunk'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'audio_chunk is required' });
    return;
  }

  const form = new FormData();
  form.append('audio_chunk', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || 'chunk.webm');
  form.append('language', req.body?.language || 'en');

  const upstream = await fetch(`${fastApiUrl}/process-audio`, {
    method: 'POST',
    body: form
  });
  const data = await upstream.json();
  res.status(upstream.status).json(data);
});

app.post('/text-to-speech', async (req, res) => {
  const upstream = await fetch(`${fastApiUrl}/text-to-speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    res.status(upstream.status).send(text);
    return;
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  const arrayBuffer = await upstream.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
});

app.listen(port, () => {
  console.log(`BridgeVoice Node backend listening on http://localhost:${port}`);
});

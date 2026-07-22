import base64
import os

import httpx
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
origins = [x.strip() for x in os.getenv('FRONTEND_ORIGINS', 'http://localhost:3000').split(',') if x.strip()]
CORS(app, origins=origins)

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY', ''))
elevenlabs_api_key = os.getenv('ELEVENLABS_API_KEY', '')
supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
supabase_publishable_key = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')


def _supabase_auth_headers() -> dict[str, str]:
    return {
        'apikey': supabase_publishable_key,
        'Authorization': f'Bearer {supabase_publishable_key}',
        'Content-Type': 'application/json',
    }


@app.get('/health')
def health() -> Response:
    return jsonify({'status': 'ok', 'service': 'bridgevoice-flask'})


@app.post('/auth/signup')
def auth_signup() -> Response:
    payload = request.get_json(force=True)
    email = (payload or {}).get('email', '').strip()
    password = (payload or {}).get('password', '').strip()
    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400
    if not supabase_url or not supabase_publishable_key:
        return jsonify({'error': 'Supabase auth env is not configured on Flask backend'}), 500

    with httpx.Client(timeout=20.0) as client:
        upstream = client.post(
            f'{supabase_url}/auth/v1/signup',
            headers=_supabase_auth_headers(),
            json={'email': email, 'password': password},
        )

    body = upstream.json() if upstream.text else {}
    if upstream.status_code >= 400:
        error = body.get('msg') or body.get('error_description') or body.get('error') or 'Signup failed'
        return jsonify({'error': error}), upstream.status_code

    session = body.get('session') or {}
    return jsonify(
        {
            'message': 'Signup successful',
            'user': body.get('user'),
            'access_token': session.get('access_token'),
            'refresh_token': session.get('refresh_token'),
        }
    )


@app.post('/auth/login')
def auth_login() -> Response:
    payload = request.get_json(force=True)
    email = (payload or {}).get('email', '').strip()
    password = (payload or {}).get('password', '').strip()
    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400
    if not supabase_url or not supabase_publishable_key:
        return jsonify({'error': 'Supabase auth env is not configured on Flask backend'}), 500

    with httpx.Client(timeout=20.0) as client:
        upstream = client.post(
            f'{supabase_url}/auth/v1/token?grant_type=password',
            headers=_supabase_auth_headers(),
            json={'email': email, 'password': password},
        )

    body = upstream.json() if upstream.text else {}
    if upstream.status_code >= 400:
        error = body.get('msg') or body.get('error_description') or body.get('error') or 'Login failed'
        return jsonify({'error': error}), upstream.status_code

    return jsonify(
        {
            'message': 'Login successful',
            'user': body.get('user'),
            'access_token': body.get('access_token'),
            'refresh_token': body.get('refresh_token'),
        }
    )


@app.post('/translate')
def translate() -> Response:
    payload = request.get_json(force=True)
    text = (payload or {}).get('text', '').strip()
    target_language = (payload or {}).get('target_language', 'Spanish').strip()
    if not text:
        return jsonify({'error': 'text is required'}), 400

    response = openai_client.responses.create(
        model='gpt-4.1-mini',
        input=[
            {'role': 'system', 'content': 'Translate medical text accurately and preserve clinical terms.'},
            {'role': 'user', 'content': f'Target language: {target_language}. Text: {text}'}
        ]
    )
    return jsonify({'translated_text': response.output_text.strip()})


@app.post('/generate-summary')
def generate_summary() -> Response:
    payload = request.get_json(force=True)
    transcript = (payload or {}).get('transcript', '').strip()
    if not transcript:
        return jsonify({'error': 'transcript is required'}), 400

    response = openai_client.responses.create(
        model='gpt-4.1-mini',
        input=[
            {
                'role': 'system',
                'content': (
                    'Create a patient-friendly visit summary using headings: '\
                    'Diagnosis, Medications, Instructions, Lifestyle Advice, Follow-Up Appointment, Warnings.'
                )
            },
            {'role': 'user', 'content': transcript}
        ]
    )
    return jsonify({'summary': response.output_text.strip()})


@app.post('/text-to-speech')
def text_to_speech() -> Response:
    payload = request.get_json(force=True)
    translated_text = (payload or {}).get('translated_text', '').strip()
    voice_id = (payload or {}).get('voice_id', '').strip()
    if not translated_text or not voice_id:
        return jsonify({'error': 'translated_text and voice_id are required'}), 400
    if not elevenlabs_api_key:
        return jsonify({'error': 'ELEVENLABS_API_KEY missing'}), 500

    with httpx.Client(timeout=30.0) as client:
        upstream = client.post(
            f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream',
            headers={'xi-api-key': elevenlabs_api_key},
            json={
                'text': translated_text,
                'model_id': 'eleven_multilingual_v2',
                'output_format': 'mp3_44100_128'
            }
        )

    if upstream.status_code >= 400:
        return jsonify({'error': upstream.text}), 502

    return Response(upstream.content, mimetype='audio/mpeg')


@app.post('/process-audio')
def process_audio() -> Response:
    audio = request.files.get('audio_chunk')
    language = request.form.get('language', 'en')
    if audio is None:
        return jsonify({'error': 'audio_chunk is required'}), 400
    if not elevenlabs_api_key:
        return jsonify({'error': 'ELEVENLABS_API_KEY missing'}), 500

    data = {'model_id': 'scribe_v1', 'language_code': language}
    files = {'file': (audio.filename or 'chunk.webm', audio.stream, audio.mimetype or 'audio/webm')}

    with httpx.Client(timeout=30.0) as client:
        upstream = client.post(
            'https://api.elevenlabs.io/v1/speech-to-text',
            headers={'xi-api-key': elevenlabs_api_key},
            data=data,
            files=files,
        )

    if upstream.status_code >= 400:
        return jsonify({'error': upstream.text}), 502

    body = upstream.json()
    transcript = (body.get('text') or body.get('transcript') or '').strip()
    return jsonify({'transcript': transcript})


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', '5000')),
        debug=False,
        use_reloader=False,
    )

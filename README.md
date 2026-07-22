# BridgeVoice

Real-time AI-powered healthcare communication platform designed to improve accessibility for deaf, hard-of-hearing, and multilingual patients through live transcription, translation, and AI-generated medical summaries.

---

## Overview

BridgeVoice is an AI-powered accessibility platform focused on improving communication equity in healthcare environments.

The system converts live speech into real-time captions, translates conversations across multiple languages, and generates simplified medical summaries to help patients better understand their care.

Built for the Health Equity track, BridgeVoice explores how conversational AI, speech technologies, and accessibility-first design can reduce communication barriers in healthcare settings.

---

## Inspiration

Millions of patients face barriers in healthcare due to hearing loss or language differences. Miscommunication can lead to misdiagnoses, medication errors, and emotional distress.

BridgeVoice was created to help bridge these communication gaps instantly through AI-powered real-time translation and accessibility tools.

---

## Problem

Patients who are deaf, hard-of-hearing, or non-native speakers often struggle to fully understand healthcare conversations.

Traditional healthcare communication workflows may:

- Create language accessibility barriers
- Increase misunderstanding during appointments
- Limit patient understanding of diagnoses and treatments
- Reduce healthcare equity and accessibility

---

## Solution

BridgeVoice introduces a real-time AI-powered healthcare communication system.

The platform:

- Converts speech into live captions
- Translates conversations into multiple languages
- Generates simplified AI-powered visit summaries
- Improves accessibility for multilingual and hearing-impaired patients
- Supports responsive mobile and web-based interaction

---

## System Overview

BridgeVoice processes live conversations and transforms them into accessible multilingual outputs in real time.

Pipeline:

Voice Input → Speech-to-Text → Translation Processing → AI Text Simplification → Real-Time Captions & Voice Output

---

## Key Features

- Real-time speech transcription
- AI-powered multilingual translation
- Simplified medical visit summaries using AI
- Accessibility-first healthcare interface
- Responsive mobile and web design
- Live interpreter dashboard
- Patient story carousel interface
- Real-time conversational processing
- Cross-device compatibility

---

## AI & Accessibility Highlights

- Real-time speech recognition workflows
- AI-generated simplified healthcare summaries
- Natural language translation pipelines
- Accessibility-focused user experience design
- Real-time multilingual communication support
- Conversational AI integration for healthcare understanding

---

## Tech Stack

### Frontend

- React
- Next.js
- Tailwind CSS
- Responsive UI Design

### Backend & Services

- Firebase Authentication
- Firebase Firestore
- Supabase
- Real-Time APIs
- WebSockets

### AI & APIs

- OpenAI GPT
- ElevenLabs
- Speech Recognition APIs
- Translation APIs (Google Translate / DeepL)

### Tools

- JavaScript / TypeScript
- HTML/CSS
- Carousel & UI Components

---

## Application Structure

/ → Project overview and setup instructions  
/dashboard → Live interpreter and accessibility dashboard  
/summaries → AI-generated medical visit summaries  
/stories → Patient story carousel experience  

---

## Running Locally

### 1) Configure Environment Variables

Create `.env` from `.env.example` and set your machine LAN IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LAN_IP>:8000
EXPO_PUBLIC_WS_URL=ws://<YOUR_LAN_IP>:8000/ws/session/mobile-demo
```

---

### 2) Start Frontend

```bash
npm install
npm run dev
```

Then open:

```bash
http://localhost:3000
```

---

### 3) Start Backend Server

```bash
python3 app.py
```

The backend binds to `0.0.0.0` in `app.py`, so devices on the same network can reach it.

---

## Deploying

BridgeVoice is split into two deployable parts:

- **Frontend:** deploy this repo to Vercel as a Next.js app.
- **Backend:** deploy `app.py` separately on Render, Fly.io, Railway, or another Python host.

Set these environment variables in Vercel:

- `NEXT_PUBLIC_API_BASE_URL` → your public backend URL, such as `https://api.yourdomain.com`
- `NEXT_PUBLIC_WS_URL` → your public websocket URL, such as `wss://api.yourdomain.com/ws/session/mobile-demo`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Set these environment variables on the backend host:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `FRONTEND_ORIGINS` → your Vercel domain

Do not route Vercel to `main.py`; that file is not the frontend entrypoint.

---

## Real-Time Architecture

BridgeVoice uses real-time APIs and streaming workflows to process live healthcare conversations.

The backend handles:

- Speech transcription
- Translation processing
- AI-generated summarization
- Real-time caption synchronization
- Live conversational updates
- Session management

---

## Backend Services

BridgeVoice uses Firebase and Supabase for backend infrastructure and cloud-based services.

Services include:

- User authentication
- Real-time database synchronization
- Visit summary storage
- Session management
- Scalable backend infrastructure support

---

## Challenges We Ran Into

- Real-time speech-to-text processing across different accents and languages
- Designing an interface accessible for both deaf and multilingual users
- Simplifying AI-generated medical summaries while maintaining accuracy
- Managing responsive real-time updates across devices

---

## Accomplishments We're Proud Of

- Built a functional live interpreter dashboard
- Created a responsive patient accessibility platform
- Implemented AI-generated simplified medical summaries
- Developed multilingual real-time communication workflows
- Designed an accessibility-first healthcare interface

---

## What We Learned

Building accessible AI systems requires both thoughtful design and strong technical implementation.

We learned how AI-powered communication systems can improve healthcare equity while also recognizing the importance of usability, simplicity, and real-world accessibility testing.

---

## Future Improvements

- Expanded language and dialect support
- Doctor mode for automatic visit note generation
- AI-powered healthcare risk alerts
- Clinic resource recommendations
- EHR integration for hospital systems
- Enhanced conversational AI workflows

---

## Results

- Built a fully functional healthcare accessibility prototype
- Demonstrated real-time multilingual communication workflows
- Implemented AI-powered healthcare summarization
- Validated responsive accessibility-focused UI design
- Created scalable real-time healthcare interaction architecture

---

## Team

Built during a healthcare-focused innovation hackathon by a student engineering team exploring how AI and accessibility technologies can improve communication equity in healthcare.

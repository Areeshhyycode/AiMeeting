# AI Meeting Summarizer

Upload a Zoom / Google Meet recording → get a transcript, summary, and action items, powered by **Groq** (Whisper + Llama 3.3).

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Groq SDK** — `whisper-large-v3` for transcription, `llama-3.3-70b-versatile` for summarization
- **MongoDB Atlas** — stores meeting history
- **ffmpeg.wasm** — extracts audio from video in the browser (no server upload of huge video files)

## How it works

```
[Browser]                      [Next.js API]              [Groq]
1. User picks meeting.mp4
2. ffmpeg.wasm strips video → audio.mp3 (16kHz mono, ~64kbps)
3. POST audio  ─────────────► /api/transcribe ──────────► Whisper
                                                          ↓
                                  ◄──────────── transcript text
4. POST transcript ────────►  /api/summarize  ──────────► Llama 3.3
                                                          ↓
                                  ◄──────────── { summary, key_points,
                                                   decisions, action_items }
5. POST result  ────────────► /api/meetings ──────────► MongoDB
```

The browser does the heavy ffmpeg work so the server never touches the raw 500 MB video — it only sees the ~25 MB compressed audio.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env.local`** (copy from `.env.example`)
   ```
   GROQ_API_KEY=your_groq_key_here
   MONGODB_URI=your_mongodb_connection_string
   MONGODB_DB=ai_meeting
   ```
   Get a Groq key at https://console.groq.com/keys

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Project structure

```
app/
├── page.tsx                      Upload UI
├── layout.tsx
├── globals.css
└── api/
    ├── transcribe/route.ts       Audio → text (Groq Whisper)
    ├── summarize/route.ts        Text → structured summary (Groq Llama)
    └── meetings/
        ├── route.ts              GET list / POST save
        └── [id]/route.ts         GET single / DELETE

lib/
├── groq.ts                       Groq client singleton
├── mongodb.ts                    MongoDB client singleton
└── extractAudio.ts               Browser ffmpeg.wasm helper

types/
└── index.ts                      Shared TypeScript types
```

## Limits

- Groq Whisper accepts audio files up to **25 MB**. The browser-side ffmpeg pipeline compresses to mono 16 kHz @ 64 kbps, which fits roughly **45–60 minutes** of audio. For longer recordings, chunk into multiple segments before transcribing.
- ffmpeg.wasm needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers — already configured in `next.config.js`.

## Security

Never commit `.env.local`. The `.gitignore` already excludes it. If a key is ever leaked, rotate it immediately:

- Groq: https://console.groq.com/keys
- MongoDB Atlas: Database Access → Edit user → Edit Password

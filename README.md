# بقدونس؟ ولّا كزبرة؟

A mobile-first Arabic (RTL) app that tells you whether a photo shows **coriander (كزبرة)** or **parsley (بقدونس)**.
Open the app, tap the button, snap the leaf, and the verdict lands as a stamp on your photo.

## How it works

- `app/components/Identifier.tsx`: the whole single-screen UX (`idle → analyzing → result | error`).
- `app/lib/resizeImage.ts`: downscales the photo to a ≤1024px JPEG in the browser before upload.
- `app/api/identify/route.ts`: sends the image to any OpenAI-compatible vision model and validates the JSON reply with zod (`app/lib/schema.ts`).
- `app/lib/prompt.ts`: the botanical cues and the output format.

No images are stored. Each photo only exists for the duration of its request.

## Setup

```bash
cp .env.example .env.local   # then fill in AI_API_KEY
npm install
npm run dev
```

The default provider is **Groq's free tier** (`qwen/qwen3.8-27b`, which accepts images). Get a key at https://console.groq.com/keys.
Any OpenAI-compatible endpoint with a vision model works (e.g. OpenRouter `:free` models): just change `AI_BASE_URL` / `AI_MODEL`.
`AI_FALLBACK_MODEL` is optional and must also support image input.

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (and optionally `AI_FALLBACK_MODEL`) under Project → Settings → Environment Variables.
3. Deploy. The app is installable to the home screen (PWA manifest + generated icons).

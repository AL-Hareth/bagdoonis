# بقدونس؟ ولّا كزبرة؟

A mobile-first Arabic (RTL) app that tells you whether a photo shows **coriander (كزبرة)** or **parsley (بقدونس)**.
Open the app, tap the button, snap the leaf, and the verdict lands as a stamp on your photo.

## How it works

- `app/components/Identifier.tsx`: the whole single-screen UX (`idle → analyzing → result | error`).
- `app/lib/resizeImage.ts`: downscales the photo to a ≤1024px JPEG in the browser before upload.
- `app/api/identify/route.ts`: sends the image to every configured vision model in parallel and validates each JSON reply with zod (`app/lib/schema.ts`).
- `app/lib/vote.ts`: picks the verdict. If 2+ models agree, that verdict wins; otherwise the most confident model wins; a tie for top confidence asks the user for another photo. A model that fails is silently skipped.
- `app/lib/providers.ts`: the providers (Groq, Gemini, OpenRouter).
- `app/lib/prompt.ts`: the botanical cues and the output format.

No images are stored. Each photo only exists for the duration of its request.

## Setup

```bash
cp .env.example .env.local   # then fill in the API keys
npm install
npm run dev
```

Three free-tier providers vote on each photo:

| Provider | Key | Default model |
|---|---|---|
| Groq | https://console.groq.com/keys | `qwen/qwen3.8-27b` |
| Google AI Studio | https://aistudio.google.com/apikey | `gemini-3.5-flash` |
| OpenRouter | https://openrouter.ai/settings/keys | `nvidia/nemotron-3.5-super-vl:free` |

Any provider without a key is skipped, so the app works with one, two, or all three. Override models with `GROQ_MODEL` / `GEMINI_MODEL` / `OPENROUTER_MODEL` (they must accept image input).
OpenRouter free models only work after enabling free-endpoint data policies at https://openrouter.ai/settings/privacy.

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add `GROQ_API_KEY`, `GEMINI_API_KEY` and `OPENROUTER_API_KEY` under Project → Settings → Environment Variables.
3. Deploy. The app is installable to the home screen (PWA manifest + generated icons).

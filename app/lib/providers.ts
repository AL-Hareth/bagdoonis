/** Vision models that vote on each photo. Server-only. All speak the OpenAI chat API. */

export type Provider = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
  /** Provider-specific fields merged into the request body. */
  body?: Record<string, unknown>;
};

const env = process.env;

const candidates: (Omit<Provider, "apiKey"> & { apiKey?: string })[] = [
  {
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL || "qwen/qwen3.8-27b",
  },
  {
    name: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: env.GEMINI_API_KEY,
    // Pinned: the "-latest" alias points at the newest Flash, which is often overloaded (503) on the free tier.
    model: env.GEMINI_MODEL || "gemini-3.5-flash",
  },
  {
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: env.OPENROUTER_API_KEY,
    // Free Gemma endpoints are often rate-limited upstream; Nemotron is reliable and a
    // different model family from Qwen/Gemini, which makes the vote more independent.
    model: env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-super-vl:free",
    headers: { "X-Title": "Bagdoonis" },
    // With reasoning on, Nemotron takes ~20–30s; off, ~3s.
    body: { reasoning: { enabled: false } },
  },
];

/** Providers with a key configured; the others are skipped. */
export const PROVIDERS: Provider[] = candidates.filter((p): p is Provider => Boolean(p.apiKey));

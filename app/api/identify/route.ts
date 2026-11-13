import { isJpegDataUrl, isSameOrigin, rateLimited, readBodyCapped } from "@/app/lib/guard";
import { SYSTEM_PROMPT, USER_PROMPT } from "@/app/lib/prompt";
import { PROVIDERS, type Provider } from "@/app/lib/providers";
import { IdentifyResult, type IdentifyError, type IdentifyResponse } from "@/app/lib/schema";
import { decide, hasMajority, type Answer } from "@/app/lib/vote";

export const maxDuration = 30;

// Client sends a ≤1024px JPEG (typically 100–400KB); these caps leave headroom
// while staying under Vercel's 4.5MB body limit.
const MAX_BODY_BYTES = 3_000_000;
const MAX_IMAGE_BYTES = 2_000_000;
const PROVIDER_TIMEOUT_MS = 20_000;

class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fail(error: IdentifyError["error"], status: number) {
  return Response.json({ error } satisfies IdentifyError, { status });
}

async function ask(provider: Provider, image: string, signal: AbortSignal) {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
      ...provider.headers,
    },
    body: JSON.stringify({
      ...provider.body,
      model: provider.model,
      temperature: 0.2,
      // Headroom for models that think before answering.
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new ProviderError(res.status, (await res.text()).slice(0, 500));
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  // Some reasoning models prepend <think>…</think>; keep only the JSON object.
  const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
  let parsed;
  try {
    parsed = IdentifyResult.safeParse(JSON.parse(json || "null"));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) {
    throw new ProviderError(502, `Bad model output: ${content.slice(0, 300)}`);
  }
  return parsed.data;
}

/**
 * Ask every provider in parallel. A failing provider is logged and ignored.
 * Resolves early once two models agree, since the rest can't change the outcome.
 */
function consult(image: string, requestSignal: AbortSignal) {
  const done = new AbortController();
  const signal = AbortSignal.any([requestSignal, done.signal]);
  const answers: Answer[] = [];
  const failures: number[] = [];

  return new Promise<{ answers: Answer[]; failures: number[] }>((resolve) => {
    let pending = PROVIDERS.length;
    const finish = () => {
      done.abort();
      resolve({ answers: [...answers], failures });
    };

    for (const provider of PROVIDERS) {
      ask(provider, image, AbortSignal.any([signal, AbortSignal.timeout(PROVIDER_TIMEOUT_MS)]))
        .then((result) => {
          if (signal.aborted) return;
          answers.push({ provider: provider.name, result });
          if (hasMajority(answers)) finish();
        })
        .catch((err) => {
          if (signal.aborted) return; // cancelled because we already have an answer
          failures.push(err instanceof ProviderError ? err.status : 502);
          console.error(`[identify] ${provider.name} (${provider.model}) failed:`, err instanceof Error ? err.message : err);
        })
        .finally(() => {
          if (--pending === 0) finish();
        });
    }
  });
}

export async function POST(request: Request) {
  if (PROVIDERS.length === 0) {
    console.error("No AI provider keys configured (GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY)");
    return fail("failed", 500);
  }

  if (!isSameOrigin(request)) return fail("failed", 403);
  if (rateLimited(request)) return fail("busy", 429);

  const raw = await readBodyCapped(request, MAX_BODY_BYTES);
  if (raw === null) return fail("bad_image", 413);

  let image: unknown;
  try {
    ({ image } = JSON.parse(raw));
  } catch {
    return fail("bad_image", 400);
  }
  if (!isJpegDataUrl(image, MAX_IMAGE_BYTES)) return fail("bad_image", 400);

  const { answers, failures } = await consult(image, request.signal);
  if (request.signal.aborted) return fail("failed", 499);

  const decision = decide(answers, PROVIDERS.length);
  if (decision) {
    console.info(
      `[identify] ${answers.map((a) => `${a.provider}=${a.result.verdict}/${a.result.confidence}`).join(" ")} → ${decision.verdict} (${decision.votes}/${decision.voters})`,
    );
    return Response.json(decision satisfies IdentifyResponse);
  }

  return failures.every((s) => s === 429) ? fail("busy", 429) : fail("failed", 502);
}

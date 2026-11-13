import { isJpegDataUrl, isSameOrigin, rateLimited, readBodyCapped } from "@/app/lib/guard";
import { SYSTEM_PROMPT, USER_PROMPT } from "@/app/lib/prompt";
import { IdentifyResult, type IdentifyError } from "@/app/lib/schema";

export const maxDuration = 30;

const BASE_URL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
// Client sends a ≤1024px JPEG (typically 100–400KB); these caps leave headroom
// while staying under Vercel's 4.5MB body limit.
const MAX_BODY_BYTES = 3_000_000;
const MAX_IMAGE_BYTES = 2_000_000;

class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fail(error: IdentifyError["error"], status: number) {
  return Response.json({ error } satisfies IdentifyError, { status });
}

async function ask(model: string, image: string, signal: AbortSignal) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_completion_tokens: 1024,
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
  const parsed = IdentifyResult.safeParse(JSON.parse(json || "null"));
  if (!parsed.success) {
    throw new ProviderError(502, `Bad model output: ${content.slice(0, 300)}`);
  }
  return parsed.data;
}

export async function POST(request: Request) {
  if (!process.env.AI_API_KEY || !process.env.AI_MODEL) {
    console.error("AI_API_KEY / AI_MODEL are not configured");
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

  const models = [process.env.AI_MODEL, process.env.AI_FALLBACK_MODEL].filter(
    (m): m is string => Boolean(m),
  );

  let lastStatus = 502;
  for (const model of models) {
    try {
      const result = await ask(model, image, AbortSignal.any([request.signal, AbortSignal.timeout(25_000)]));
      return Response.json(result satisfies IdentifyResult);
    } catch (err) {
      if (request.signal.aborted) return fail("failed", 499);
      lastStatus = err instanceof ProviderError ? err.status : 502;
      console.error(`[identify] ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return lastStatus === 429 ? fail("busy", 429) : fail("failed", 502);
}

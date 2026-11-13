/** Request hardening for /api/identify. Server-only. */

const JPEG_PREFIX = "data:image/jpeg;base64,";
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Read the request body as text, aborting as soon as it exceeds `maxBytes`
 * so oversized uploads are never fully buffered in memory.
 */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * The client always re-encodes photos to JPEG, so accept only a base64 JPEG
 * data URL whose decoded bytes really are a JPEG (SOI and EOI markers).
 */
export function isJpegDataUrl(value: unknown, maxBytes: number): value is string {
  if (typeof value !== "string" || !value.startsWith(JPEG_PREFIX)) return false;
  const b64 = value.slice(JPEG_PREFIX.length);
  if (b64.length % 4 !== 0 || !BASE64.test(b64)) return false;

  const bytes = Buffer.from(b64, "base64");
  if (bytes.length < 128 || bytes.length > maxBytes) return false;
  const soi = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const eoi = bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  return soi && eoi;
}

/**
 * Reject browser requests coming from other sites, so third-party pages can't
 * spend our model quota through their visitors. Non-browser clients send no
 * Origin and are covered by the rate limit instead.
 */
export function isSameOrigin(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

/**
 * Best-effort per-IP sliding-window limit. In-memory, so on serverless it's
 * per instance; use Vercel Firewall rate limiting or Upstash for a global limit.
 */
export function rateLimited(request: Request): boolean {
  // Vercel overwrites x-forwarded-for with the real client IP; elsewhere it may be spoofable.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);

  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

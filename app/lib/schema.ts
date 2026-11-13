import { z } from "zod";

export const Verdict = z.enum(["coriander", "parsley", "neither", "unclear"]);
export type Verdict = z.infer<typeof Verdict>;

export const IdentifyResult = z.object({
  verdict: Verdict,
  confidence: z.coerce
    .number()
    .transform((n) => Math.round(Math.min(100, Math.max(0, n)))),
  // Cap lengths so a prompt-injected image can't make the model dump arbitrary text into the UI.
  cues: z
    .array(z.string().trim().min(1))
    .default([])
    .transform((c) => c.slice(0, 3).map((s) => s.slice(0, 120))),
  quip: z
    .string()
    .trim()
    .default("")
    .transform((s) => s.slice(0, 160)),
});
export type IdentifyResult = z.infer<typeof IdentifyResult>;

export type IdentifyError = { error: "busy" | "bad_image" | "failed" };

import type { IdentifyResponse, IdentifyResult } from "./schema";

export type Answer = { provider: string; result: IdentifyResult };

/** True once any verdict has 2+ votes — the remaining models can't change the outcome. */
export function hasMajority(answers: Answer[]): boolean {
  const counts = new Map<string, number>();
  return answers.some(({ result }) => {
    const n = (counts.get(result.verdict) ?? 0) + 1;
    counts.set(result.verdict, n);
    return n >= 2;
  });
}

const DISAGREEMENT: IdentifyResult = {
  verdict: "unclear",
  confidence: 0,
  cues: ["لم تتفق النماذج على إجابة واحدة", "صوّر ورقة واحدة عن قرب وبإضاءة جيدة"],
  quip: "حتى الذكاء الاصطناعي احتار… فلا تلوم نفسك!",
};

/**
 * Pick the final answer from whichever models responded:
 * - 2+ models agree → that verdict wins (best-explained answer of the group, averaged confidence).
 * - Otherwise the most confident model wins.
 * - A tie for top confidence → ask the user for another photo.
 * Returns null when no model answered.
 */
export function decide(answers: Answer[], voters: number): IdentifyResponse | null {
  if (answers.length === 0) return null;
  const answered = answers.length;

  const groups = new Map<string, Answer[]>();
  for (const a of answers) {
    groups.set(a.result.verdict, [...(groups.get(a.result.verdict) ?? []), a]);
  }

  const byConfidence = (x: Answer, y: Answer) => y.result.confidence - x.result.confidence;
  const majority = [...groups.values()].find((g) => g.length >= 2);
  if (majority) {
    const best = [...majority].sort(byConfidence)[0].result;
    const avg = majority.reduce((sum, a) => sum + a.result.confidence, 0) / majority.length;
    return { ...best, confidence: Math.round(avg), votes: majority.length, answered, voters };
  }

  const [top, second] = [...answers].sort(byConfidence);
  if (second && top.result.confidence === second.result.confidence) {
    return { ...DISAGREEMENT, votes: 0, answered, voters };
  }
  return { ...top.result, votes: 1, answered, voters };
}

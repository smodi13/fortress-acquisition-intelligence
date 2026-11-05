import defaults from "@/data/workbook-assumptions.json";
import { toStored, fromStored, type FieldSpec } from "@/lib/finance/inputs";
import type { Ratings } from "./schema";

/** Screening weights. Stored as integer hundredths of a percent (20.00% -> 2000) like all assumptions. */
export const WEIGHT_KEYS = ["recurring", "residential", "austin", "owner", "sourceConfidence"] as const;
export type WeightKey = (typeof WEIGHT_KEYS)[number];
export type WeightState = Record<WeightKey, number>;

export const WEIGHT_LABELS: Record<WeightKey, string> = {
  recurring: "Recurring-service relevance",
  residential: "Residential-service fit",
  austin: "Austin / Central Texas adjacency",
  owner: "Public owner / operator evidence",
  sourceConfidence: "Source confidence",
};
export const weightSpec = (k: WeightKey): FieldSpec => ({
  id: `weight.${k}`,
  label: WEIGHT_LABELS[k],
  unit: "pct",
  min: 0,
  max: 100,
  note: "Analyst weight from the workbook Score Weights sheet.",
  group: "returns",
});

export const defaultWeights = (): WeightState =>
  Object.fromEntries(
    WEIGHT_KEYS.map((k) => [k, toStored("pct", (defaults.weights as Record<string, number>)[k]!)]),
  ) as WeightState;

export const THRESHOLDS = defaults.thresholds as { high: number; medium: number };
export const weightsSumValid = (w: WeightState) => WEIGHT_KEYS.reduce((s, k) => s + w[k], 0) === 10000;
export const weightsSumPct = (w: WeightState) => WEIGHT_KEYS.reduce((s, k) => s + w[k], 0) / 100;

export type ResearchLabel = "High research" | "Medium research" | "Watchlist";

/** score = recurring*w1 + residential*w2 + austin*w3 + owner*w4 + source_confidence*w5 */
export function score(r: Ratings, w: WeightState): number {
  return WEIGHT_KEYS.reduce((s, k) => s + r[k] * fromStored("pct", w[k]), 0);
}

/** Threshold comparison uses a 1e-9 tolerance so binary floating-point noise cannot flip a label. */
export function labelOf(s: number): ResearchLabel {
  const x = Math.round(s * 1e9) / 1e9;
  return x >= THRESHOLDS.high ? "High research" : x >= THRESHOLDS.medium ? "Medium research" : "Watchlist";
}

/** Competition ranking (ties share a rank); deterministic order within a tie: company id. */
export function rankAll<T extends { id: string; score: number }>(items: T[]): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => Math.round((b.score - a.score) * 1e9) || a.id.localeCompare(b.id));
  return sorted.map((it, i) => {
    const first = sorted.findIndex((x) => Math.round(x.score * 1e9) === Math.round(it.score * 1e9));
    return { ...it, rank: first + 1 };
  });
}

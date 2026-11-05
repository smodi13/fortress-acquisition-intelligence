import type { Company } from "./schema";
import { METROS } from "./schema";
import { defaultWeights, labelOf, rankAll, score } from "./score";

/** Companies scored with the workbook's default weights, ranked (ties share a rank). */
export function scoredDefault(companies: Company[]) {
  const w = defaultWeights();
  return rankAll(
    companies.map((c) => ({ ...c, score: score(c.ratings, w), label: labelOf(score(c.ratings, w)) })),
  );
}

export const countBy = <T>(items: T[], key: (t: T) => string[]) => {
  const m = new Map<string, number>();
  for (const it of items) for (const k of key(it)) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

export const metroCounts = (cs: Company[]) =>
  METROS.map((m) => [m, cs.filter((c) => c.metro === m).length] as const);

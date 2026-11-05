import type { Company } from "./schema";

export interface DataFlag {
  code: string;
  text: string;
}

/**
 * Deterministic data-quality flags derived ONLY from fields already in the supplied CSV.
 * These describe what the source data says is unverified; they add no new research.
 */
export function dataFlags(c: Company): DataFlag[] {
  const f: DataFlag[] = [];
  if (/unverified|not independently identified|names unverified/i.test(c.leadership))
    f.push({
      code: "LEADERSHIP_UNVERIFIED",
      text: "Owner or leadership identity is incomplete in the public source (flagged unverified in the research data).",
    });
  if (c.foundedYear === null)
    f.push({ code: "FOUNDED_MISSING", text: "Founding year is not stated in the source data." });
  if (/commercial|mixed|verify/i.test(c.businessMix))
    f.push({
      code: "MIX_UNCLEAR",
      text: `Service mix is recorded as "${c.businessMix}": residential vs. commercial split is unconfirmed.`,
    });
  if (/non-pe/i.test(c.ownershipClaim))
    f.push({
      code: "SELF_REPORTED_NON_PE",
      text: "Company states it is not private-equity owned. This is a self-report and does not indicate receptivity to a transaction.",
    });
  return f;
}

/** Diligence items common to every candidate, taken from the supplied memo and playbook. */
export const STANDARD_MISSING_INFORMATION = [
  "Revenue, EBITDA, free cash flow, balance sheet (none verified)",
  "Legal ownership, entity structure and succession priorities",
  "Owner willingness to sell or partner (unknown; not contacted)",
  "Texas contractor license verification (TDLR / TSBPE: pending)",
  "Revenue by service type, recurring agreement retention, new-build and commercial exposure",
  "Technician headcount, tenure, utilization and callback rates",
];

/** Research steps from the Executive Brief's 30-day sequence (weeks 1-3). */
export const NEXT_RESEARCH_STEPS = [
  "Week 1: independently verify the corporate entity, licenses, operating geography and signs of existing institutional ownership; exclude if contradicted.",
  "Week 2: collect customer mix, maintenance-program indicators, hiring history, public permits where appropriate and competitive density.",
  "Week 3: consider for a 10-company qualification shortlist with an owner-partnership narrative and evidence-backed objections.",
  "Outreach only if authorized by Ridgepeak (Week 4); never imply investor affiliation. No outreach has occurred.",
];

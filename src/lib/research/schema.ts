import { z } from "zod";

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "must be an https URL");
const rating = z.coerce.number().int().min(1).max(5);

/** Raw row of screening_pipeline_30.csv. .strict(): any extra column (e.g. revenue) is rejected. */
export const PipelineRow = z
  .object({
    id: z.string().regex(/^FAI-\d{3}$/),
    company: z.string().min(1),
    market: z.string().min(1),
    services: z.string().min(1),
    business_mix: z.string().min(1),
    founded_year: z.string().regex(/^(\d{4})?$/),
    publicly_identified_leadership: z.string().min(1),
    ownership_claim: z.string().min(1),
    primary_source_url: httpsUrl,
    recurring_relevance_1_5: rating,
    residential_fit_1_5: rating,
    austin_adjacency_1_5: rating,
    owner_evidence_1_5: rating,
    source_confidence_1_5: rating,
    screening_note: z.string().min(1),
  })
  .strict();

/** Raw row of evidence_register.csv. */
export const EvidenceRow = z
  .object({
    evidence_id: z.string().regex(/^EV-FAI-\d{3}$/),
    company_id: z.string().regex(/^FAI-\d{3}$/),
    source_url: httpsUrl,
    source_type: z.string().min(1),
    accessed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    supports: z.string().min(1),
    verification_status: z.string().min(1),
    financial_disclosure: z.string().min(1),
    seller_intent: z.string().min(1),
  })
  .strict();

export const Manifest = z.object({
  project: z.string(),
  status: z.string(),
  as_of: z.string(),
  population_count: z.number().int(),
  candidate_status: z.literal("UNCONTACTED_RESEARCH_ONLY"),
  all_company_financials: z.literal("NOT_VERIFIED"),
  decision: z.string(),
  source_docs: z.record(z.string(), httpsUrl),
  compliance: z.string(),
});

/** Public owner stance toward a sale or outside investment. Distinct from strategic fit (the research score). */
export const STANCES = ["OPPOSED", "OPEN", "NO_POSITION", "NEEDS_VERIFICATION", "NOT_ASSESSED"] as const;
export type Stance = (typeof STANCES)[number];

/** Analyst-supplied finding. Always a company self-report; can never be marked independently verified. */
export const Finding = z
  .object({
    companyId: z.string().regex(/^FAI-\d{3}$/),
    stance: z.enum(["OPPOSED", "OPEN", "NO_POSITION", "NEEDS_VERIFICATION"]),
    statement: z.string().min(10),
    sourceUrl: httpsUrl,
    accessedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    provenance: z.literal("company_self_reported"),
    independentlyVerified: z.literal(false),
  })
  .strict();
export const FindingsFile = z.object({ source: z.string().min(1), findings: z.array(Finding) }).strict();
export type FindingRecord = z.infer<typeof Finding>;

export type Ratings = {
  recurring: number;
  residential: number;
  austin: number;
  owner: number;
  sourceConfidence: number;
};
export type Evidence = z.infer<typeof EvidenceRow>;

export type Metro = "Austin / Central Texas" | "San Antonio" | "Dallas–Fort Worth" | "Houston";
export const METROS: Metro[] = ["Austin / Central Texas", "San Antonio", "Dallas–Fort Worth", "Houston"];

/** Deterministic normalization of the free-text `market` column into four filterable metros. */
export function metroOf(market: string): Metro {
  if (/austin|pflugerville|central texas|hill country/i.test(market)) return "Austin / Central Texas";
  if (/san antonio/i.test(market)) return "San Antonio";
  if (/dallas|fort worth|dfw|flower mound/i.test(market)) return "Dallas–Fort Worth";
  if (/houston|fort bend|pearland|katy|spring|sugar land|college station/i.test(market)) return "Houston";
  throw new Error(`Unmapped market: ${market}`);
}

export interface Company {
  id: string;
  name: string;
  market: string;
  metro: Metro;
  services: string[];
  businessMix: string;
  foundedYear: number | null;
  leadership: string;
  ownershipClaim: string;
  sourceUrl: string;
  ratings: Ratings;
  note: string;
  evidence: Evidence;
  /** NOT_ASSESSED unless an analyst-supplied finding exists for this company. No stance is ever inferred. */
  stance: Stance;
  stanceFinding: FindingRecord | null;
}

import { z } from "zod";
import { EvidenceRow, Finding, PipelineRow, metroOf, type Company, type FindingRecord } from "./schema";

export const EXPECTED_COMPANIES = 30;

/** Normalizes validated raw rows into Company records. Throws on any schema violation. */
export function normalize(
  pipelineRaw: Record<string, string>[],
  evidenceRaw: Record<string, string>[],
  findingsRaw: unknown[] = [],
): Company[] {
  const findings: FindingRecord[] = z.array(Finding).parse(findingsRaw);
  const byId = new Map<string, FindingRecord>();
  for (const f of findings) {
    if (byId.has(f.companyId)) throw new Error(`${f.companyId}: duplicate analyst finding`);
    byId.set(f.companyId, f);
  }
  const rows = z.array(PipelineRow).parse(pipelineRaw);
  const ev = z.array(EvidenceRow).parse(evidenceRaw);
  return rows.map((r) => {
    const e = ev.find((x) => x.company_id === r.id);
    if (!e) throw new Error(`${r.id}: no evidence row`);
    return {
      id: r.id,
      name: r.company,
      market: r.market,
      metro: metroOf(r.market),
      services: r.services.split(";").map((s) => s.trim()),
      businessMix: r.business_mix,
      foundedYear: r.founded_year === "" ? null : Number(r.founded_year),
      leadership: r.publicly_identified_leadership,
      ownershipClaim: r.ownership_claim,
      sourceUrl: r.primary_source_url,
      ratings: {
        recurring: r.recurring_relevance_1_5,
        residential: r.residential_fit_1_5,
        austin: r.austin_adjacency_1_5,
        owner: r.owner_evidence_1_5,
        sourceConfidence: r.source_confidence_1_5,
      },
      note: r.screening_note,
      evidence: e,
      stance: byId.get(r.id)?.stance ?? "NOT_ASSESSED",
      stanceFinding: byId.get(r.id) ?? null,
    };
  });
}

/**
 * Dataset integrity rules. Returns a list of violations (empty = valid).
 * Encodes the handoff's data-integrity rules so they cannot regress silently.
 */
export function integrityErrors(companies: Company[], evidenceRaw: Record<string, string>[]): string[] {
  const errs: string[] = [];
  if (companies.length !== EXPECTED_COMPANIES)
    errs.push(`expected exactly ${EXPECTED_COMPANIES} companies, found ${companies.length}`);
  const dup = (label: string, vals: string[]) => {
    const seen = new Set<string>();
    for (const v of vals) {
      if (seen.has(v)) errs.push(`duplicate ${label}: ${v}`);
      seen.add(v);
    }
  };
  dup(
    "company id",
    companies.map((c) => c.id),
  );
  dup(
    "company name",
    companies.map((c) => c.name.toLowerCase()),
  );
  dup(
    "evidence id",
    evidenceRaw.map((e) => e["evidence_id"] ?? ""),
  );
  dup(
    "evidence company_id",
    evidenceRaw.map((e) => e["company_id"] ?? ""),
  );
  if (evidenceRaw.length !== companies.length)
    errs.push(`evidence rows (${evidenceRaw.length}) != companies (${companies.length})`);
  for (const c of companies) {
    if (c.stanceFinding) {
      const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
      if (host(c.stanceFinding.sourceUrl) !== host(c.sourceUrl))
        errs.push(`${c.id}: stance source must be on the company's own domain`);
    }
    if (c.evidence.source_url !== c.sourceUrl)
      errs.push(`${c.id}: evidence URL differs from primary_source_url`);
    if (c.evidence.evidence_id !== `EV-${c.id}`) errs.push(`${c.id}: evidence id mismatch`);
    // No claim of sale intent, contact, or verified financials without a supplied, dated record.
    if (!/^Unknown\b/i.test(c.evidence.seller_intent))
      errs.push(`${c.id}: seller_intent must be Unknown (found "${c.evidence.seller_intent}")`);
    if (!/^No verified\b/i.test(c.evidence.financial_disclosure))
      errs.push(`${c.id}: financial_disclosure must state no verified financials`);
    if (
      /\b(contacted|for sale|listed for sale|willing to sell|loi signed|under contract)\b/i.test(
        `${c.note} ${c.evidence.supports} ${c.evidence.verification_status}`.replace(
          /(not|never|no|nor|neither)\s+(been\s+)?(contacted|for sale)/gi,
          "",
        ),
      )
    )
      errs.push(`${c.id}: text asserts contact/sale status without a dated record`);
  }
  return errs;
}

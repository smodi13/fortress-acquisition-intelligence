/**
 * Strategic fit (research score) and transaction readiness (public owner stance) are separate concepts.
 * The score and its formula are never changed by stance. A publicly opposed stance only removes a company
 * from the immediate outreach shortlist; it stays in the research universe with its original score.
 * No stance is ever inferred: companies without an analyst-supplied finding are NOT_ASSESSED.
 */
import type { OwnershipRecord, Stance } from "./schema";

type OwnershipType = OwnershipRecord["ownershipType"];
type PeStatus = OwnershipRecord["peStatus"];
import type { ResearchLabel } from "./score";

export const STANCE_LABEL: Record<Stance, string> = {
  OPPOSED: "Publicly opposed to sale or outside investment",
  OPEN: "Publicly indicated openness to partnerships",
  NO_POSITION: "No public position identified",
  NEEDS_VERIFICATION: "Requires additional verification",
  NOT_ASSESSED: "Not yet assessed",
};

export type OutreachStatus = "EXCLUDED" | "SHORTLIST" | "NOT_ESTABLISHED";

export const OUTREACH_LABEL: Record<OutreachStatus, string> = {
  EXCLUDED: "Excluded: publicly opposed",
  SHORTLIST: "Immediate outreach shortlist",
  NOT_ESTABLISHED: "Readiness not established",
};

/**
 * Outreach priority is a function of stance and strategic fit:
 * - OPPOSED -> EXCLUDED, whatever the score.
 * - OPEN with at least Medium strategic fit -> SHORTLIST (still requires authorization; none has occurred).
 * - everything else -> NOT_ESTABLISHED: transaction readiness has no supporting evidence yet.
 */
export function outreachOf(stance: Stance, fit: ResearchLabel): OutreachStatus {
  if (stance === "OPPOSED") return "EXCLUDED";
  if (stance === "OPEN" && fit !== "Watchlist") return "SHORTLIST";
  return "NOT_ESTABLISHED";
}

/** Ownership characteristics: who owns the business and whether it reports PE backing. Not a transaction stance. */
export const OWNERSHIP_LABEL: Record<OwnershipType | "NOT_ASSESSED", string> = {
  FAMILY_OWNED: "Family-owned (company self-reported)",
  NOT_ASSESSED: "Not yet assessed",
};
export const PE_LABEL: Record<PeStatus | "NOT_ASSESSED", string> = {
  NO_PE_REPORTED: "Not currently PE-backed (company self-reported)",
  NOT_ASSESSED: "Not yet assessed",
};
/** Seller intent is Unknown for every company: no ownership or stance finding changes it. */
export const SELLER_INTENT_LABEL = "Unknown";

/** Units: USD millions for amounts; rates and percentages as fractions (0.18 = 18.00%). */
export const SCENARIOS = ["Downside", "Base", "Upside"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export interface CaseAssumptions {
  growth: number;
  ebitdaMargin: number;
  exitMultiple: number;
}

export interface DealAssumptions {
  baselineRevenue: number;
  entryMultiple: number;
  debtToEbitda: number;
  maxDebtPctEv: number;
  cashInterestRate: number;
  taxRate: number;
  capexPct: number;
  depreciationPct: number;
  nwcPctIncrementalRevenue: number;
  rolloverPctEv: number;
  transactionFeesPctEv: number;
  financingFeesPctDebt: number;
  mandatoryAmortPct: number;
  yearlySynergy: number;
  synergyStartYear: number;
  integrationCost: number;
  integrationYear: number;
  targetIrr: number;
  holdYears: number;
  sensitivityStep: number;
}

export interface ModelInputs {
  scenario: Scenario;
  cases: Record<Scenario, CaseAssumptions>;
  deal: DealAssumptions;
}

export const HORIZON = 5;

export interface Entry {
  revenue0: number;
  ebitda0: number;
  enterpriseValue: number;
  originalDebt: number;
  debtCapBinding: boolean;
  rolloverEquity: number;
  transactionFees: number;
  financingFees: number;
  totalUses: number;
  sponsorEquity: number;
  totalSources: number;
  sourcesLessUses: number;
  sponsorOwnership: number;
  sellerOwnership: number;
  ownershipSumLessOne: number;
  debtToEbitda: number;
  debtToEv: number;
}

/** Arrays are indexed by fiscal period 0..5 (period 0 = entry year, as in the workbook). */
export interface Forecast {
  period: number[];
  revenue: number[];
  growth: number[];
  margin: number[];
  operatingEbitda: number[];
  synergies: number[];
  totalEbitda: number[];
  da: number[];
  ebit: number[];
  beginDebt: number[];
  interest: number[];
  taxableIncome: number[];
  cashTaxes: number[];
  capex: number[];
  nwcInvestment: number[];
  integration: number[];
  freeCashFlow: number[];
  mandatoryPaid: number[];
  sweepPaid: number[];
  totalPaid: number[];
  endDebt: number[];
  beginCash: number[];
  endCash: number[];
  operatingShortfall: number[];
  reconciliationError: number[];
  unpaidMandatory: number[];
}

export type CaseStatus =
  | "FUNDING REQUIRED"
  | "PASSES ILLUSTRATIVE HURDLE"
  | "BELOW ILLUSTRATIVE HURDLE"
  | "INVALID: NO RETURN COMPUTED";

export interface Returns {
  year5Ebitda: number;
  exitMultiple: number;
  exitEv: number;
  endingDebt: number;
  endingCash: number;
  exitEquity: number;
  sponsorOwnership: number;
  sponsorProceeds: number;
  sponsorEquity: number;
  /** null when the return math is invalid (see flags); the workbook would show 0 via IFERROR. */
  moic: number | null;
  irr: number | null;
  targetIrr: number;
  irrSurplus: number | null;
  entryFundingCheck: number;
  totalFundingShortfall: number;
  status: CaseStatus;
}

export interface Flag {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface Check {
  label: string;
  pass: boolean;
  detail: string;
}

export interface ModelResult {
  scenario: Scenario;
  active: CaseAssumptions;
  entry: Entry;
  forecast: Forecast;
  returns: Returns;
  flags: Flag[];
  checks: Check[];
}

export interface SensitivityGrid {
  entryMultiples: number[];
  exitMultiples: number[];
  /** [entryIndex][exitIndex]; null = not meaningful (invalid equity or multiple) */
  irr: (number | null)[][];
}

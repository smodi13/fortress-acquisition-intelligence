/**
 * Deterministic calculation engine. Mirrors the supplied workbook
 * (Fortress_Illustrative_Acquisition_Underwriting.xlsx) cell for cell.
 * Pure functions, no UI imports. Full floating-point precision is kept throughout;
 * rounding happens only in format.ts for display.
 */
import {
  HORIZON,
  type Check,
  type Entry,
  type Flag,
  type Forecast,
  type ModelInputs,
  type ModelResult,
  type Returns,
  type Scenario,
  type SensitivityGrid,
} from "./types";

const zeros = () => new Array<number>(HORIZON + 1).fill(0);

function computeEntry(i: ModelInputs, margin: number): Entry {
  const d = i.deal;
  const revenue0 = d.baselineRevenue;
  const ebitda0 = revenue0 * margin;
  const enterpriseValue = ebitda0 * d.entryMultiple;
  const byEbitda = ebitda0 * d.debtToEbitda;
  const byCap = enterpriseValue * d.maxDebtPctEv;
  const originalDebt = Math.min(byEbitda, byCap);
  const rolloverEquity = enterpriseValue * d.rolloverPctEv;
  const transactionFees = enterpriseValue * d.transactionFeesPctEv;
  const financingFees = originalDebt * d.financingFeesPctDebt;
  const totalUses = enterpriseValue + transactionFees + financingFees;
  const sponsorEquity = totalUses - (originalDebt + rolloverEquity);
  const totalSources = originalDebt + rolloverEquity + sponsorEquity;
  const eq = rolloverEquity + sponsorEquity;
  const sponsorOwnership = eq !== 0 && Number.isFinite(eq) ? sponsorEquity / eq : 0;
  const sellerOwnership = eq !== 0 && Number.isFinite(eq) ? rolloverEquity / eq : 0;
  return {
    revenue0,
    ebitda0,
    enterpriseValue,
    originalDebt,
    debtCapBinding: byCap < byEbitda,
    rolloverEquity,
    transactionFees,
    financingFees,
    totalUses,
    sponsorEquity,
    totalSources,
    sourcesLessUses: totalSources - totalUses,
    sponsorOwnership,
    sellerOwnership,
    ownershipSumLessOne: sponsorOwnership + sellerOwnership - 1,
    debtToEbitda: ebitda0 !== 0 ? originalDebt / ebitda0 : 0,
    debtToEv: enterpriseValue !== 0 ? originalDebt / enterpriseValue : 0,
  };
}

function computeForecast(i: ModelInputs, entry: Entry, growth: number, margin: number): Forecast {
  const d = i.deal;
  const f: Forecast = {
    period: [0, 1, 2, 3, 4, 5],
    revenue: zeros(),
    growth: zeros(),
    margin: zeros(),
    operatingEbitda: zeros(),
    synergies: zeros(),
    totalEbitda: zeros(),
    da: zeros(),
    ebit: zeros(),
    beginDebt: zeros(),
    interest: zeros(),
    taxableIncome: zeros(),
    cashTaxes: zeros(),
    capex: zeros(),
    nwcInvestment: zeros(),
    integration: zeros(),
    freeCashFlow: zeros(),
    mandatoryPaid: zeros(),
    sweepPaid: zeros(),
    totalPaid: zeros(),
    endDebt: zeros(),
    beginCash: zeros(),
    endCash: zeros(),
    operatingShortfall: zeros(),
    reconciliationError: zeros(),
    unpaidMandatory: zeros(),
  };
  const set = (k: keyof Forecast, y: number, v: number) => {
    f[k][y] = v;
  };
  // Period 0 (entry year) columns that the workbook populates.
  f.revenue[0] = d.baselineRevenue;
  for (let y = 0; y <= HORIZON; y++) {
    if (y > 0) {
      set("revenue", y, f.revenue[y - 1]! * (1 + growth));
      set("growth", y, f.revenue[y - 1]! !== 0 ? f.revenue[y]! / f.revenue[y - 1]! - 1 : 0);
    }
    set("margin", y, margin);
    set("operatingEbitda", y, f.revenue[y]! * margin);
    set("synergies", y, y >= 1 && y >= d.synergyStartYear ? d.yearlySynergy : 0);
    set("totalEbitda", y, f.operatingEbitda[y]! + f.synergies[y]!);
    set("da", y, f.revenue[y]! * d.depreciationPct);
    set("ebit", y, f.totalEbitda[y]! - f.da[y]!);
    if (y === 0) {
      f.taxableIncome[0] = f.ebit[0]!;
      continue;
    }
    set("beginDebt", y, y === 1 ? entry.originalDebt : f.endDebt[y - 1]!);
    set("interest", y, f.beginDebt[y]! * d.cashInterestRate);
    set("taxableIncome", y, f.ebit[y]! - f.interest[y]!);
    set("cashTaxes", y, Math.max(0, f.taxableIncome[y]! * d.taxRate));
    set("capex", y, f.revenue[y]! * d.capexPct);
    set("nwcInvestment", y, Math.max(0, f.revenue[y]! - f.revenue[y - 1]!) * d.nwcPctIncrementalRevenue);
    set("integration", y, y === d.integrationYear ? d.integrationCost : 0);
    set(
      "freeCashFlow",
      y,
      f.totalEbitda[y]! -
        f.interest[y]! -
        f.cashTaxes[y]! -
        f.capex[y]! -
        f.nwcInvestment[y]! -
        f.integration[y]!,
    );
    set("beginCash", y, y === 1 ? 0 : f.endCash[y - 1]!);
    const available = f.freeCashFlow[y]! + f.beginCash[y]!;
    const mandatoryDue = entry.originalDebt * d.mandatoryAmortPct;
    set("mandatoryPaid", y, Math.min(f.beginDebt[y]!, mandatoryDue, Math.max(0, available)));
    set(
      "sweepPaid",
      y,
      Math.min(
        Math.max(0, f.beginDebt[y]! - f.mandatoryPaid[y]!),
        Math.max(0, available - f.mandatoryPaid[y]!),
      ),
    );
    set("totalPaid", y, f.mandatoryPaid[y]! + f.sweepPaid[y]!);
    set("endDebt", y, Math.max(0, f.beginDebt[y]! - f.totalPaid[y]!));
    set("endCash", y, Math.max(0, f.beginCash[y]! + f.freeCashFlow[y]! - f.totalPaid[y]!));
    set("operatingShortfall", y, Math.max(0, -available));
    set(
      "reconciliationError",
      y,
      f.beginCash[y]! + f.freeCashFlow[y]! - f.totalPaid[y]! - f.endCash[y]! + f.operatingShortfall[y]!,
    );
    set("unpaidMandatory", y, Math.max(0, Math.min(f.beginDebt[y]!, mandatoryDue) - f.mandatoryPaid[y]!));
  }
  return f;
}

const sum = (a: number[], from = 1) => a.slice(from).reduce((s, x) => s + x, 0);

function computeReturns(i: ModelInputs, entry: Entry, f: Forecast, exitMultiple: number): Returns {
  const year5Ebitda = f.totalEbitda[HORIZON]!;
  const exitEv = year5Ebitda * exitMultiple;
  const endingDebt = f.endDebt[HORIZON]!;
  const endingCash = f.endCash[HORIZON]!;
  const exitEquity = exitEv - endingDebt + endingCash;
  const sponsorProceeds = exitEquity * entry.sponsorOwnership;
  const totalFundingShortfall = sum(f.operatingShortfall) + sum(f.unpaidMandatory);
  const moic = entry.sponsorEquity > 0 ? sponsorProceeds / entry.sponsorEquity : null;
  const irr =
    moic !== null && moic >= 0 && Number.isFinite(moic) && i.deal.holdYears > 0
      ? moic ** (1 / i.deal.holdYears) - 1
      : null;
  const targetIrr = i.deal.targetIrr;
  const status: Returns["status"] =
    irr === null
      ? "INVALID: NO RETURN COMPUTED"
      : totalFundingShortfall > 0
        ? "FUNDING REQUIRED"
        : irr >= targetIrr
          ? "PASSES ILLUSTRATIVE HURDLE"
          : "BELOW ILLUSTRATIVE HURDLE";
  return {
    year5Ebitda,
    exitMultiple,
    exitEv,
    endingDebt,
    endingCash,
    exitEquity,
    sponsorOwnership: entry.sponsorOwnership,
    sponsorProceeds,
    sponsorEquity: entry.sponsorEquity,
    moic,
    irr,
    targetIrr,
    irrSurplus: irr === null ? null : irr - targetIrr,
    entryFundingCheck: entry.sourcesLessUses,
    totalFundingShortfall,
    status,
  };
}

const r2 = (x: number) => Math.round(x * 100) / 100; // used ONLY for the workbook's ROUND(...,2) checks

function computeChecks(i: ModelInputs, e: Entry, f: Forecast, r: Returns): Check[] {
  const maxRecon = Math.max(...f.reconciliationError.slice(1).map(Math.abs));
  const c = (label: string, pass: boolean, detail: string): Check => ({ label, pass, detail });
  return [
    c("Sources / uses match", r2(e.sourcesLessUses) === 0, "Total sources equal total uses"),
    c("Ownership percentages sum to 100%", r2(e.ownershipSumLessOne) === 0, "Sponsor + seller = 100%"),
    c("Sponsor equity positive", e.sponsorEquity > 0, "Sponsor equity required > 0"),
    c(
      "No unfinanced forecast shortfall",
      r.totalFundingShortfall === 0,
      "Model does not draw a revolver or inject equity",
    ),
    c("Non-negative exit equity", r.exitEquity >= 0, "Exit distributable equity >= 0"),
    c("Revenue stays positive", Math.min(...f.revenue.slice(1)) > 0, "Revenue > 0 in Years 1-5"),
    c(
      "Cash reconciliation balances",
      r2(maxRecon) === 0,
      "Begin cash + FCF - debt paid - end cash + shortfall = 0",
    ),
    c(
      "Scenario valid",
      (["Downside", "Base", "Upside"] as Scenario[]).includes(i.scenario),
      "Downside, Base or Upside",
    ),
    c(
      "Mandatory debt amortization paid",
      r2(sum(f.unpaidMandatory)) === 0,
      "No unpaid mandatory amortization",
    ),
  ];
}

function computeFlags(
  i: ModelInputs,
  e: Entry,
  f: Forecast,
  r: Returns,
  active: { exitMultiple: number },
): Flag[] {
  const out: Flag[] = [];
  const add = (code: string, severity: Flag["severity"], message: string) =>
    out.push({ code, severity, message });
  if (!(e.sponsorEquity > 0))
    add(
      "SPONSOR_EQUITY_NONPOSITIVE",
      "error",
      "Sponsor equity is zero or negative: the capital stack is not fundable as specified. No MOIC or IRR is computed.",
    );
  if (Math.min(...f.revenue) <= 0)
    add("REVENUE_NONPOSITIVE", "error", "Forecast revenue is zero or negative.");
  if (r.exitEquity < 0) add("EXIT_EQUITY_NEGATIVE", "error", "Exit distributable equity is negative.");
  if (i.deal.holdYears !== HORIZON)
    add(
      "HOLD_NOT_HORIZON",
      "error",
      `Exit is modeled at Year ${HORIZON}; hold period must equal ${HORIZON}.`,
    );
  const opGap = sum(f.operatingShortfall);
  if (opGap > 0)
    add(
      "OPERATING_SHORTFALL",
      "error",
      "Operating cash shortfall: the model does not draw a revolver or fund incremental sponsor equity, so this deficit is unfinanced.",
    );
  const amGap = sum(f.unpaidMandatory);
  if (amGap > 0)
    add("UNPAID_AMORTIZATION", "error", "Mandatory amortization was not fully paid from available cash.");
  if (e.debtCapBinding)
    add(
      "DEBT_CAP_BINDING",
      "info",
      "Debt is sized by the maximum debt / EV cap rather than the debt / EBITDA multiple.",
    );
  if (active.exitMultiple > i.deal.entryMultiple)
    add(
      "MULTIPLE_EXPANSION",
      "warning",
      "Exit multiple exceeds entry multiple: part of the return depends on multiple expansion.",
    );
  if (r.irr !== null && r.irr < r.targetIrr)
    add("BELOW_HURDLE", "warning", "Gross IRR is below the illustrative target IRR.");
  return out;
}

export function runModel(inputs: ModelInputs): ModelResult {
  const active = inputs.cases[inputs.scenario];
  const entry = computeEntry(inputs, active.ebitdaMargin);
  const forecast = computeForecast(inputs, entry, active.growth, active.ebitdaMargin);
  const returns = computeReturns(inputs, entry, forecast, active.exitMultiple);
  return {
    scenario: inputs.scenario,
    active,
    entry,
    forecast,
    returns,
    flags: computeFlags(inputs, entry, forecast, returns, active),
    checks: computeChecks(inputs, entry, forecast, returns),
  };
}

/**
 * Workbook-parity sensitivity (Sensitivity sheet): varies entry and exit multiples only.
 * Debt sizing, debt paydown and exit cash are HELD CONSTANT at the active case: a partial
 * valuation sensitivity, not a full re-underwrite.
 */
export function partialSensitivity(inputs: ModelInputs, m: ModelResult): SensitivityGrid {
  const d = inputs.deal;
  const steps = [-2, -1, 0, 1, 2];
  const entryMultiples = steps.map((s) => d.entryMultiple + s * d.sensitivityStep);
  const exitMultiples = steps.map((s) => m.active.exitMultiple + s * d.sensitivityStep);
  const e = m.entry;
  const irr = entryMultiples.map((en) =>
    exitMultiples.map((ex) => {
      const equity =
        e.ebitda0 * en * (1 + d.transactionFeesPctEv) +
        e.originalDebt * d.financingFeesPctDebt -
        e.originalDebt;
      const exitEquity =
        m.forecast.totalEbitda[HORIZON]! * ex - m.forecast.endDebt[HORIZON]! + m.forecast.endCash[HORIZON]!;
      if (en <= 0 || ex <= 0 || equity <= 0 || exitEquity < 0) return null;
      const v = (exitEquity / equity) ** (1 / d.holdYears) - 1;
      return Number.isFinite(v) ? v : null;
    }),
  );
  return { entryMultiples, exitMultiples, irr };
}

/** Application extension (not in the workbook): re-runs the whole model at each entry multiple (debt resized). */
export function fullSensitivity(inputs: ModelInputs): SensitivityGrid {
  const base = runModel(inputs);
  const d = inputs.deal;
  const steps = [-2, -1, 0, 1, 2];
  const entryMultiples = steps.map((s) => d.entryMultiple + s * d.sensitivityStep);
  const exitMultiples = steps.map((s) => base.active.exitMultiple + s * d.sensitivityStep);
  const irr = entryMultiples.map((en) =>
    exitMultiples.map((ex) => {
      if (en <= 0 || ex <= 0) return null;
      return runModel(withMultiples(inputs, en, ex)).returns.irr;
    }),
  );
  return { entryMultiples, exitMultiples, irr };
}

export function withMultiples(inputs: ModelInputs, entry: number, exit: number): ModelInputs {
  return {
    ...inputs,
    deal: { ...inputs.deal, entryMultiple: entry },
    cases: { ...inputs.cases, [inputs.scenario]: { ...inputs.cases[inputs.scenario], exitMultiple: exit } },
  };
}

/** Exit multiple at which gross IRR equals the target, holding the operating forecast fixed (closed form). */
export function breakEvenExitMultiple(inputs: ModelInputs, m: ModelResult): number | null {
  const e = m.entry;
  const y5 = m.forecast.totalEbitda[HORIZON]!;
  if (!(e.sponsorEquity > 0) || !(e.sponsorOwnership > 0) || !(y5 > 0)) return null;
  const targetMoic = (1 + inputs.deal.targetIrr) ** inputs.deal.holdYears;
  const requiredExitEquity = (targetMoic * e.sponsorEquity) / e.sponsorOwnership;
  return (requiredExitEquity + m.forecast.endDebt[HORIZON]! - m.forecast.endCash[HORIZON]!) / y5;
}

/** Entry multiple at which gross IRR equals the target under the FULL model (bisection; IRR falls as entry rises). */
export function breakEvenEntryMultiple(inputs: ModelInputs): number | null {
  const irrAt = (en: number) =>
    runModel(withMultiples(inputs, en, inputs.cases[inputs.scenario].exitMultiple)).returns.irr;
  let lo = 0.5;
  let hi = 30;
  const a = irrAt(lo);
  const b = irrAt(hi);
  const t = inputs.deal.targetIrr;
  if (a === null || a < t) return null;
  if (b !== null && b >= t) return null;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    const v = irrAt(mid);
    if (v !== null && v >= t) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface BridgeItem {
  label: string;
  value: number;
}
/**
 * Decomposes total equity value creation (exit equity - entry equity incl. seller rollover) into
 * additive, exactly-reconciling drivers. Pure arithmetic on engine outputs; no new assumptions.
 */
export function valueBridge(m: ModelResult): { items: BridgeItem[]; total: number } {
  const e = m.entry;
  const r = m.returns;
  const entryMultiple = e.ebitda0 !== 0 ? e.enterpriseValue / e.ebitda0 : 0;
  const items: BridgeItem[] = [
    {
      label: "EBITDA growth (organic + synergies) at entry multiple",
      value: (r.year5Ebitda - e.ebitda0) * entryMultiple,
    },
    {
      label: "Multiple change (exit vs entry) on Year 5 EBITDA",
      value: (r.exitMultiple - entryMultiple) * r.year5Ebitda,
    },
    { label: "Debt paydown and cash build", value: e.originalDebt - r.endingDebt + r.endingCash },
    { label: "Transaction and financing fees", value: -(e.transactionFees + e.financingFees) },
  ];
  return { items, total: r.exitEquity - (e.sponsorEquity + e.rolloverEquity) };
}

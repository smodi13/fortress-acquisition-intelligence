/**
 * Input specification, precision enforcement, and conversion to engine units.
 *
 * Every user-editable assumption is stored as an integer in HUNDREDTHS of its display unit
 * (e.g. 18.00% -> 1800, 5.00x -> 500, $8.00mm -> 800; whole years are stored as-is).
 * Entering more than two decimals is REJECTED, never silently rounded. Dividing the integer by
 * the unit divisor yields exactly the same double as the workbook literal (0.18, 5.5, ...).
 */
import defaults from "@/data/workbook-assumptions.json";
import { SCENARIOS, type DealAssumptions, type ModelInputs, type Scenario } from "./types";

export type Unit = "usd" | "pct" | "x" | "year";
export interface FieldSpec {
  id: string;
  label: string;
  unit: Unit;
  min: number; // display units, inclusive
  max: number;
  note: string;
  group: "operating" | "entry" | "financing" | "cash" | "synergy" | "returns";
  readOnly?: string; // reason the field is locked
}

const DIVISOR: Record<Unit, number> = { usd: 100, x: 100, pct: 10000, year: 1 };
export const unitSuffix: Record<Unit, string> = { usd: "$mm", pct: "%", x: "x", year: "yr" };

const DEAL: {
  key: keyof DealAssumptions;
  label: string;
  unit: Unit;
  min: number;
  max: number;
  group: FieldSpec["group"];
  note: string;
  readOnly?: string;
}[] = [
  {
    key: "baselineRevenue",
    label: "Illustrative baseline revenue",
    unit: "usd",
    min: 0.01,
    max: 1000,
    group: "operating",
    note: "Analyst-assumed scale. NOT an actual company financial.",
  },
  {
    key: "entryMultiple",
    label: "Entry EV / normalized EBITDA",
    unit: "x",
    min: 0.01,
    max: 50,
    group: "entry",
    note: "Illustrative add-on assumption; not a verified market quote.",
  },
  {
    key: "debtToEbitda",
    label: "Original debt / entry EBITDA",
    unit: "x",
    min: 0,
    max: 20,
    group: "financing",
    note: "Illustrative; lender terms unavailable.",
  },
  {
    key: "maxDebtPctEv",
    label: "Maximum debt / enterprise value",
    unit: "pct",
    min: 0,
    max: 100,
    group: "financing",
    note: "Hypothetical loan sizing cap.",
  },
  {
    key: "cashInterestRate",
    label: "Cash interest rate",
    unit: "pct",
    min: 0,
    max: 100,
    group: "financing",
    note: "Analyst assumption, not a financing commitment.",
  },
  {
    key: "taxRate",
    label: "Effective cash tax rate",
    unit: "pct",
    min: 0,
    max: 100,
    group: "cash",
    note: "Analyst proxy; transaction tax structure not modeled.",
  },
  {
    key: "capexPct",
    label: "Capital expenditures / revenue",
    unit: "pct",
    min: 0,
    max: 100,
    group: "cash",
    note: "Analyst proxy; verify fleet and equipment replacement.",
  },
  {
    key: "depreciationPct",
    label: "Depreciation / revenue",
    unit: "pct",
    min: 0,
    max: 100,
    group: "cash",
    note: "Accounting simplification.",
  },
  {
    key: "nwcPctIncrementalRevenue",
    label: "NWC investment / incremental revenue",
    unit: "pct",
    min: 0,
    max: 100,
    group: "cash",
    note: "Working-capital peg excluded.",
  },
  {
    key: "rolloverPctEv",
    label: "Seller rollover / enterprise value",
    unit: "pct",
    min: 0,
    max: 100,
    group: "entry",
    note: "Illustrative pari passu equity, not seller terms.",
  },
  {
    key: "transactionFeesPctEv",
    label: "Transaction expenses / EV",
    unit: "pct",
    min: 0,
    max: 100,
    group: "entry",
    note: "Buyer-side expenses; illustrative.",
  },
  {
    key: "financingFeesPctDebt",
    label: "Financing fee / original debt",
    unit: "pct",
    min: 0,
    max: 100,
    group: "financing",
    note: "Illustrative.",
  },
  {
    key: "mandatoryAmortPct",
    label: "Mandatory amortization / original debt",
    unit: "pct",
    min: 0,
    max: 100,
    group: "financing",
    note: "Annual; positive cash flow beyond this is swept.",
  },
  {
    key: "yearlySynergy",
    label: "Annual run-rate EBITDA synergy",
    unit: "usd",
    min: 0,
    max: 1000,
    group: "synergy",
    note: "Operational improvement is not proven.",
  },
  {
    key: "synergyStartYear",
    label: "Synergy start year",
    unit: "year",
    min: 1,
    max: 5,
    group: "synergy",
    note: "No synergies before this year.",
  },
  {
    key: "integrationCost",
    label: "One-time integration cash cost",
    unit: "usd",
    min: 0,
    max: 1000,
    group: "synergy",
    note: "Cash outflow in the integration year.",
  },
  {
    key: "integrationYear",
    label: "Integration spending year",
    unit: "year",
    min: 1,
    max: 5,
    group: "synergy",
    note: "One-time charge.",
  },
  {
    key: "targetIrr",
    label: "Illustrative target gross IRR",
    unit: "pct",
    min: 0,
    max: 1000,
    group: "returns",
    note: "Screening hurdle, not a confirmed Ridgepeak requirement.",
  },
  {
    key: "holdYears",
    label: "Hold period",
    unit: "year",
    min: 5,
    max: 5,
    group: "returns",
    note: "Exit is modeled at Year 5.",
    readOnly: "Locked: the supplied workbook forecasts exactly five years and exits in Year 5.",
  },
  {
    key: "sensitivityStep",
    label: "EV / EBITDA sensitivity increment",
    unit: "x",
    min: 0.01,
    max: 10,
    group: "returns",
    note: "Step used in the sensitivity grids.",
  },
];
const CASE_FIELDS: {
  key: "growth" | "ebitdaMargin" | "exitMultiple";
  label: string;
  unit: Unit;
  min: number;
  max: number;
}[] = [
  { key: "growth", label: "Revenue growth", unit: "pct", min: -99, max: 1000 },
  { key: "ebitdaMargin", label: "EBITDA margin", unit: "pct", min: 0, max: 100 },
  { key: "exitMultiple", label: "Exit EV / EBITDA", unit: "x", min: 0.01, max: 50 },
];

export const FIELDS: FieldSpec[] = [
  ...DEAL.map((f) => ({
    id: `deal.${f.key}`,
    label: f.label,
    unit: f.unit,
    min: f.min,
    max: f.max,
    note: f.note,
    group: f.group,
    readOnly: f.readOnly,
  })),
  ...SCENARIOS.flatMap((s) =>
    CASE_FIELDS.map((f) => ({
      id: `case.${s}.${f.key}`,
      label: `${s}: ${f.label}`,
      unit: f.unit,
      min: f.min,
      max: f.max,
      note: "Case assumption from the workbook Cases sheet.",
      group: "operating" as const,
    })),
  ),
];
export const FIELD_BY_ID: Record<string, FieldSpec> = Object.fromEntries(FIELDS.map((f) => [f.id, f]));
export const dealField = (k: keyof DealAssumptions) => FIELD_BY_ID[`deal.${k}`]!;
export const caseField = (s: Scenario, k: (typeof CASE_FIELDS)[number]["key"]) =>
  FIELD_BY_ID[`case.${s}.${k}`]!;

/** Integer state: field id -> hundredths of display unit. */
export type InputState = Record<string, number>;

export function toStored(unit: Unit, engineValue: number): number {
  const stored = Math.round(engineValue * DIVISOR[unit]);
  if (stored / DIVISOR[unit] !== engineValue)
    throw new Error(`workbook value ${engineValue} cannot be represented with two decimals in ${unit} units`);
  return stored;
}
export const fromStored = (unit: Unit, stored: number): number => stored / DIVISOR[unit];

export function defaultState(): InputState {
  const s: InputState = {};
  for (const f of FIELDS) {
    const [, a, b] = f.id.split(".") as [string, string, string | undefined];
    const v = f.id.startsWith("deal.")
      ? (defaults.dealInputs as Record<string, number>)[a]
      : (defaults.cases as Record<string, Record<string, number>>)[a]?.[b!];
    if (v === undefined) throw new Error(`no workbook default for ${f.id}`);
    s[f.id] = toStored(f.unit, v);
  }
  return s;
}

export const DEFAULT_SCENARIO = defaults.activeScenario as Scenario;

export function stateToInputs(state: InputState, scenario: Scenario): ModelInputs {
  const get = (id: string) => fromStored(FIELD_BY_ID[id]!.unit, state[id]!);
  const deal = Object.fromEntries(
    DEAL.map((f) => [f.key, get(`deal.${f.key}`)]),
  ) as unknown as DealAssumptions;
  const cases = Object.fromEntries(
    SCENARIOS.map((s) => [s, Object.fromEntries(CASE_FIELDS.map((f) => [f.key, get(`case.${s}.${f.key}`)]))]),
  ) as unknown as ModelInputs["cases"];
  return { scenario, deal, cases };
}

export type ParseResult = { ok: true; stored: number } | { ok: false; error: string };

/** Parses text typed in the field's DISPLAY unit (e.g. "18.00" for 18.00%). Rejects >2 decimals. */
export function parseDisplay(raw: string, spec: FieldSpec): ParseResult {
  const t = raw.trim();
  if (t === "") return { ok: false, error: "Enter a number." };
  const decimals = spec.unit === "year" ? 0 : 2;
  const re = decimals === 0 ? /^-?\d+$/ : /^-?\d+(\.\d{1,2})?$/;
  if (!re.test(t)) {
    return {
      ok: false,
      error:
        decimals === 0
          ? "Whole numbers only."
          : /^-?\d+\.\d{3,}$/.test(t)
            ? "Use at most 2 decimal places."
            : "Enter a plain number (e.g. 8.00).",
    };
  }
  const [intPart = "0", frac = ""] = t.replace("-", "").split(".");
  const hundredths = Number(intPart) * 100 + Number(frac.padEnd(2, "0"));
  const sign = t.startsWith("-") ? -1 : 1;
  // convert hundredths-of-display-unit to stored integer (years are stored as whole units)
  const stored = spec.unit === "year" ? sign * Number(intPart) : sign * hundredths;
  const display = spec.unit === "year" ? stored : stored / 100;
  if (display < spec.min || display > spec.max)
    return {
      ok: false,
      error: `Must be between ${spec.min.toFixed(spec.unit === "year" ? 0 : 2)} and ${spec.max.toFixed(spec.unit === "year" ? 0 : 2)}.`,
    };
  return { ok: true, stored: Object.is(stored, -0) ? 0 : stored };
}

/** Text shown in an input for a stored value (display units, always 2 decimals except years). */
export function toDisplayText(spec: FieldSpec, stored: number): string {
  return spec.unit === "year" ? String(stored) : (stored / 100).toFixed(2);
}

/** Cross-field validation that the engine cannot express as a flag. */
export function crossFieldErrors(s: InputState): string[] {
  const errs: string[] = [];
  const d = (k: keyof DealAssumptions) => s[`deal.${k}`]!;
  if (d("integrationYear") > 5 || d("synergyStartYear") > 5)
    errs.push("Years must be within the 5-year forecast.");
  return errs;
}

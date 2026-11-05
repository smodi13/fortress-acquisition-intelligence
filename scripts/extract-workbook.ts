/**
 * Reads ONLY labeled analyst-assumption and sourced-fact cells from the supplied workbook
 * (never calculated outputs) and writes them to src/data/*.json.
 * The workbook is opened read-only and never modified. A unit test re-runs this extraction
 * and fails if the committed JSON has drifted from the workbook.
 */
import { readWorkbook, type Sheet } from "./xlsx-read";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export const WORKBOOK = join(
  "Ridgepeak_Fortress_Research",
  "Fortress_Illustrative_Acquisition_Underwriting.xlsx",
);

/** engine key -> [sheet, cell, expected label in column A] */
const DEAL_INPUTS = {
  baselineRevenue: ["B5", "Illustrative baseline revenue ($mm)"],
  entryMultiple: ["B8", "Entry EV / normalized EBITDA"],
  debtToEbitda: ["B10", "Original debt / entry EBITDA"],
  maxDebtPctEv: ["B11", "Maximum debt / enterprise value"],
  cashInterestRate: ["B12", "Cash interest rate"],
  taxRate: ["B13", "Effective cash tax rate"],
  capexPct: ["B14", "Annual capital expenditures / revenue"],
  depreciationPct: ["B15", "Annual depreciation / revenue"],
  nwcPctIncrementalRevenue: ["B16", "Investment in NWC / incremental revenue"],
  rolloverPctEv: ["B17", "Seller rollover / enterprise value"],
  transactionFeesPctEv: ["B18", "Transaction expenses / EV"],
  financingFeesPctDebt: ["B19", "Financing fee / original debt"],
  mandatoryAmortPct: ["B20", "Original principal annual amortization"],
  yearlySynergy: ["B21", "Annual full run-rate EBITDA synergy ($mm)"],
  synergyStartYear: ["B22", "Synergy start year"],
  integrationCost: ["B23", "One-time integration cash cost ($mm)"],
  integrationYear: ["B24", "Integration spending year"],
  targetIrr: ["B25", "Illustrative target sponsor gross IRR"],
  holdYears: ["B26", "Hold period (years)"],
  sensitivityStep: ["B27", "EV / EBITDA sensitivity increment"],
} as const;

const WEIGHTS = {
  recurring: ["B5", "Recurring-service relevance"],
  residential: ["B6", "Residential-service fit"],
  austin: ["B7", "Austin / Central Texas adjacency"],
  owner: ["B8", "Public owner / operator evidence"],
  sourceConfidence: ["B9", "Source confidence"],
} as const;

const val = (ws: Sheet, cell: string) => ws.get(cell)?.v ?? null;
const num = (ws: Sheet, cell: string, labelCell: string, label: string): number => {
  const got = String(val(ws, labelCell));
  if (got !== label) throw new Error(`${labelCell}: expected label "${label}", found "${got}"`);
  const c = ws.get(cell);
  if (!c || c.f !== null || typeof c.v !== "number")
    throw new Error(`${cell} is not a hardcoded number input`);
  return c.v;
};

export function extract() {
  const wb = readWorkbook(WORKBOOK);
  const sheet = (n: string) => {
    const s = wb.get(n);
    if (!s) throw new Error(`Missing sheet ${n}`);
    return s;
  };

  const di = sheet("Deal Inputs");
  const dealInputs: Record<string, number> = {};
  for (const [k, [cell, label]] of Object.entries(DEAL_INPUTS)) {
    dealInputs[k] = num(di, cell, "A" + cell.slice(1), label);
  }
  const activeScenario = String(val(di, "B3"));

  const cs = sheet("Cases");
  const cases: Record<string, { growth: number; ebitdaMargin: number; exitMultiple: number }> = {};
  for (const [name, row] of [
    ["Downside", 6],
    ["Base", 7],
    ["Upside", 8],
  ] as const) {
    if (val(cs, `A${row}`) !== name) throw new Error(`Cases!A${row} expected ${name}`);
    cases[name] = {
      growth: num(cs, `B${row}`, `A${row}`, name),
      ebitdaMargin: num(cs, `C${row}`, `A${row}`, name),
      exitMultiple: num(cs, `D${row}`, `A${row}`, name),
    };
  }

  const sw = sheet("Score Weights");
  const weights: Record<string, number> = {};
  for (const [k, [cell, label]] of Object.entries(WEIGHTS))
    weights[k] = num(sw, cell, "A" + cell.slice(1), label);
  const thresholds = {
    high: num(sw, "B13", "A13", "High research priority threshold"),
    medium: num(sw, "B14", "A14", "Medium research priority threshold"),
  };

  const ms = sheet("Market Sources");
  const marketSources: { topic: string; statement: string; url: string; referenceDate: string }[] = [];
  for (let r = 5; r <= 12; r++) {
    marketSources.push({
      topic: String(val(ms, `A${r}`)),
      statement: String(val(ms, `B${r}`)),
      url: String(val(ms, `C${r}`)),
      referenceDate: String(val(ms, `D${r}`)),
    });
  }

  return {
    assumptions: {
      source: "Fortress_Illustrative_Acquisition_Underwriting.xlsx",
      units: "USD millions; rates as fractions",
      activeScenario,
      dealInputs,
      cases,
      weights,
      thresholds,
    },
    market: {
      source: "Fortress_Illustrative_Acquisition_Underwriting.xlsx / Market Sources",
      rows: marketSources,
    },
  };
}

if (process.argv[1]?.endsWith("extract-workbook.ts")) {
  const { assumptions, market } = extract();
  writeFileSync(
    join("src", "data", "workbook-assumptions.json"),
    JSON.stringify(assumptions, null, 2) + "\n",
  );
  writeFileSync(join("src", "data", "market-sources.json"), JSON.stringify(market, null, 2) + "\n");
  console.log("wrote src/data/workbook-assumptions.json and market-sources.json");
}

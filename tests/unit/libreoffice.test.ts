/**
 * Differential test: edits assumptions in a COPY of the supplied workbook, forces a full
 * recalculation with LibreOffice (headless), and compares every key output with our engine.
 * This proves recalculation parity for changed assumptions, not just the default case.
 * The source workbook is never modified. Skipped only when LibreOffice is not installed.
 */
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { readWorkbook } from "../../scripts/xlsx-read";
import { runModel, partialSensitivity } from "@/lib/finance/engine";
import { defaultState, FIELD_BY_ID, parseDisplay, stateToInputs } from "@/lib/finance/inputs";
import type { Scenario } from "@/lib/finance/types";
import { SRC } from "./helpers";

const SOFFICE = ["/opt/homebrew/bin/soffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice"].find(
  (p) => spawnSync("test", ["-x", p]).status === 0,
);
const WB = join(SRC, "Fortress_Illustrative_Acquisition_Underwriting.xlsx");

// field id -> [sheet, cell]
const CELL: Record<string, [string, string]> = {
  "deal.baselineRevenue": ["Deal Inputs", "B5"],
  "deal.entryMultiple": ["Deal Inputs", "B8"],
  "deal.debtToEbitda": ["Deal Inputs", "B10"],
  "deal.maxDebtPctEv": ["Deal Inputs", "B11"],
  "deal.cashInterestRate": ["Deal Inputs", "B12"],
  "deal.taxRate": ["Deal Inputs", "B13"],
  "deal.capexPct": ["Deal Inputs", "B14"],
  "deal.depreciationPct": ["Deal Inputs", "B15"],
  "deal.nwcPctIncrementalRevenue": ["Deal Inputs", "B16"],
  "deal.rolloverPctEv": ["Deal Inputs", "B17"],
  "deal.transactionFeesPctEv": ["Deal Inputs", "B18"],
  "deal.financingFeesPctDebt": ["Deal Inputs", "B19"],
  "deal.mandatoryAmortPct": ["Deal Inputs", "B20"],
  "deal.yearlySynergy": ["Deal Inputs", "B21"],
  "deal.synergyStartYear": ["Deal Inputs", "B22"],
  "deal.integrationCost": ["Deal Inputs", "B23"],
  "deal.integrationYear": ["Deal Inputs", "B24"],
  "deal.targetIrr": ["Deal Inputs", "B25"],
  "deal.sensitivityStep": ["Deal Inputs", "B27"],
  "case.Downside.growth": ["Cases", "B6"],
  "case.Downside.ebitdaMargin": ["Cases", "C6"],
  "case.Downside.exitMultiple": ["Cases", "D6"],
  "case.Base.growth": ["Cases", "B7"],
  "case.Base.ebitdaMargin": ["Cases", "C7"],
  "case.Base.exitMultiple": ["Cases", "D7"],
  "case.Upside.growth": ["Cases", "B8"],
  "case.Upside.ebitdaMargin": ["Cases", "C8"],
  "case.Upside.exitMultiple": ["Cases", "D8"],
};

function sheetParts(files: Record<string, Uint8Array>): Map<string, string> {
  const txt = (n: string) => strFromU8(files[n]!).replace(/^﻿/, "");
  const rels = new Map<string, string>();
  for (const m of txt("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])![1]!;
    const t = /Target="([^"]+)"/.exec(m[0])![1]!;
    rels.set(id, t.startsWith("/") ? t.slice(1) : "xl/" + t);
  }
  const out = new Map<string, string>();
  for (const m of txt("xl/workbook.xml").matchAll(/<x:sheet\b[^>]*>/g))
    out.set(/name="([^"]+)"/.exec(m[0])![1]!, rels.get(/r:id="([^"]+)"/.exec(m[0])![1]!)!);
  return out;
}

/** Build a modified workbook copy: set input cells and strip every cached formula result. */
function modifiedCopy(dir: string, edits: Record<string, string>, scenario: Scenario, name: string): string {
  const files = unzipSync(new Uint8Array(readFileSync(WB)));
  const parts = sheetParts(files);
  const patch = (sheet: string, fn: (xml: string) => string) => {
    const part = parts.get(sheet)!;
    files[part] = strToU8(fn(strFromU8(files[part]!)));
  };
  const setCell = (xml: string, ref: string, val: string) => {
    const re = new RegExp(`(<x:c r="${ref}"[^>]*>)<x:v>[^<]*</x:v>`);
    if (!re.test(xml)) throw new Error(`cell ${ref} not found`);
    return xml.replace(re, `$1<x:v>${val}</x:v>`);
  };
  patch("Deal Inputs", (x) => setCell(x, "B3", scenario));
  for (const [id, text] of Object.entries(edits)) {
    const [sheet, ref] = CELL[id]!;
    const r = parseDisplay(text, FIELD_BY_ID[id]!);
    if (!r.ok) throw new Error(`${id}: ${r.error}`);
    // workbook stores the engine-unit number
    const unit = FIELD_BY_ID[id]!.unit;
    const engine = unit === "year" ? r.stored : unit === "pct" ? r.stored / 10000 : r.stored / 100;
    patch(sheet, (x) => setCell(x, ref, String(engine)));
  }
  for (const [, part] of parts)
    files[part] = strToU8(strFromU8(files[part]!).replace(/(<x:f>[^<]*<\/x:f>)<x:v>[^<]*<\/x:v>/g, "$1"));
  const out = join(dir, `${name}.xlsx`);
  writeFileSync(out, zipSync(files));
  return out;
}

function recalc(dir: string, path: string): string {
  const outDir = join(dir, "out");
  execFileSync(
    SOFFICE!,
    ["--headless", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", outDir, path],
    {
      stdio: "ignore",
      timeout: 90_000,
    },
  );
  return join(outDir, path.split("/").pop()!);
}

const scenarios: { name: string; scenario: Scenario; edits: Record<string, string> }[] = [
  {
    name: "downside-changed-entry",
    scenario: "Downside",
    edits: { "deal.entryMultiple": "6.00", "deal.baselineRevenue": "10.55", "deal.cashInterestRate": "9.50" },
  },
  {
    name: "upside-synergy-integration",
    scenario: "Upside",
    edits: {
      "deal.integrationCost": "2.00",
      "deal.integrationYear": "2",
      "deal.yearlySynergy": "0.35",
      "deal.synergyStartYear": "3",
      "deal.rolloverPctEv": "35.00",
    },
  },
  {
    name: "base-cap-binding",
    scenario: "Base",
    edits: {
      "deal.debtToEbitda": "4.00",
      "deal.maxDebtPctEv": "30.00",
      "deal.mandatoryAmortPct": "15.00",
      "deal.taxRate": "21.00",
    },
  },
  {
    name: "base-funding-shortfall",
    scenario: "Base",
    edits: {
      "case.Base.ebitdaMargin": "3.00",
      "case.Base.growth": "-5.00",
      "deal.mandatoryAmortPct": "25.00",
    },
  },
];

describe.skipIf(!SOFFICE)("LibreOffice full-recalculation differential", () => {
  const dir = mkdtempSync(join(tmpdir(), "fai-lo-"));
  for (const sc of scenarios) {
    it(
      sc.name,
      () => {
        const copy = modifiedCopy(dir, sc.edits, sc.scenario, sc.name);
        const wb = readWorkbook(recalc(dir, copy));
        const num = (sh: string, ref: string) => {
          const v = wb.get(sh)?.get(ref)?.v;
          if (typeof v !== "number") throw new Error(`${sh}!${ref} = ${String(v)}`);
          return v;
        };
        const state = defaultState();
        for (const [id, text] of Object.entries(sc.edits)) {
          const r = parseDisplay(text, FIELD_BY_ID[id]!);
          if (r.ok) state[id] = r.stored;
        }
        const inp = stateToInputs(state, sc.scenario);
        const m = runModel(inp);
        const near = (a: number, b: number, l: string) =>
          expect(Math.abs(a - b), `${l}: engine ${a} vs workbook ${b}`).toBeLessThanOrEqual(1e-6);

        near(m.entry.sponsorEquity, num("Sources Uses", "B13"), "sponsor equity");
        near(m.entry.originalDebt, num("Sources Uses", "B8"), "debt");
        near(m.returns.exitEv, num("Returns", "B7"), "exit EV");
        near(m.returns.exitEquity, num("Returns", "B10"), "exit equity");
        near(m.returns.totalFundingShortfall, num("Returns", "B19"), "shortfall");
        const rows: [number, number[]][] = [
          [5, m.forecast.revenue],
          [10, m.forecast.totalEbitda],
          [16, m.forecast.cashTaxes],
          [20, m.forecast.freeCashFlow],
          [21, m.forecast.mandatoryPaid],
          [22, m.forecast.sweepPaid],
          [24, m.forecast.endDebt],
          [26, m.forecast.endCash],
          [27, m.forecast.operatingShortfall],
          [29, m.forecast.unpaidMandatory],
        ];
        for (const [row, arr] of rows)
          ["B", "C", "D", "E", "F", "G"].forEach((c, i) =>
            near(arr[i]!, num("5Y Forecast", `${c}${row}`), `row ${row} ${c}`),
          );
        if (sc.name.includes("shortfall")) expect(m.returns.totalFundingShortfall).toBeGreaterThan(0);
        if (sc.name.includes("cap-binding")) expect(m.entry.debtCapBinding).toBe(true);
        if (m.returns.moic !== null) {
          near(m.returns.moic, num("Returns", "B14"), "MOIC");
          near(m.returns.irr!, num("Returns", "B15"), "IRR");
          const g = partialSensitivity(inp, m);
          g.irr.forEach((row, i) =>
            row.forEach((v, j) => {
              if (v !== null) near(v, num("Sensitivity", `${"BCDEF"[j]}${5 + i}`), `sens ${i},${j}`);
            }),
          );
        }
      },
      120_000,
    );
  }
});

import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { readWorkbook } from "../../scripts/xlsx-read";
import { extract } from "../../scripts/extract-workbook";
import { runModel } from "@/lib/finance/engine";
import { SRC, inputsFor, TOL } from "./helpers";
import committed from "@/data/workbook-assumptions.json";
import committedMarket from "@/data/market-sources.json";

const wb = readWorkbook(join(SRC, "Fortress_Illustrative_Acquisition_Underwriting.xlsx"));
const cell = (sheet: string, ref: string) => {
  const v = wb.get(sheet)?.get(ref)?.v;
  if (typeof v !== "number") throw new Error(`${sheet}!${ref} not numeric`);
  return v;
};

describe("committed JSON vs workbook", () => {
  it("assumption and market JSON have not drifted from the workbook", () => {
    const { assumptions, market } = extract();
    expect(committed).toEqual(assumptions);
    expect(committedMarket).toEqual(market);
  });
  it("the workbook is formula-driven: 291 formulas, none in input cells we read", () => {
    let formulas = 0;
    for (const s of wb.values()) for (const c of s.values()) if (c.f !== null) formulas++;
    expect(formulas).toBe(291);
  });
});

describe("live engine vs workbook cached cells (Base, every forecast row/period)", () => {
  const m = runModel(inputsFor("Base"));
  const cols = ["B", "C", "D", "E", "F", "G"];
  const rows: [number, number[]][] = [
    [5, m.forecast.revenue],
    [6, m.forecast.growth],
    [7, m.forecast.margin],
    [8, m.forecast.operatingEbitda],
    [9, m.forecast.synergies],
    [10, m.forecast.totalEbitda],
    [11, m.forecast.da],
    [12, m.forecast.ebit],
    [13, m.forecast.beginDebt],
    [14, m.forecast.interest],
    [15, m.forecast.taxableIncome],
    [16, m.forecast.cashTaxes],
    [17, m.forecast.capex],
    [18, m.forecast.nwcInvestment],
    [19, m.forecast.integration],
    [20, m.forecast.freeCashFlow],
    [21, m.forecast.mandatoryPaid],
    [22, m.forecast.sweepPaid],
    [23, m.forecast.totalPaid],
    [24, m.forecast.endDebt],
    [25, m.forecast.beginCash],
    [26, m.forecast.endCash],
    [27, m.forecast.operatingShortfall],
    [28, m.forecast.reconciliationError],
    [29, m.forecast.unpaidMandatory],
  ];
  for (const [row, arr] of rows) {
    it(`5Y Forecast row ${row}`, () => {
      cols.forEach((c, i) =>
        expect(Math.abs(arr[i]! - cell("5Y Forecast", `${c}${row}`))).toBeLessThanOrEqual(TOL),
      );
    });
  }
  it("Sources Uses B5:B20", () => {
    const e = m.entry;
    const pairs: [number, number][] = [
      [5, e.revenue0],
      [6, e.ebitda0],
      [7, e.enterpriseValue],
      [8, e.originalDebt],
      [9, e.rolloverEquity],
      [10, e.transactionFees],
      [11, e.financingFees],
      [12, e.totalUses],
      [13, e.sponsorEquity],
      [14, e.totalSources],
      [15, e.sourcesLessUses],
      [16, e.sponsorOwnership],
      [17, e.sellerOwnership],
      [18, e.ownershipSumLessOne],
      [19, e.debtToEbitda],
      [20, e.debtToEv],
    ];
    for (const [r, v] of pairs)
      expect(Math.abs(v - cell("Sources Uses", `B${r}`)), `B${r}`).toBeLessThanOrEqual(TOL);
  });
  it("Returns B5:B19", () => {
    const r = m.returns;
    const pairs: [number, number][] = [
      [5, r.year5Ebitda],
      [6, r.exitMultiple],
      [7, r.exitEv],
      [8, r.endingDebt],
      [9, r.endingCash],
      [10, r.exitEquity],
      [11, r.sponsorOwnership],
      [12, r.sponsorProceeds],
      [13, r.sponsorEquity],
      [14, r.moic!],
      [15, r.irr!],
      [16, r.targetIrr],
      [17, r.irrSurplus!],
      [18, r.entryFundingCheck],
      [19, r.totalFundingShortfall],
    ];
    for (const [rw, v] of pairs)
      expect(Math.abs(v - cell("Returns", `B${rw}`)), `B${rw}`).toBeLessThanOrEqual(TOL);
  });
});

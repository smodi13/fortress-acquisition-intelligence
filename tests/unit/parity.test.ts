import { describe, expect, it } from "vitest";
import { runModel, partialSensitivity } from "@/lib/finance/engine";
import { SCENARIOS, type Scenario } from "@/lib/finance/types";
import { inputsFor, reference, TOL } from "./helpers";

const close = (a: number | null, b: number, label: string) => {
  expect(a, label).not.toBeNull();
  expect(Math.abs((a as number) - b), `${label}: got ${a}, expected ${b}`).toBeLessThanOrEqual(TOL);
};

describe("reference parity (formula_engine_reference_tests.json)", () => {
  it("covers exactly the three cases", () =>
    expect(Object.keys(reference.cases).sort()).toEqual([...SCENARIOS].sort()));

  for (const s of SCENARIOS) {
    describe(s, () => {
      const m = runModel(inputsFor(s as Scenario));
      const ref = reference.cases[s as Scenario];

      it("headline MOIC and IRR", () => {
        close(m.returns.moic, ref.returns["Sponsor gross MOIC"] as number, "MOIC");
        close(m.returns.irr, ref.returns["Sponsor gross annualized IRR"] as number, "IRR");
      });

      it("every returns field", () => {
        const r = m.returns;
        const map: [string, number | null][] = [
          ["Year 5 total EBITDA", r.year5Ebitda],
          ["Assumed exit EV / EBITDA", r.exitMultiple],
          ["Exit enterprise value", r.exitEv],
          ["Ending debt at exit", r.endingDebt],
          ["Ending cash at exit", r.endingCash],
          ["Exit distributable equity", r.exitEquity],
          ["Sponsor pari passu equity ownership", r.sponsorOwnership],
          ["Sponsor exit proceeds", r.sponsorProceeds],
          ["Sponsor entry equity", r.sponsorEquity],
          ["Illustrative target gross IRR", r.targetIrr],
          ["IRR surplus versus target", r.irrSurplus],
          ["Entry funding check", r.entryFundingCheck],
          ["Total forecast funding shortfall", r.totalFundingShortfall],
        ];
        for (const [k, v] of map) close(v, ref.returns[k] as number, k);
        expect(r.status).toBe(ref.returns["Case status"]);
      });

      it("entry sources and uses", () => {
        const e = m.entry;
        const map: [string, number][] = [
          ["Illustrative revenue", e.revenue0],
          ["Entry normalized EBITDA", e.ebitda0],
          ["Acquisition enterprise value", e.enterpriseValue],
          ["Original term debt", e.originalDebt],
          ["Seller equity rollover", e.rolloverEquity],
          ["Transaction expenses", e.transactionFees],
          ["Financing fees", e.financingFees],
          ["Total uses", e.totalUses],
          ["Sponsor equity required", e.sponsorEquity],
          ["Total sources", e.totalSources],
          ["Sources less uses", e.sourcesLessUses],
          ["Sponsor fully diluted ownership", e.sponsorOwnership],
          ["Seller fully diluted ownership", e.sellerOwnership],
          ["Ownership sum less 100%", e.ownershipSumLessOne],
          ["Debt / EBITDA", e.debtToEbitda],
          ["Debt / Enterprise value", e.debtToEv],
        ];
        for (const [k, v] of map) close(v, ref.entry[k]!, k);
      });

      it("full forecast cash waterfall, all six periods", () => {
        const f = m.forecast;
        const map: [string, number[]][] = [
          ["Operating cash flow available for paydown", f.freeCashFlow],
          ["Mandatory principal paid", f.mandatoryPaid],
          ["Supplemental principal cash sweep", f.sweepPaid],
          ["Total debt principal paid", f.totalPaid],
          ["Ending debt principal", f.endDebt],
          ["Beginning cash balance", f.beginCash],
          ["Ending available cash", f.endCash],
          ["Unfinanced operating cash shortfall", f.operatingShortfall],
          ["Cash-flow reconciliation error", f.reconciliationError],
          ["Unpaid mandatory amortization", f.unpaidMandatory],
        ];
        for (const [k, arr] of map) {
          const want = ref.forecast_cash_waterfall[k]!;
          expect(arr.length).toBe(want.length);
          arr.forEach((v, i) => close(v, want[i]!, `${k}[${i}]`));
        }
      });
    });
  }

  it("headline literal values from the brief", () => {
    close(runModel(inputsFor("Downside")).returns.irr, 0.17918060472602537, "down irr");
    close(runModel(inputsFor("Base")).returns.moic, 3.066835623486469, "base moic");
    close(runModel(inputsFor("Upside")).returns.irr, 0.3203242168556266, "up irr");
  });

  it("base sensitivity matrix: axes and all 25 cells", () => {
    const inp = inputsFor("Base");
    const m = runModel(inp);
    const g = partialSensitivity(inp, m);
    const data = reference.base_sensitivity_matrix.data;
    g.exitMultiples.forEach((x, j) => close(x, data[0]![j + 1]!, `exit axis ${j}`));
    g.entryMultiples.forEach((x, i) => close(x, data[i + 1]![0]!, `entry axis ${i}`));
    g.irr.forEach((row, i) => row.forEach((v, j) => close(v, data[i + 1]![j + 1]!, `cell ${i},${j}`)));
  });

  it("sensitivity center equals the selected scenario IRR (all scenarios)", () => {
    for (const s of SCENARIOS) {
      const inp = inputsFor(s);
      const m = runModel(inp);
      close(partialSensitivity(inp, m).irr[2]![2]!, m.returns.irr!, `${s} center`);
    }
  });

  it("all ten model-integrity checks pass at defaults", () => {
    for (const s of SCENARIOS) expect(runModel(inputsFor(s)).checks.filter((c) => !c.pass)).toEqual([]);
  });
});

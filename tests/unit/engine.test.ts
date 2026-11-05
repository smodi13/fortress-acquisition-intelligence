import { describe, expect, it } from "vitest";
import {
  breakEvenEntryMultiple,
  breakEvenExitMultiple,
  fullSensitivity,
  partialSensitivity,
  runModel,
  withMultiples,
} from "@/lib/finance/engine";
import {
  FIELDS,
  FIELD_BY_ID,
  defaultState,
  fromStored,
  parseDisplay,
  stateToInputs,
  toDisplayText,
} from "@/lib/finance/inputs";
import { fmtPct, fmtPts, fmtUsd, fmtX } from "@/lib/finance/format";
import type { Scenario } from "@/lib/finance/types";
import { inputsFor } from "./helpers";
import defaults from "@/data/workbook-assumptions.json";

const edit = (changes: Record<string, string>, scenario: Scenario = "Base") => {
  const s = defaultState();
  for (const [id, t] of Object.entries(changes)) {
    const r = parseDisplay(t, FIELD_BY_ID[id]!);
    if (!r.ok) throw new Error(r.error);
    s[id] = r.stored;
  }
  return stateToInputs(s, scenario);
};

describe("input precision & validation", () => {
  it("accepts up to two decimals and rejects more, never rounding silently", () => {
    const f = FIELD_BY_ID["deal.baselineRevenue"]!;
    expect(parseDisplay("8", f)).toEqual({ ok: true, stored: 800 });
    expect(parseDisplay("8.5", f)).toEqual({ ok: true, stored: 850 });
    expect(parseDisplay("8.25", f)).toEqual({ ok: true, stored: 825 });
    for (const bad of ["8.001", "8.255", "0.123456", "1e2", "abc", "", "8,5", "8.", ".5", "--1"])
      expect(parseDisplay(bad, f).ok, bad).toBe(false);
  });
  it("percent fields take display units (18.00 means 18.00%, stored as 0.18)", () => {
    const f = FIELD_BY_ID["case.Base.ebitdaMargin"]!;
    const r = parseDisplay("18.00", f);
    expect(r).toEqual({ ok: true, stored: 1800 });
    expect(fromStored("pct", 1800)).toBe(0.18);
    expect(parseDisplay("0.18", f)).toEqual({ ok: true, stored: 18 }); // 0.18% -- unit is explicit, no silent rescale
    expect(fromStored("pct", 18)).toBe(0.0018);
  });
  it("enforces ranges and whole years", () => {
    expect(parseDisplay("0", FIELD_BY_ID["deal.baselineRevenue"]!).ok).toBe(false);
    expect(parseDisplay("101", FIELD_BY_ID["deal.maxDebtPctEv"]!).ok).toBe(false);
    expect(parseDisplay("6", FIELD_BY_ID["deal.integrationYear"]!).ok).toBe(false);
    expect(parseDisplay("2.5", FIELD_BY_ID["deal.integrationYear"]!).ok).toBe(false);
    expect(parseDisplay("-100", FIELD_BY_ID["case.Base.growth"]!).ok).toBe(false);
    expect(parseDisplay("-5.00", FIELD_BY_ID["case.Base.growth"]!)).toEqual({ ok: true, stored: -500 });
  });
  it("every default is representable in two decimals and equals the workbook literal exactly", () => {
    const s = defaultState();
    for (const f of FIELDS) {
      const wb = f.id.startsWith("deal.")
        ? (defaults.dealInputs as Record<string, number>)[f.id.slice(5)]
        : (defaults.cases as Record<string, Record<string, number>>)[f.id.split(".")[1]!]![
            f.id.split(".")[2]!
          ];
      expect(fromStored(f.unit, s[f.id]!)).toBe(wb);
      expect(parseDisplay(toDisplayText(f, s[f.id]!), f)).toEqual({ ok: true, stored: s[f.id]! });
    }
  });
  it("hold period is locked to the five-year forecast horizon", () => {
    expect(FIELD_BY_ID["deal.holdYears"]!.readOnly).toBeTruthy();
  });
});

describe("assumption changes recalculate dependent outputs", () => {
  const base = runModel(inputsFor("Base"));
  it("entry multiple drives EV, debt cap, sponsor equity, MOIC, IRR", () => {
    const m = runModel(edit({ "deal.entryMultiple": "6.00" }));
    expect(m.entry.enterpriseValue).toBeCloseTo(8.64, 12);
    expect(m.entry.sponsorEquity).toBeGreaterThan(base.entry.sponsorEquity);
    expect(m.returns.irr!).toBeLessThan(base.returns.irr!);
  });
  it("revenue scales every dollar output linearly (EV, equity, exit proceeds), leaving MOIC unchanged except fixed $ items", () => {
    const m = runModel(
      edit({ "deal.baselineRevenue": "16.00", "deal.yearlySynergy": "0.40", "deal.integrationCost": "0.60" }),
    );
    expect(m.entry.enterpriseValue).toBeCloseTo(2 * base.entry.enterpriseValue, 10);
    expect(m.returns.moic!).toBeCloseTo(base.returns.moic!, 10);
  });
  it("debt/EBITDA and interest change cash flow and ending debt", () => {
    const m = runModel(edit({ "deal.debtToEbitda": "3.00", "deal.cashInterestRate": "12.00" }));
    expect(m.entry.originalDebt).toBeCloseTo(4.32 > 0.6 * 7.2 ? 0.6 * 7.2 : 4.32, 12);
    expect(m.forecast.interest[1]).toBeCloseTo(m.entry.originalDebt * 0.12, 12);
    expect(m.forecast.freeCashFlow[1]).toBeLessThan(base.forecast.freeCashFlow[1]!);
  });
  it("rollover changes seller/sponsor ownership but they always sum to 100%", () => {
    for (const p of ["0.00", "10.00", "20.00", "35.00", "50.00"]) {
      const m = runModel(edit({ "deal.rolloverPctEv": p }));
      expect(m.entry.sponsorOwnership + m.entry.sellerOwnership).toBeCloseTo(1, 12);
      expect(m.entry.sourcesLessUses).toBeCloseTo(0, 12);
    }
    expect(runModel(edit({ "deal.rolloverPctEv": "0.00" })).entry.sponsorOwnership).toBe(1);
  });
  it("scenario switch recalculates from the Cases table", () => {
    expect(runModel(inputsFor("Downside")).returns.irr!).toBeLessThan(base.returns.irr!);
    expect(runModel(inputsFor("Upside")).returns.irr!).toBeGreaterThan(base.returns.irr!);
    const m = runModel(edit({ "case.Base.growth": "9.00" }));
    expect(m.forecast.revenue[1]).toBeCloseTo(8.72, 12);
  });
  it("synergy timing", () => {
    const m = runModel(edit({ "deal.synergyStartYear": "4" }));
    expect(m.forecast.synergies.slice(1)).toEqual([0, 0, 0, 0.2, 0.2]);
  });
});

describe("debt schedule & funding shortfall", () => {
  it("debt never goes negative; sweep stops at zero balance; debt roll-forward ties out", () => {
    for (const s of ["Downside", "Base", "Upside"] as const) {
      const m = runModel(inputsFor(s));
      for (let y = 1; y <= 5; y++) {
        expect(m.forecast.endDebt[y]).toBeGreaterThanOrEqual(0);
        expect(m.forecast.endDebt[y]!).toBeCloseTo(m.forecast.beginDebt[y]! - m.forecast.totalPaid[y]!, 12);
        if (y > 1) expect(m.forecast.beginDebt[y]).toBe(m.forecast.endDebt[y - 1]);
      }
    }
  });
  const stress = edit({
    "case.Base.ebitdaMargin": "3.00",
    "case.Base.growth": "-5.00",
    "deal.mandatoryAmortPct": "25.00",
  });
  it("flags unfinanced operating shortfall and keeps the deficit visible", () => {
    const m = runModel(stress);
    expect(m.returns.totalFundingShortfall).toBeGreaterThan(0);
    expect(m.flags.map((f) => f.code)).toContain("OPERATING_SHORTFALL");
    expect(m.returns.status).toBe("FUNDING REQUIRED");
    expect(m.checks.find((c) => c.label.startsWith("No unfinanced"))!.pass).toBe(false);
    expect(m.forecast.endCash.every((c) => c >= 0)).toBe(true);
  });
  it("flags unpaid mandatory amortization", () => {
    const m = runModel(edit({ "deal.integrationCost": "3.00", "deal.mandatoryAmortPct": "30.00" }));
    expect(
      m.flags.map((f) => f.code).some((c) => c === "OPERATING_SHORTFALL" || c === "UNPAID_AMORTIZATION"),
    ).toBe(true);
  });
  it("base case has zero shortfall", () =>
    expect(runModel(inputsFor("Base")).returns.totalFundingShortfall).toBe(0));
});

describe("invalid transactions do not produce misleading returns", () => {
  it("non-positive sponsor equity -> no MOIC/IRR, error flag", () => {
    const m = runModel(
      edit({ "deal.rolloverPctEv": "100.00", "deal.maxDebtPctEv": "100.00", "deal.debtToEbitda": "20.00" }),
    );
    expect(m.entry.sponsorEquity).toBeLessThanOrEqual(0);
    expect(m.returns.moic).toBeNull();
    expect(m.returns.irr).toBeNull();
    expect(m.returns.status).toBe("INVALID: NO RETURN COMPUTED");
    expect(m.flags.some((f) => f.code === "SPONSOR_EQUITY_NONPOSITIVE" && f.severity === "error")).toBe(true);
  });
  it("hold period other than 5 is flagged", () => {
    const i = inputsFor("Base");
    expect(
      runModel({ ...i, deal: { ...i.deal, holdYears: 3 } }).flags.some((f) => f.code === "HOLD_NOT_HORIZON"),
    ).toBe(true);
  });
  it("multiple expansion is flagged when exit > entry", () => {
    expect(runModel(inputsFor("Base")).flags.map((f) => f.code)).toContain("MULTIPLE_EXPANSION");
    expect(runModel(inputsFor("Downside")).flags.map((f) => f.code)).not.toContain("MULTIPLE_EXPANSION");
  });
});

describe("sensitivity & derived analytics", () => {
  it("partial grid center equals IRR after assumption edits", () => {
    const edits: Record<string, string>[] = [
      { "deal.entryMultiple": "4.25" },
      { "deal.sensitivityStep": "0.75" },
      { "deal.baselineRevenue": "11.11", "deal.taxRate": "30.00" },
    ];
    for (const ch of edits) {
      const i = edit(ch);
      const m = runModel(i);
      expect(partialSensitivity(i, m).irr[2]![2]).toBeCloseTo(m.returns.irr!, 12);
    }
  });
  it("grid axes use the configured step", () => {
    const i = edit({ "deal.sensitivityStep": "0.75" });
    const g = partialSensitivity(i, runModel(i));
    expect(g.entryMultiples).toEqual([3.5, 4.25, 5, 5.75, 6.5]);
    expect(g.exitMultiples).toEqual([4, 4.75, 5.5, 6.25, 7]);
  });
  it("IRR rises with exit multiple and falls with entry multiple", () => {
    const i = inputsFor("Base");
    const g = partialSensitivity(i, runModel(i)).irr;
    for (let r = 0; r < 5; r++) for (let c = 1; c < 5; c++) expect(g[r]![c]!).toBeGreaterThan(g[r]![c - 1]!);
    for (let c = 0; c < 5; c++) for (let r = 1; r < 5; r++) expect(g[r]![c]!).toBeLessThan(g[r - 1]![c]!);
  });
  it("full re-underwrite: center equals base IRR; equals the partial grid when debt sizing does not change; differs when it does", () => {
    const i = inputsFor("Base");
    const full = fullSensitivity(i);
    const part = partialSensitivity(i, runModel(i));
    expect(full.irr[2]![2]).toBeCloseTo(runModel(i).returns.irr!, 12);
    full.irr.forEach((row, r) => row.forEach((v, c) => expect(v!).toBeCloseTo(part.irr[r]![c]!, 12)));
    const capped = edit({ "deal.debtToEbitda": "4.00", "deal.maxDebtPctEv": "30.00" });
    const f2 = fullSensitivity(capped);
    const p2 = partialSensitivity(capped, runModel(capped));
    expect(f2.irr[2]![2]).toBeCloseTo(p2.irr[2]![2]!, 12);
    expect(Math.abs(f2.irr[0]![2]! - p2.irr[0]![2]!)).toBeGreaterThan(1e-4);
  });
  it("break-even exit multiple returns exactly the hurdle IRR", () => {
    for (const s of ["Downside", "Base", "Upside"] as const) {
      const i = inputsFor(s);
      const x = breakEvenExitMultiple(i, runModel(i))!;
      expect(runModel(withMultiples(i, i.deal.entryMultiple, x)).returns.irr!).toBeCloseTo(
        i.deal.targetIrr,
        10,
      );
    }
  });
  it("break-even entry multiple returns the hurdle IRR under the full model", () => {
    const i = inputsFor("Base");
    const x = breakEvenEntryMultiple(i)!;
    expect(x).toBeGreaterThan(5);
    expect(runModel(withMultiples(i, x, 5.5)).returns.irr!).toBeCloseTo(0.25, 8);
  });
});

describe("display formatting does not alter values", () => {
  it("formats", () => {
    expect(fmtUsd(3.0527999999999986)).toBe("3.05");
    expect(fmtPct(0.2512327404385808)).toBe("25.12%");
    expect(fmtX(3.066835623486469)).toBe("3.07x");
    expect(fmtPts(0.0012327404385807927)).toBe("+0.12 pts");
    expect(fmtPct(null)).toBe("n/m");
    expect(fmtUsd(-0.0000001)).toBe("0.00");
  });
});

import { valueBridge } from "@/lib/finance/engine";
describe("value bridge", () => {
  it("drivers sum exactly to total equity value creation in every scenario and after edits", () => {
    for (const i of [
      inputsFor("Downside"),
      inputsFor("Base"),
      inputsFor("Upside"),
      edit({ "deal.entryMultiple": "7.25", "deal.rolloverPctEv": "40.00" }),
    ]) {
      const b = valueBridge(runModel(i));
      expect(b.items.reduce((s, x) => s + x.value, 0)).toBeCloseTo(b.total, 10);
    }
  });
});

import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { parseCsv, toCsv } from "@/lib/research/csv";
import { integrityErrors, normalize } from "@/lib/research/validate";
import { METROS, metroOf } from "@/lib/research/schema";
import { defaultWeights, labelOf, rankAll, score, weightsSumValid, WEIGHT_KEYS } from "@/lib/research/score";
import { dataFlags } from "@/lib/research/flags";
import { loadDataset } from "@/lib/research/load";
import { readWorkbook } from "../../scripts/xlsx-read";
import { SRC, readSrc } from "./helpers";
import { parseDisplay } from "@/lib/finance/inputs";
import { weightSpec } from "@/lib/research/score";

const pipelineRaw = () => parseCsv(readSrc("screening_pipeline_30.csv"));
const evidenceRaw = () => parseCsv(readSrc("evidence_register.csv"));
const build = (p = pipelineRaw(), e = evidenceRaw()) => ({ companies: normalize(p, e), e });

describe("data import validation", () => {
  it("loads exactly 30 valid, unique companies with a primary source each", () => {
    const { companies } = loadDataset();
    expect(companies).toHaveLength(30);
    expect(new Set(companies.map((c) => c.id)).size).toBe(30);
    expect(new Set(companies.map((c) => c.name)).size).toBe(30);
    for (const c of companies) {
      expect(c.sourceUrl).toMatch(/^https:\/\//);
      expect(c.evidence.source_url).toBe(c.sourceUrl);
    }
  });
  it("source dataset passes every integrity rule", () => {
    const { companies, e } = build();
    expect(integrityErrors(companies, e)).toEqual([]);
  });
  it("parses quoted commas and ends of file", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([{ a: "x, y", b: 'say "hi"' }]);
    expect(() => parseCsv("a,b\n1\n")).toThrow();
    expect(parseCsv(toCsv(["a"], [['q"1,2']]))).toEqual([{ a: 'q"1,2' }]);
  });

  it("rejects fewer or more than 30 records", () => {
    const p = pipelineRaw();
    const e = evidenceRaw();
    expect(integrityErrors(normalize(p.slice(0, 29), e.slice(0, 29)), e.slice(0, 29)).join()).toMatch(
      /exactly 30/,
    );
    const extra = { ...p[0]!, id: "FAI-031", company: "Invented Co" };
    const extraEv = { ...e[0]!, evidence_id: "EV-FAI-031", company_id: "FAI-031" };
    expect(integrityErrors(normalize([...p, extra], [...e, extraEv]), [...e, extraEv]).join()).toMatch(
      /exactly 30/,
    );
  });
  it("rejects duplicate ids and duplicate names", () => {
    const p = pipelineRaw();
    const e = evidenceRaw();
    p[1] = { ...p[1]!, id: p[0]!["id"]! };
    expect(integrityErrors(normalize(p, e), e).join()).toMatch(/duplicate company id/);
    const p2 = pipelineRaw();
    p2[1] = { ...p2[1]!, company: p2[0]!["company"]! };
    expect(integrityErrors(normalize(p2, e), e).join()).toMatch(/duplicate company name/);
  });
  it("rejects invalid or non-https citation URLs and missing evidence", () => {
    const p = pipelineRaw();
    p[0] = { ...p[0]!, primary_source_url: "http://insecure.example" };
    expect(() => normalize(p, evidenceRaw())).toThrow();
    const p2 = pipelineRaw();
    p2[0] = { ...p2[0]!, primary_source_url: "not a url" };
    expect(() => normalize(p2, evidenceRaw())).toThrow();
    expect(() => normalize(pipelineRaw(), evidenceRaw().slice(1))).toThrow(/no evidence row/);
  });
  it("rejects a profile carrying any financial column without a verified source", () => {
    const p = pipelineRaw().map((r) => ({ ...r, revenue_usd_mm: "12.5" }));
    expect(() => normalize(p, evidenceRaw())).toThrow();
    const p2 = pipelineRaw().map((r) => ({ ...r, ebitda: "1" }));
    expect(() => normalize(p2, evidenceRaw())).toThrow();
  });
  it("rejects any company labelled for sale, contacted or willing without a dated record", () => {
    const e = evidenceRaw();
    e[0] = { ...e[0]!, seller_intent: "Willing to sell" };
    expect(integrityErrors(normalize(pipelineRaw(), e), e).join()).toMatch(/seller_intent must be Unknown/);
    const e2 = evidenceRaw();
    e2[2] = { ...e2[2]!, financial_disclosure: "Revenue $9mm" };
    expect(integrityErrors(normalize(pipelineRaw(), e2), e2).join()).toMatch(/financial_disclosure/);
    const p = pipelineRaw();
    p[3] = { ...p[3]!, screening_note: "Owner was contacted and is for sale." };
    expect(integrityErrors(normalize(p, evidenceRaw()), evidenceRaw()).join()).toMatch(
      /contact\/sale status/,
    );
  });
  it("rejects out-of-range ratings", () => {
    const p = pipelineRaw();
    p[0] = { ...p[0]!, residential_fit_1_5: "6" };
    expect(() => normalize(p, evidenceRaw())).toThrow();
  });
});

describe("all 30 profiles & missing-data handling", () => {
  const { companies } = loadDataset();
  it("every company has name, market, services, leadership text and a metro", () => {
    for (const c of companies) {
      expect(c.name && c.market && c.leadership && c.ownershipClaim).toBeTruthy();
      expect(c.services.length).toBeGreaterThan(0);
      expect(METROS).toContain(c.metro);
    }
  });
  it("missing founding years stay null (never defaulted) and are flagged", () => {
    const missing = companies.filter((c) => c.foundedYear === null).map((c) => c.id);
    expect(missing.sort()).toEqual(["FAI-011", "FAI-016"]);
    for (const id of missing)
      expect(dataFlags(companies.find((c) => c.id === id)!).map((f) => f.code)).toContain("FOUNDED_MISSING");
  });
  it("no company object carries a financial value field", () => {
    for (const c of companies)
      expect(Object.keys(c).join()).not.toMatch(/revenue|ebitda|valuation|price|stage|likelihood/i);
  });
  it("metro mapping is total and exhaustive", () => {
    expect(() => metroOf("Atlantis")).toThrow();
    expect(companies.map((c) => c.metro).filter((m) => !METROS.includes(m))).toEqual([]);
  });
  it("CSV and workbook Pipeline sheet agree on every identifying field and rating", () => {
    const sheet = readWorkbook(join(SRC, "Fortress_Illustrative_Acquisition_Underwriting.xlsx")).get(
      "Pipeline",
    )!;
    companies.forEach((c, i) => {
      const r = 5 + i;
      const v = (col: string) => sheet.get(`${col}${r}`)?.v;
      expect([v("A"), v("B"), v("C"), v("I")]).toEqual([c.id, c.name, c.market, c.sourceUrl]);
      expect([v("J"), v("K"), v("L"), v("M"), v("N")]).toEqual(Object.values(c.ratings));
      expect([v("Q"), v("R"), v("S")]).toEqual(["NOT CONTACTED", "NOT VERIFIED", "PENDING"]);
    });
  });
});

describe("pipeline score calculations", () => {
  const { companies } = loadDataset();
  const w = defaultWeights();
  it("default weights sum to exactly 100.00%", () => expect(weightsSumValid(w)).toBe(true));
  it("scores and labels match the workbook for all 30", () => {
    const sheet = readWorkbook(join(SRC, "Fortress_Illustrative_Acquisition_Underwriting.xlsx")).get(
      "Pipeline",
    )!;
    companies.forEach((c, i) => {
      const s = score(c.ratings, w);
      expect(Math.abs(s - (sheet.get(`O${5 + i}`)!.v as number)), c.id).toBeLessThan(1e-9);
      expect(labelOf(s), c.id).toBe(sheet.get(`P${5 + i}`)!.v);
    });
  });
  it("label boundaries", () => {
    expect(labelOf(4)).toBe("High research");
    expect(labelOf(3.9999)).toBe("Medium research");
    expect(labelOf(3.5)).toBe("Medium research");
    expect(labelOf(3.49)).toBe("Watchlist");
  });
  it("the Executive Brief's top 12 are consistent with scores (its #12 is a tie at the cut)", () => {
    const brief = [
      "Woods Comfort Systems",
      "SALT Service Co.",
      "ABA Heating & Cooling",
      "Air Comfort Systems",
      "Efficient AC, Electric & Plumbing",
      "Aquarius Home Service",
      "Beyer Plumbing / Beyer Air Conditioning",
      "Comfort-Air Engineering & Primo Plumbing",
      "Johnny Rooter Plumbing",
      "Texas Home Performance",
      "Triple A AC, Heating & Plumbing",
      "All Cool A/C & Heating",
    ];
    const ranked = rankAll(companies.map((c) => ({ id: c.id, name: c.name, score: score(c.ratings, w) })));
    const cut = Math.min(...ranked.filter((r) => brief.includes(r.name)).map((r) => r.score));
    expect(Math.round(cut * 100) / 100).toBe(4.25);
    expect(ranked.filter((r) => r.score > cut + 1e-9).every((r) => brief.includes(r.name))).toBe(true);
    expect(brief.every((n) => ranked.find((r) => r.name === n)!.score >= cut - 1e-9)).toBe(true);
    expect(ranked[0]!.name).toBe("Woods Comfort Systems");
    expect(Math.round(ranked[0]!.score * 100) / 100).toBe(4.85);
  });
  it("ties share a rank", () => {
    const r = rankAll([
      { id: "a", score: 4 },
      { id: "b", score: 4 },
      { id: "c", score: 3 },
    ]);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3]);
  });
  it("re-weighting changes scores (dependent outputs recalculate)", () => {
    const alt = { ...w, residential: 4000, recurring: 1000 }; // 10 + 40 + 20 + 15 + 15 = 100
    expect(weightsSumValid(alt)).toBe(true);
    const c = companies.find((x) => x.id === "FAI-014")!; // Cabana Air: low residential fit
    expect(score(c.ratings, alt)).not.toBeCloseTo(score(c.ratings, w), 6);
    expect(weightsSumValid({ ...w, residential: 3001 })).toBe(false);
  });
  it("weight inputs obey the two-decimal rule", () => {
    for (const k of WEIGHT_KEYS) {
      expect(parseDisplay("12.345", weightSpec(k)).ok).toBe(false);
      expect(parseDisplay("12.34", weightSpec(k))).toEqual({ ok: true, stored: 1234 });
    }
  });
});

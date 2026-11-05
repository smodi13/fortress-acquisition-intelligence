import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { loadDataset } from "@/lib/research/load";
import { Finding, OwnershipFinding } from "@/lib/research/schema";
import { OUTREACH_LABEL, STANCE_LABEL, outreachOf } from "@/lib/research/stance";
import { integrityErrors, normalize } from "@/lib/research/validate";
import { scoredDefault } from "@/lib/research/summary";
import { parseCsv } from "@/lib/research/csv";
import { readSrc } from "./helpers";

const good = {
  companyId: "FAI-004",
  stance: "OPPOSED",
  statement: "A sourced company statement.",
  sourceUrl: "https://callsalt.com/a",
  accessedDate: "2026-11-04",
  provenance: "company_self_reported",
  independentlyVerified: false,
};

describe("analyst findings schema", () => {
  it("accepts a valid self-reported finding", () => {
    expect(Finding.safeParse(good).success).toBe(true);
  });
  it.each([
    ["independentlyVerified true", { independentlyVerified: true }],
    ["http url", { sourceUrl: "http://callsalt.com/a" }],
    ["missing date", { accessedDate: "" }],
    ["NOT_ASSESSED stance", { stance: "NOT_ASSESSED" }],
    ["other provenance", { provenance: "independent" }],
  ])("rejects %s", (_n, patch) => {
    expect(Finding.safeParse({ ...good, ...patch }).success).toBe(false);
  });
  it("rejects a duplicate finding for one company", () => {
    const pipe = readSrc("screening_pipeline_30.csv");
    const ev = readSrc("evidence_register.csv");
    expect(() => normalize(parseCsv(pipe), parseCsv(ev), [good, { ...good }])).toThrow();
  });
});

describe("ownership stance and outreach status", () => {
  const { companies } = loadDataset();
  const byId = (id: string) => companies.find((c) => c.id === id)!;

  it("only SALT and Efficient carry findings; the other 28 are Not yet assessed", () => {
    const withF = companies.filter((c) => c.stanceFinding).map((c) => c.id);
    expect(withF.sort()).toEqual(["FAI-004", "FAI-005"]);
    for (const c of companies) if (!c.stanceFinding) expect(c.stance).toBe("NOT_ASSESSED");
    expect(byId("FAI-004").stance).toBe("OPPOSED");
    expect(byId("FAI-005").stance).toBe("OPPOSED");
  });
  it("findings are self-reported, unverified, dated, with the supplied URLs", () => {
    expect(byId("FAI-004").stanceFinding).toMatchObject({
      sourceUrl: "https://callsalt.com/why-salt-stays-privately-owned/",
      accessedDate: "2026-11-04",
      provenance: "company_self_reported",
      independentlyVerified: false,
    });
    expect(byId("FAI-005").stanceFinding?.sourceUrl).toBe("https://efficienttexas.com/about/");
  });
  it("outreach logic", () => {
    expect(outreachOf("OPPOSED", "High research")).toBe("EXCLUDED");
    expect(outreachOf("OPEN", "High research")).toBe("SHORTLIST");
    expect(outreachOf("OPEN", "Watchlist")).toBe("NOT_ESTABLISHED");
    expect(outreachOf("NO_POSITION", "High research")).toBe("NOT_ESTABLISHED");
    expect(outreachOf("NEEDS_VERIFICATION", "High research")).toBe("NOT_ESTABLISHED");
    expect(outreachOf("NOT_ASSESSED", "High research")).toBe("NOT_ESTABLISHED");
  });
  it("no company is on the immediate outreach shortlist; exactly 2 are excluded", () => {
    const o = scoredDefault(companies).map((r) => outreachOf(r.stance, r.label));
    expect(o.filter((x) => x === "SHORTLIST")).toHaveLength(0);
    expect(o.filter((x) => x === "EXCLUDED")).toHaveLength(2);
  });
  it("labels match the required wording", () => {
    expect(STANCE_LABEL.OPPOSED).toBe("Publicly opposed to sale or outside investment");
    expect(STANCE_LABEL.NO_POSITION).toBe("No public position identified");
    expect(STANCE_LABEL.OPEN).toBe("Publicly indicated openness to partnerships");
    expect(STANCE_LABEL.NEEDS_VERIFICATION).toBe("Requires additional verification");
    expect(OUTREACH_LABEL.EXCLUDED).toMatch(/Excluded/);
  });
  it("flags a finding whose source domain is not the company's own", () => {
    const d = loadDataset();
    const bad = d.companies.map((c) =>
      c.id === "FAI-004"
        ? { ...c, stanceFinding: { ...c.stanceFinding!, sourceUrl: "https://example.org/x" } }
        : c,
    );
    expect(
      integrityErrors(bad, parseCsv(readSrc("evidence_register.csv"))).some((e) => e.includes("FAI-004")),
    ).toBe(true);
  });
});

describe("strategic fit is preserved", () => {
  const ranked = scoredDefault(loadDataset().companies);
  it("keeps all 30 companies and the existing scores", () => {
    expect(ranked).toHaveLength(30);
    expect(ranked.find((r) => r.id === "FAI-004")!.score.toFixed(2)).toBe("4.70");
    expect(ranked.find((r) => r.id === "FAI-005")!.score.toFixed(2)).toBe("4.55");
  });
  it("source CSVs and workbook are byte-identical to git HEAD", () => {
    const out = execSync("git status --porcelain -- Ridgepeak_Fortress_Research", { encoding: "utf8" });
    expect(out.trim()).toBe("");
    expect(readSrc("screening_pipeline_30.csv")).not.toMatch(/OPPOSED|stance/i);
  });
});

describe("ownership characteristics are distinct from stance and seller intent", () => {
  const { companies } = loadDataset();
  const by = (id: string) => companies.find((c) => c.id === id)!;
  const good = {
    companyId: "FAI-001",
    ownershipType: "FAMILY_OWNED",
    peStatus: "NO_PE_REPORTED",
    peNote: "Company reports no PE acquisition.",
    statement: "A sourced company statement.",
    sourceUrl: "https://woodscomfortsystems.com/about-us/",
    reviewDate: "2026-11-04",
    researchQualification: "ELIGIBLE",
    provenance: "company_self_reported",
    independentlyVerified: false,
  };

  it("exactly Woods, ABA and Manuel are family-owned and not PE-backed (self-reported)", () => {
    const ids = companies.filter((c) => c.ownership).map((c) => c.id);
    expect(ids.sort()).toEqual(["FAI-001", "FAI-007", "FAI-013"]);
    for (const id of ids) {
      expect(by(id).ownership).toMatchObject({
        ownershipType: "FAMILY_OWNED",
        peStatus: "NO_PE_REPORTED",
        reviewDate: "2026-11-04",
        independentlyVerified: false,
      });
    }
    expect(by("FAI-001").ownership?.sourceUrl).toBe("https://woodscomfortsystems.com/about-us/");
    expect(by("FAI-007").ownership?.sourceUrl).toBe("https://abaaustin.com/about-us/");
    expect(by("FAI-013").ownership?.sourceUrl).toBe("https://manuelandsons.com/about");
  });
  it("family-owned / not PE-backed never implies opposition, openness or exclusion", () => {
    for (const id of ["FAI-001", "FAI-007", "FAI-013"]) {
      const c = by(id);
      expect(c.stance).toBe("NOT_ASSESSED");
      expect(c.stanceFinding).toBeNull();
      expect(outreachOf(c.stance, "High research")).toBe("NOT_ESTABLISHED");
      expect(c.evidence.seller_intent).toMatch(/^Unknown/);
    }
  });
  it("classification counts", () => {
    const stanceCount = (s: string) => companies.filter((c) => c.stance === s).length;
    expect(stanceCount("OPPOSED")).toBe(2);
    expect(stanceCount("OPEN")).toBe(0);
    expect(stanceCount("NOT_ASSESSED")).toBe(28);
    expect(companies.filter((c) => c.ownership?.ownershipType === "FAMILY_OWNED")).toHaveLength(3);
    expect(companies.filter((c) => c.ownership?.peStatus === "NO_PE_REPORTED")).toHaveLength(3);
    // SALT / Efficient keep OPPOSED and have no ownership finding mixed in
    expect(by("FAI-004").stance).toBe("OPPOSED");
    expect(by("FAI-005").stance).toBe("OPPOSED");
    expect(by("FAI-004").ownership).toBeNull();
  });
  it("scores of the three are unchanged", () => {
    const r = scoredDefault(companies);
    expect(r.find((x) => x.id === "FAI-001")!.score.toFixed(2)).toBe("4.85");
    expect(r.find((x) => x.id === "FAI-007")!.score.toFixed(2)).toBe("4.65");
  });
  it("ownership schema rejects a stance field, verified=true and http", () => {
    expect(OwnershipFinding.safeParse(good).success).toBe(true);
    expect(OwnershipFinding.safeParse({ ...good, stance: "OPPOSED" }).success).toBe(false);
    expect(OwnershipFinding.safeParse({ ...good, independentlyVerified: true }).success).toBe(false);
    expect(OwnershipFinding.safeParse({ ...good, sourceUrl: "http://x.com/a" }).success).toBe(false);
    expect(OwnershipFinding.safeParse({ ...good, ownershipType: "OPPOSED" }).success).toBe(false);
  });
  it("a duplicate ownership finding throws; off-domain source is flagged", () => {
    const pipe = parseCsv(readSrc("screening_pipeline_30.csv"));
    const ev = parseCsv(readSrc("evidence_register.csv"));
    expect(() => normalize(pipe, ev, [], [good, { ...good }])).toThrow();
    const bad = companies.map((c) =>
      c.id === "FAI-001" ? { ...c, ownership: { ...c.ownership!, sourceUrl: "https://example.org/x" } } : c,
    );
    expect(integrityErrors(bad, ev).some((e) => e.includes("FAI-001"))).toBe(true);
  });
});

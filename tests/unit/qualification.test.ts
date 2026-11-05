import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { loadDataset } from "@/lib/research/load";
import { Finding } from "@/lib/research/schema";
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

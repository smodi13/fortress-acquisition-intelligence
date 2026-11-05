import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../../src/lib/research/csv";

const SRC = join(process.cwd(), "Ridgepeak_Fortress_Research");
const ROUTES = [
  "/",
  "/pipeline",
  "/companies/FAI-001",
  "/market",
  "/underwriting",
  "/sensitivity",
  "/execution",
  "/evidence",
  "/methodology",
];
const DISCLAIMER =
  "Independent applicant work sample. Not affiliated with Ridgepeak Partners or Fortress Service Partners. Company data is public and unverified. Financial case is illustrative.";

const noOverflow = async (page: Page) => {
  const o = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(o, "horizontal page overflow (px)").toBeLessThanOrEqual(0);
};
const setField = async (page: Page, id: string, value: string) => {
  const input = page.locator(`input[data-field="${id}"]`).first();
  await input.fill(value);
};

test.describe("navigation and content", () => {
  for (const r of ROUTES) {
    test(`route ${r} renders with disclaimer, no horizontal overflow, no console errors`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      const res = await page.goto(r);
      expect(res?.status()).toBe(200);
      await expect(page.getByTestId("disclaimer")).toHaveText(DISCLAIMER);
      await expect(page.locator("h1")).toHaveCount(1);
      await noOverflow(page);
      expect(errors).toEqual([]);
    });
  }

  test("primary navigation reaches every section", async ({ page, isMobile }) => {
    await page.goto("/");
    for (const [label, path] of [
      ["Pipeline", "/pipeline"],
      ["Market", "/market"],
      ["Underwriting", "/underwriting"],
      ["Scenarios", "/sensitivity"],
      ["Execution", "/execution"],
      ["Evidence", "/evidence"],
      ["Methodology", "/methodology"],
      ["Overview", "/"],
    ] as const) {
      if (isMobile) await page.getByRole("button", { name: "Menu" }).click();
      await page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("link", { name: label, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : path}`));
      await expect(page.locator('nav#site-nav [aria-current="page"]')).toHaveText(label);
    }
  });

  test("unknown routes and unknown company return a useful 404", async ({ page }) => {
    for (const p of ["/nope", "/companies/FAI-999", "/companies/FAI-031"]) {
      const res = await page.goto(p);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Open the acquisition pipeline" })).toBeVisible();
    }
  });

  test("overview shows 30 companies, zero contacted, thesis, downloads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Researched companies")).toBeVisible();
    await expect(page.locator(".kpi", { hasText: "Researched companies" }).locator(".value")).toHaveText(
      "30",
    );
    await expect(
      page.locator(".kpi", { hasText: "Immediate outreach shortlist" }).locator(".value"),
    ).toHaveText("0");
    await expect(page.getByRole("heading", { name: "Decision summary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Public owner-stance findings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Verification gaps" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next-diligence priorities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Important investment risks" })).toBeVisible();
    await expect(page.getByText("Illustrative underwriting, not company-specific financials")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("20 of 30");
    await expect(page.locator("#h-stance ~ ul li")).toHaveCount(2);
    await expect(page.locator("tbody tr").filter({ hasText: "25.12%" })).toHaveCount(1); // base IRR, computed
  });
});

test.describe("pipeline", () => {
  test("lists all 30, filters by URL, sorts every column, exports CSV", async ({ page }) => {
    await page.goto("/pipeline");
    const rows = page.locator('[data-testid="pipeline-table"] tbody tr');
    await expect(rows).toHaveCount(30);

    // URL-driven filter
    await page.goto("/pipeline?metro=San+Antonio&service=Plumbing");
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(30);
    for (const t of await rows.allInnerTexts()) expect(t).toMatch(/San Antonio/);
    await expect(page.getByTestId("result-count")).toContainText(`Showing ${n} of 30`);

    // search narrows and persists to URL
    await page.goto("/pipeline");
    await page.getByLabel("Search companies").fill("woods");
    await expect(rows).toHaveCount(1);
    await expect(page).toHaveURL(/q=woods/);

    // every column sortable
    await page.goto("/pipeline");
    const heads = page.locator('[data-testid="pipeline-table"] thead th button');
    const count = await heads.count();
    expect(count).toBe(14);
    for (let i = 0; i < count; i++) {
      await heads.nth(i).click();
      await expect(
        page.locator('thead th[aria-sort="ascending"], thead th[aria-sort="descending"]'),
      ).toHaveCount(1);
      await expect(rows).toHaveCount(30);
    }
    // score sort descending places 4.85 first
    const scoreTh = page.locator("thead th", { has: page.getByRole("button", { name: /^Score/ }) });
    await page.getByRole("button", { name: /^Score/ }).click();
    await expect(scoreTh).toHaveAttribute("aria-sort", "ascending");
    await page.getByRole("button", { name: /^Score/ }).click();
    await expect(scoreTh).toHaveAttribute("aria-sort", "descending");
    await expect(rows.first()).toContainText("4.85");

    // CSV export is valid and matches the dataset and filter
    await page.goto("/pipeline?label=High+research");
    const filtered = await rows.count();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
    const csv = readFileSync((await dl.path())!, "utf8");
    const parsed = parseCsv(csv);
    expect(parsed).toHaveLength(filtered);
    for (const r of parsed) {
      expect(r["primary_source_url"]).toMatch(/^https:\/\//);
      expect(r["verified_financials"]).toBe("NOT VERIFIED");
      expect(Object.keys(r).join()).not.toMatch(/revenue|ebitda/i);
    }
  });

  test("keyboard: filter chips and sort buttons operate with keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow verified on desktop");
    await page.goto("/pipeline");
    const chip = page.getByRole("button", { name: "Houston", exact: true });
    await chip.focus();
    await expect(chip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/metro=Houston/);
    const sortBtn = page.getByRole("button", { name: /^Company/ });
    await sortBtn.focus();
    await page.keyboard.press("Space");
    await expect(page.locator('th[aria-sort="ascending"]')).toContainText("Company");
  });

  test("weights editor rejects >2 decimals and non-100 totals; valid reweight changes ranking", async ({
    page,
  }) => {
    await page.goto("/pipeline");
    await page.getByText("Scoring weights (analyst assumptions)").click();
    const w = page.locator("#w-residential");
    await w.fill("30.001");
    await expect(page.getByRole("alert").filter({ hasText: "at most 2 decimal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply weights" })).toBeDisabled();
    await w.fill("40.00");
    await expect(page.getByText(/must equal 100.00%/)).toBeVisible();
    await page.locator("#w-recurring").fill("10.00");
    await expect(page.getByRole("button", { name: "Apply weights" })).toBeEnabled();
    await page.getByRole("button", { name: "Apply weights" }).click();
    await expect(page.getByText("custom weights")).toBeVisible();
  });
});

test.describe("company profiles", () => {
  test("a profile shows sourced facts, unknown financials, no estimates", async ({ page }) => {
    await page.goto("/companies/FAI-001");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Woods Comfort Systems");
    await expect(page.getByText("Christopher Alan Woods")).toBeVisible();
    const src = page.getByRole("link", { name: /woodscomfortsystems\.com\/about-us/ }).first();
    await expect(src).toHaveAttribute("href", "https://woodscomfortsystems.com/about-us/");
    await expect(src).toHaveAttribute("target", "_blank");
    await expect(src).toHaveAttribute("rel", /noopener/);
    for (const k of ["Revenue", "EBITDA", "Seller asking price"])
      await expect(page.getByRole("row", { name: new RegExp(`^${k}`) })).toContainText("Unknown");
    await expect(page.getByText("Research fit assessment")).toBeVisible();
    await expect(page.getByText("Missing diligence information")).toBeVisible();
    await expect(page.getByText("Appropriate next research steps")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/\$\d/); // no dollar value anywhere on a company page
  });

  test("stance and outreach status: SALT and Efficient are opposed and excluded; others not assessed", async ({
    page,
  }) => {
    for (const [id, url] of [
      ["FAI-004", "https://callsalt.com/why-salt-stays-privately-owned/"],
      ["FAI-005", "https://efficienttexas.com/about/"],
    ]) {
      await page.goto(`/companies/${id}`);
      const sec = page.locator("#h-stance").locator("..");
      await expect(sec).toContainText("Publicly opposed to sale or outside investment");
      await expect(sec).toContainText("Excluded: publicly opposed");
      await expect(sec).toContainText("accessed 2026-11-04");
      await expect(sec).toContainText("not independently verified");
      await expect(sec.locator(`a[href="${url}"]`).first()).toHaveAttribute("rel", /noopener/);
    }
    await page.goto("/companies/FAI-001");
    await expect(page.locator("#h-stance").locator("..")).toContainText("Not yet assessed");
    await expect(page.locator("#h-stance").locator("..")).toContainText("Readiness not established");
  });

  test("family-owned / not-PE-backed companies stay eligible, not opposed, not shortlisted", async ({
    page,
  }) => {
    for (const [id, url] of [
      ["FAI-001", "https://woodscomfortsystems.com/about-us/"],
      ["FAI-007", "https://abaaustin.com/about-us/"],
      ["FAI-013", "https://manuelandsons.com/about"],
    ]) {
      await page.goto(`/companies/${id}`);
      const own = page.locator("#h-own").locator("..");
      await expect(own).toContainText("Family-owned (company self-reported)");
      await expect(own).toContainText("Not currently PE-backed");
      await expect(own).toContainText("reviewed 2026-11-04");
      await expect(own.getByRole("row", { name: /^Seller intent/ })).toContainText("Unknown");
      await expect(own.getByRole("row", { name: /^Public opposition/ })).toContainText("Not established");
      await expect(own.locator(`a[href="${url}"]`)).toBeVisible();
      await expect(page.locator("#h-stance").locator("..")).toContainText("Readiness not established");
      await expect(page.locator("#h-stance").locator("..")).not.toContainText("Excluded");
    }
    await page.goto("/pipeline?ownership=FAMILY_OWNED&pe=NO_PE_REPORTED");
    await expect(page.locator('[data-testid="pipeline-table"] tbody tr')).toHaveCount(3);
    await page.goto("/pipeline?ownership=FAMILY_OWNED&outreach=EXCLUDED");
    await expect(page.getByTestId("result-count")).toContainText("Showing 0 of 30");
    await page.goto("/evidence");
    await expect(page.getByTestId("ownership-findings").locator("li")).toHaveCount(3);
  });

  test("pipeline stance/outreach filters and export columns", async ({ page }) => {
    await page.goto("/pipeline?stance=OPPOSED");
    const rows = page.locator('[data-testid="pipeline-table"] tbody tr');
    await expect(rows).toHaveCount(2);
    await page.goto("/pipeline?outreach=SHORTLIST");
    await expect(page.getByTestId("result-count")).toContainText("Showing 0 of 30");
    await page.goto("/pipeline?outreach=EXCLUDED");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
    const parsed = parseCsv(readFileSync((await dl.path())!, "utf8"));
    expect(parsed).toHaveLength(2);
    for (const r of parsed) {
      expect(r["public_owner_stance"]).toBe("Publicly opposed to sale or outside investment");
      expect(r["outreach_status"]).toMatch(/^Excluded/);
      expect(r["owner_stance_source_url"]).toMatch(/^https:\/\//);
    }
  });

  test("all 30 profile pages load with a primary source link", async ({ page }) => {
    for (let i = 1; i <= 30; i++) {
      const id = `FAI-${String(i).padStart(3, "0")}`;
      const res = await page.goto(`/companies/${id}`);
      expect(res?.status(), id).toBe(200);
      await expect(page.locator('a[href^="https://"][target="_blank"]').first()).toBeVisible();
      await expect(page.locator("main")).toContainText(id);
    }
  });
});

test.describe("underwriting", () => {
  test("defaults show workbook base results", async ({ page }) => {
    await page.goto("/underwriting");
    await expect(page.getByText("PASSES ILLUSTRATIVE HURDLE")).toBeVisible();
    const kpis = page.getByRole("region", { name: "Headline results" });
    await expect(kpis).toContainText("$7.20mm");
    await expect(kpis).toContainText("$3.05mm");
    await expect(kpis).toContainText("3.07x");
    await expect(kpis).toContainText("25.12%");
    await expect(page.getByText("Illustrative transaction.", { exact: true })).toBeVisible();
  });

  test("editing assumptions recalculates immediately; >2 decimals rejected", async ({ page }) => {
    await page.goto("/underwriting");
    const kpis = page.getByRole("region", { name: "Headline results" });
    await setField(page, "deal.entryMultiple", "6.00");
    await expect(kpis).toContainText("$8.64mm");
    await expect(page.getByText("BELOW ILLUSTRATIVE HURDLE")).toBeVisible();

    await setField(page, "deal.entryMultiple", "5.005");
    await expect(page.getByRole("alert").filter({ hasText: "at most 2 decimal" })).toBeVisible();
    await expect(kpis).toContainText("$8.64mm"); // last valid value retained, not silently rounded

    await setField(page, "deal.entryMultiple", "5.00");
    await expect(kpis).toContainText("$7.20mm");

    await page.getByRole("button", { name: "Downside", exact: true }).click();
    await expect(kpis).toContainText("17.92%");
    await page.getByRole("button", { name: "Upside", exact: true }).click();
    await expect(kpis).toContainText("32.03%");
  });

  test("funding shortfall is flagged and invalid capital structure yields no IRR", async ({ page }) => {
    await page.goto("/underwriting");
    await page.getByRole("button", { name: "Base", exact: true }).click();
    await setField(page, "case.Base.ebitdaMargin", "3.00");
    await setField(page, "case.Base.growth", "-5.00");
    await setField(page, "deal.mandatoryAmortPct", "25.00");
    await expect(page.getByTestId("flags")).toContainText("OPERATING_SHORTFALL");
    await expect(page.getByTestId("status")).toContainText("FUNDING REQUIRED");
    await page.getByRole("button", { name: "Reset to workbook defaults" }).click();
    await setField(page, "deal.rolloverPctEv", "100.00");
    await setField(page, "deal.maxDebtPctEv", "100.00");
    await setField(page, "deal.debtToEbitda", "20.00");
    await expect(page.getByTestId("flags")).toContainText("SPONSOR_EQUITY_NONPOSITIVE");
    await expect(page.getByRole("region", { name: "Headline results" })).toContainText("n/m");
  });

  test("assumptions persist across pages and reset restores defaults", async ({ page }) => {
    await page.goto("/underwriting");
    await setField(page, "deal.entryMultiple", "4.50");
    await page.goto("/sensitivity");
    await expect(page.locator('input[data-field="deal.entryMultiple"]').first()).toHaveValue("4.50");
    await page.goto("/underwriting");
    await page.getByRole("button", { name: "Reset to workbook defaults" }).click();
    await expect(page.locator('input[data-field="deal.entryMultiple"]').first()).toHaveValue("5.00");
  });
});

test.describe("scenarios and sensitivity", () => {
  test("shows reference IRRs, center cell equals selected IRR, limitation always visible", async ({
    page,
  }) => {
    await page.goto("/sensitivity");
    const t = page.getByTestId("scenario-table");
    await expect(t).toContainText("17.92%");
    await expect(t).toContainText("25.12%");
    await expect(t).toContainText("32.03%");
    await expect(t).toContainText("2.28x");
    await expect(t).toContainText("4.01x");
    await expect(page.getByText("Partial sensitivity.")).toBeVisible();
    await expect(page.locator('[data-center="true"]').first()).toHaveText("25.12%");
    await expect(page.getByTestId("center-check")).toContainText("equals");
    for (const s of ["Downside", "Upside", "Base"]) {
      await page.getByRole("button", { name: s, exact: true }).click();
      const irr = (await page.locator('[data-center="true"]').first().innerText()).trim();
      const row = page.getByTestId("scenario-table").getByRole("row", { name: /Gross IRR/ });
      await expect(row).toContainText(irr);
    }
    await expect(page.getByTestId("stress")).toBeVisible();
    await expect(page.getByTestId("bridge")).toBeVisible();
  });
});

test.describe("execution, evidence, methodology", () => {
  test("execution content is labelled illustrative and not commenced", async ({ page }) => {
    await page.goto("/execution");
    await expect(page.getByText("Illustrative · hypothetical · not commenced.")).toBeVisible();
    for (const h of [
      "Qualification funnel",
      "LOI preparation checklist",
      "Diligence workstreams",
      "Risk register",
      "Closing-readiness framework",
      "Post-close integration plan",
    ])
      await expect(page.getByRole("heading", { name: new RegExp(h) })).toBeVisible();
    await expect(page.getByText("NOT COMMENCED").first()).toBeVisible();
  });

  test("evidence register lists 30 sources and filters", async ({ page }) => {
    await page.goto("/evidence");
    await expect(page.locator('[data-testid="evidence-table"] tbody tr')).toHaveCount(30);
    await page.getByLabel("Filter evidence register").fill("callsalt");
    await expect(page.locator('[data-testid="evidence-table"] tbody tr')).toHaveCount(1);
    await page.goto("/evidence");
    const links = page.locator('[data-testid="evidence-table"] tbody a[target="_blank"]');
    await expect(links).toHaveCount(30);
    for (const h of await links.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href)))
      expect(h).toMatch(/^https:\/\//);
  });
});

test.describe("downloads are exact copies", () => {
  const files = [
    "Acquisition_Pipeline_Executive_Brief.pdf",
    "Conditional_Investment_Committee_Memorandum.pdf",
    "Transaction_Execution_Playbook.pdf",
    "Fortress_Illustrative_Acquisition_Underwriting.xlsx",
    "screening_pipeline_30.csv",
    "evidence_register.csv",
  ];
  for (const f of files) {
    test(f, async ({ request }) => {
      const res = await request.get(`/downloads/${f}`);
      expect(res.status()).toBe(200);
      const got = createHash("sha256")
        .update(await res.body())
        .digest("hex");
      const want = createHash("sha256")
        .update(readFileSync(join(SRC, f)))
        .digest("hex");
      expect(got).toBe(want);
    });
  }
  test("overview links all six", async ({ page }) => {
    await page.goto("/");
    for (const f of files)
      await expect(page.getByTestId(`download-${f}`)).toHaveAttribute("href", `/downloads/${f}`);
  });
});

test.describe("accessibility", () => {
  for (const r of ROUTES) {
    test(`axe: no serious/critical violations on ${r}`, async ({ page }) => {
      await page.goto(r);
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        bad.map(
          (v) =>
            `${v.id}: ${v.nodes
              .map((n) => n.target.join(" "))
              .slice(0, 3)
              .join(" | ")}`,
        ),
      ).toEqual([]);
    });
  }
  test("skip link and visible focus", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop keyboard flow");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });
});

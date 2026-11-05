# Fortress Acquisition Intelligence

> **Independent applicant work sample. Not affiliated with, sponsored by, or endorsed by Ridgepeak Partners or Fortress Service Partners. Company data is public and unverified. Financial case is illustrative.**

**Live application: https://fortress-acquisition-intelligence.vercel.app**

Independent private equity acquisition sourcing, financial underwriting, and M&A execution intelligence platform focused on Texas residential services (HVAC, plumbing, electrical). Built as a work sample for an Investment Analyst application at Ridgepeak Partners, informed by publicly available information about Fortress Service Partners. Neither firm commissioned, reviewed or endorsed this work.

## 1. Purpose

The research asks: which Texas residential home-services operators merit further _qualification_ for a buy-and-build platform, judged only from public information, and how would a team underwrite and execute such a deal? The tool is a research-qualification workspace. It is not an offer, a solicitation, or investment advice.

## 2. Acquisition sourcing capabilities

- **Pipeline workspace** for 30 researched companies: full-text search; market, service, business-mix, research-priority and source-confidence filters; sortable columns; filter state saved in the URL; CSV export of the current view.
- **Transparent ranking.** `score = recurring×0.20 + residential×0.30 + austin×0.20 + owner×0.15 + source confidence×0.15`. Ratings are analyst judgments (1–5); weights are editable (two decimals, must total exactly 100.00%) and re-rank live. Ties share a rank. A score never implies seller willingness, price attractiveness or likelihood of a transaction.
- **Company profiles** (`/companies/FAI-001` … `FAI-030`): sourced description, self-reported leadership and ownership, score build-up, caveats, missing diligence information, next research steps, primary-source link. Financial and transaction fields are shown as _Unknown_.

## 3. Research database and evidence architecture

- Authoritative inputs live unmodified in [`Ridgepeak_Fortress_Research/`](Ridgepeak_Fortress_Research): `screening_pipeline_30.csv`, `evidence_register.csv`, `research_manifest.json`, three PDFs, the Excel model, and reference test values.
- A normalization layer parses the CSVs and validates them with strict Zod schemas (unknown columns such as a stray `revenue` are rejected) plus integrity rules: exactly 30 unique companies, one evidence row each, https sources, evidence URL equals the pipeline URL, seller intent must be "Unknown", financial disclosure must state no verified financials, and no text may assert sale or contact status.
- Every value is tagged by provenance in the UI: **A** public fact, **B** company self-report, **C** analyst judgment, **D** assumption, **E** formula-calculated output, or **Unknown**.
- The `/evidence` page lists all 30 first-party sources with verification status and seller-intent labels. Market statements (Capstone Partners, October 2026 YTD) carry their reference date and cutoff qualifiers.

## 4. Formula-driven financial underwriting

An illustrative acquisition of an _unnamed_ company with a **hypothetical** $8.00mm revenue input (USD millions throughout). The engine (`src/lib/finance/engine.ts`, no UI imports) models entry EV, debt sizing, seller rollover, fees, sources and uses, sponsor equity and ownership; a five-year forecast with synergies, D&A, interest, cash taxes, capex, working capital and integration cost; free cash flow, mandatory amortization and cash sweep; funding-shortfall detection; exit value, sponsor proceeds, gross MOIC and IRR.

- **Nothing calculated is hardcoded.** Only labeled assumptions and sourced facts are typed values.
- **Two-decimal rule.** Every editable assumption accepts at most two decimals in its displayed unit (`18.00` means 18.00%); longer entries are rejected, never silently rounded. Internal math keeps full precision; rounding is display-only.
- **Invalid math is flagged.** Non-positive sponsor equity or negative exit equity yields an error and no IRR. The model draws no revolver and injects no equity: deficits are flagged, not financed.

## 5. Scenario and valuation analysis

Downside / Base / Upside from the workbook's Cases sheet (not probability-weighted), side-by-side comparison, return drivers (an exactly reconciling equity value bridge), a 5×5 entry/exit multiple IRR grid, break-even multiples, and mechanical stress flexes. The workbook's grid is a **partial** sensitivity (debt sizing, paydown and exit cash held constant); the UI says so wherever it appears and reports how much a full re-run differs.

## 6. Deal execution tools

`/execution` translates the supplied Transaction Execution Playbook into a seven-stage qualification funnel, owner-call guide, nonbinding LOI term framework, diligence tracker, risk register, closing-readiness gates and a 100-day integration plan. Everything is **simulated and labeled "not commenced"**. No outreach, seller contact, LOI, diligence request or deal stage exists for any company.

## 7. Excel parity testing

The workbook (`Fortress_Illustrative_Acquisition_Underwriting.xlsx`, 291 formulas) is the source of truth and is never modified. Tests assert, to absolute tolerance 1e-6:

| Case     | Gross MOIC | Gross IRR |
| -------- | ---------- | --------- |
| Downside | 2.28x      | 17.92%    |
| Base     | 3.07x      | 25.12%    |
| Upside   | 4.01x      | 32.03%    |

- every returns field, entry sources and uses, and all periods of the cash waterfall for all three cases against `formula_engine_reference_tests.json`;
- every forecast row against the workbook's cached cells, and all 25 sensitivity cells, with the center cell equal to the selected case IRR;
- full headless **LibreOffice recalculation** of edited copies of the workbook (changed entry multiple, rollover, synergies, binding debt cap, funding shortfall) compared with the engine;
- a drift test that fails if the extracted assumption JSON no longer matches the workbook.

Documented differences from Excel: invalid math produces an error flag instead of `IFERROR`'s 0, and the hold period is locked at the workbook's 5-year forecast.

## 8. Technology stack

Next.js 16 (App Router, static generation) · React 19 · TypeScript (strict) · Zod · Recharts · Vitest · Playwright with axe-core · ESLint · Prettier · deployed on Vercel. No database, no API keys, no analytics or trackers, no external data feeds.

## 9. Local development

Requires Node.js 20+ (developed on 24).

```bash
git clone https://github.com/smodi13/fortress-acquisition-intelligence.git
cd fortress-acquisition-intelligence
npm install
npm run dev                          # http://localhost:3000
npm test                             # unit, parity and data-integrity tests
npm run build && npm run test:e2e    # browser tests (first run: npx playwright install chromium)
npm run check                        # format, lint, typecheck, unit, build, browser
BASE_URL=https://fortress-acquisition-intelligence.vercel.app npx playwright test   # run against production
```

The LibreOffice differential test runs only when `soffice` is installed. The build copies the six supplied downloads byte for byte and fails on any SHA-256 mismatch. Pushes to `main` deploy to production through the linked Vercel project.

## 10. Data limitations

- The 30 companies are **real, publicly identified businesses** with first-party source links. They are uncontacted research leads: **no company is confirmed or implied to be for sale**, and seller intent is unknown.
- **No private-company financial statements exist** in this project. Company revenue, EBITDA, valuation and asking price are unknown and never estimated. The $8.00mm figure is a hypothetical modeling input, not an estimate for any identified company.
- Descriptions, ownership statements and leadership names come from each company's own website (self-reported) as of November 4, 2026 and may have changed. Licensing (TDLR / TSBPE), entity and ownership verification are pending.
- Scores, notes and caveats are analyst judgments from public information.
- The model excludes tax basis step-up, working-capital peg, purchase accounting, indemnities, revolver draws and equity cures; returns are gross of fees, carry and investor-level taxes.
- Source links are not re-checked live.

## 11. Sources

Company information: each company's own website, listed per company in `evidence_register.csv`. Sector figures: Capstone Partners, _Residential Services M&A Update_ (October 2026). Context: Fortress Service Partners public website; public Ridgepeak job posting; Texas TDLR and TSBPE public license registries. All remain the property of their respective owners and are cited, not reproduced beyond short factual statements.

## 12. Disclaimer and license

This is an independent applicant work sample. It is not affiliated with, authorized by, sponsored by, or prepared for Ridgepeak Partners or Fortress Service Partners, and use of those names is only to describe the work sample's context. Nothing here is an offer, a solicitation, a valuation, or investment advice. No open-source license has been granted; all rights are reserved by the author unless a license file is added.

# Fortress Acquisition Intelligence

> **Independent applicant work sample. Not affiliated with Ridgepeak Partners or Fortress Service Partners. Company data is public and unverified. Financial case is illustrative.**

Independent private equity acquisition sourcing, financial underwriting and M&A execution intelligence platform focused on Texas residential services (HVAC, plumbing, electrical).

Live site: https://fortress-acquisition-intelligence.vercel.app

## Investment research objective

Prepared as a work sample for an Investment Analyst role. The research asks which Texas residential home-services operators merit further qualification for a buy-and-build platform, using only public information, and shows how a team would underwrite and execute such a deal. It is a research-qualification tool, not an offer or investment recommendation.

## What the data is, and is not

- **30 real, publicly identified companies** (`FAI-001` to `FAI-030`) with first-party source links.
- **No verified private-company financial statements.** Revenue, EBITDA, valuation and asking price are unknown for every company and are never shown or estimated.
- **No confirmed acquisition opportunities.** No company has been contacted, and none is verified as being for sale. Seller intent is unknown.
- **The underwriting model is hypothetical.** Its $8.00mm revenue input belongs to an unnamed sample acquisition and is not an estimate for any identified company. Hypothetical results are labeled as such throughout the UI.
- Ratings, scores and notes are analyst judgments; company descriptions are self-reported. The UI tags each value as public fact, self-report, analyst judgment, assumption, model output or unknown.

## Features

Investment overview · Acquisition pipeline (search, filters, sortable ranking, URL-persisted state, CSV export, editable scoring weights) · 30 company profiles · Market intelligence (dated, sourced) · Acquisition underwriting (live recalculation) · Scenario and sensitivity analysis · Simulated deal-execution workflow (all items "not commenced") · Evidence register · Methodology · Exact-copy downloads of the supplied PDFs, workbook and CSVs.

## Architecture

| Path                           | Role                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `Ridgepeak_Fortress_Research/` | Authoritative source files, committed unmodified.                                            |
| `scripts/`                     | Read-only workbook reader and assumption extractor; download sync with SHA-256 check.        |
| `src/data/`                    | Generated assumption/market JSON, cited narrative and execution text, downloads manifest.    |
| `src/lib/finance/`             | Pure calculation engine, input specs and two-decimal enforcement, formatting. No UI imports. |
| `src/lib/research/`            | CSV parser, strict Zod schemas, integrity rules, scoring, derived data-quality flags.        |
| `src/app/`, `src/components/`  | Next.js 16 App Router (static generation) and UI.                                            |
| `tests/unit`, `tests/e2e`      | Vitest; Playwright with axe.                                                                 |

## Financial modeling methodology

USD millions. The engine models entry valuation, sources and uses, five-year revenue and EBITDA with synergies, depreciation, interest, cash taxes, capex, working capital and integration costs, free cash flow, mandatory amortization plus cash sweep, shortfall detection, exit, sponsor MOIC and gross IRR for downside, base and upside cases, and a 5×5 entry/exit multiple sensitivity. The full formula contract is on the Methodology page.

Rules: only labeled assumptions and sourced facts are typed values; every output is calculated at full precision and rounded for display only. Assumptions are stored as integer hundredths of their display unit; entries with more than two decimals are rejected, never rounded. The workbook's sensitivity grid is partial (debt sizing, paydown and exit cash held constant), and the UI says so.

## Excel formula parity

`Fortress_Illustrative_Acquisition_Underwriting.xlsx` is the source of truth. Tests require, to absolute tolerance 1e-6: every returns field, entry sources and uses, all periods of the cash waterfall for the three cases (IRR 17.92% / 25.12% / 32.03%; MOIC 2.28x / 3.07x / 4.01x), all 25 sensitivity cells, and a center cell equal to the selected case IRR. Edited copies of the workbook are also recalculated headlessly in LibreOffice and compared to the engine. Documented differences: invalid math (non-positive sponsor equity) yields an error flag instead of Excel's `IFERROR` zero, and the hold period is locked to the workbook's 5-year forecast.

## Installation and local development

Requires Node.js 20+ (developed on 24).

```bash
npm install
npm run dev        # http://localhost:3000 (syncs downloads first)
```

## Testing

```bash
npm test                        # unit, parity and data-integrity tests (Vitest)
npm run build && npm run test:e2e   # browser tests (first run: npx playwright install chromium)
npm run check                   # format, lint, typecheck, unit tests, build, browser tests
BASE_URL=https://your-site npx playwright test   # run the browser suite against a deployed site
```

The LibreOffice differential test runs only if LibreOffice is installed (`soffice`).

## Deployment

The app is a static Next.js build with no environment variables or secrets. Deploy with the Vercel CLI (`vercel deploy --prod`) or by importing the repository in Vercel (framework: Next.js, production branch: `main`). The Vercel project is linked to this GitHub repository, so pushes to `main` deploy to production automatically. The build copies the six supplied downloads byte for byte from `Ridgepeak_Fortress_Research/` and fails on any hash mismatch.

## Limitations

No licensing, ownership or financial verification exists for any company. The model excludes tax basis step-up, working-capital peg, purchase accounting, indemnities, revolver draws and equity cures; returns are gross. Source links are not re-checked live.

## Disclaimer

This is an independent applicant work sample. It is not affiliated with, authorized by, or prepared for Ridgepeak Partners or Fortress Service Partners, and it is not an offer, a solicitation or investment advice.

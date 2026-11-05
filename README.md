# Fortress Acquisition Intelligence

> **Independent applicant work sample. Not affiliated with Ridgepeak Partners or Fortress Service Partners. Company data is public and unverified. Financial case is illustrative.**

A read-only acquisition-intelligence site: 30 uncontacted Texas home-services research leads, plus a clearly separate, illustrative transaction model whose logic reproduces the supplied Excel workbook.

- No company has been contacted or verified as being for sale. No company financials exist or are shown.
- The $8.00mm revenue input belongs to an unnamed sample deal, not to any identified company.
- Investment research, assumptions and judgments come from the supplied packet (`Ridgepeak_Fortress_Research/`, never modified). This repo only implements software.

## Commands

```bash
npm install
npm run dev            # syncs downloads, starts Next.js on :3000
npm run build && npm start
npm run check          # format, lint, typecheck, unit tests, build, browser e2e
npm test               # Vitest (unit, parity, LibreOffice differential)
npm run test:e2e       # Playwright (needs a prior `npm run build`; first time: npx playwright install chromium)
npm run extract        # regenerate src/data/*.json from the workbook (a test fails if they drift)
```

## Architecture

| Path                                          | Role                                                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ridgepeak_Fortress_Research/`                | Authoritative source files (read-only).                                                                                                         |
| `scripts/xlsx-read.ts`, `extract-workbook.ts` | Read-only OOXML reader (the workbook uses an `x:` prefix that common libraries cannot parse). Extracts labeled assumptions only, never outputs. |
| `src/data/`                                   | Generated assumptions/market JSON, execution and narrative text with PDF page citations, downloads manifest.                                    |
| `src/lib/finance/`                            | Pure calculation engine (`engine.ts`), input specs and two-decimal enforcement (`inputs.ts`), formatting. No UI imports.                        |
| `src/lib/research/`                           | CSV parser, Zod schemas (strict), integrity rules, scoring, derived data-quality flags.                                                         |
| `src/app/`, `src/components/`                 | Next.js App Router pages and UI. Pages render data; no data rows live in JSX.                                                                   |
| `tests/unit`, `tests/e2e`                     | Vitest and Playwright (+ axe).                                                                                                                  |

Routes: `/`, `/pipeline`, `/companies/[id]`, `/market`, `/underwriting`, `/sensitivity`, `/execution`, `/evidence`, `/methodology`. Unknown routes and company IDs return a 404 page.

## Input provenance and formula contract

Units: USD millions; rates stored as fractions, entered in display units (`18.00` = 18.00%). Assumptions are held as integer hundredths of their display unit, so `parse("18.00") / 10000` is bit-identical to the workbook's `0.18`; entries with more than two decimals are rejected, never rounded. Outputs keep full precision and are rounded only in `format.ts`.

The engine mirrors the workbook cell for cell (entry, five-year waterfall with mandatory amortization and cash sweep, shortfall detection, exit, MOIC, IRR, 5×5 partial sensitivity). Documented, intentional differences:

1. Invalid math (sponsor equity ≤ 0, negative exit equity) yields an error flag and no IRR, where Excel's `IFERROR` would show 0.
2. Hold period is locked at 5 (the workbook forecasts and exits in Year 5).
3. Added, labeled extensions: value-creation bridge, break-even multiples, mechanical stress flexes, full re-underwrite grid.

The workbook's sensitivity grid is **partial** (debt, paydown and exit cash held constant); the UI states this wherever the grid appears.

## Tests

- Reference parity: every returns field, entry sources/uses, all six periods of the cash waterfall for all three cases, the 25-cell grid, tolerance 1e-6.
- Workbook parity: engine vs cached cells for every forecast row; drift check on extracted JSON.
- LibreOffice differential: edited copies of the workbook are fully recalculated headlessly and compared to the engine (changed entry, rollover, synergies, debt-cap binding, funding shortfall). Skipped only if LibreOffice is not installed.
- Data: exactly 30 unique companies, https sources, evidence rows, no sale/contact/financial claims, strict schemas, scores/labels vs workbook.
- Browser: all routes, navigation, URL filters, sorting every column, CSV export, keyboard, 404s, mobile overflow, axe (WCAG 2 A/AA), downloads byte-equal by SHA-256.

## Deployment

`npm run build` produces a static site (SSG). Deploy with `vercel` or any Node host. No environment variables or API keys. Not deployed from this repo unless stated in the delivery report.

## Limits

No licensing, ownership or financial verification exists for any company. The model excludes tax basis step-up, working-capital peg, purchase accounting, indemnities, revolver draws and equity cures; returns are gross.

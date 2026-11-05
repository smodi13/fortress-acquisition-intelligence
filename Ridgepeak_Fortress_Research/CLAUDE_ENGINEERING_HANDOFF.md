# Fortress Acquisition Intelligence | Engineering specification

**As of:** November 4, 2026  
**Client context:** Independent Ridgepeak Partners Investment Analyst application sample  
**Engineering owner:** Claude Code  
**Investment research, underwriting assumptions, investment decisions, deal writing owner:** ChatGPT  
**Priority:** Finance/source parity before visual polish.

## 1. Scope and non-negotiables

Build and rigorously test a production-ready, read-only acquisition intelligence website using the supplied completed research and artifacts. This is an independent work sample and not an official Ridgepeak or Fortress product.

Do not fabricate or infer new financial results for any named real company. The valuation simulator is a **separate, unmistakably illustrative** scenario for an unnamed sample acquisition, not an estimate of Woods Comfort Systems or any other candidate. Do not use contact automation or outbound email, and do not imply that any company is seeking a buyer. Prior seller engagement for all companies = NONE. Private financial verification for all = NONE. License and corporate verification = PENDING.

Do not independently rewrite investment opinions, assign new valuation multiples, source additional target companies, invent leadership details, or modify the published investment research. Ask for new sourced investment inputs when needed, or keep the relevant field unknown. Software engineering only.

All numerical **assumptions** visible and editable to users use a maximum of two decimal places. Outputs may compute internally at full precision and display two decimals. The provided Excel model uses hardcoded numeric entries only for labeled assumptions, sourced facts, screening ratings, and period labels. **All financial outputs are formulas, never hardcoded results.** Retain this principle in exports, imports and UI state.

## 2. Supplied authoritative artifacts

- `screening_pipeline_30.csv`: 30 actual business name and public-information research leads, screening scores (inputs), URLs, caveats.
- `evidence_register.csv`: 30 associated first-party web sources, verification status and seller-intent labels.
- `research_manifest.json`: official sources and status flags.
- `Fortress_Illustrative_Acquisition_Underwriting.xlsx`: source of truth for assumptions, transaction formulas, scenarios, funding and debt schedules.
- `formula_engine_reference_tests.json`: machine-readable scenario and sensitivity model expected output values, full numeric precision.
- `model_formula_audit.json`: XML formula and precision audit.
- `Acquisition_Pipeline_Executive_Brief.pdf`: factual deal sourcing and methodology.
- `Conditional_Investment_Committee_Memorandum.pdf`: investment decision, lead company discussion and conditional recommendation.
- `Transaction_Execution_Playbook.pdf`: simulated owner qualification, LOI framework, diligence tracker and integration plan.

Everything in this packet is reference material, not generated data. Never overwrite primary research data in place. Design a normalization layer and deterministic import validation.

## 3. Information architecture / routes

Use a well-maintained production React framework, modern TypeScript, responsive and accessible design, and a small easily audited calculation engine. Local JSON and CSV are authoritative, no external feeds required for operation.

1. `/` Investment overview: independent-work-sample warning, 30 actual leads, geographic coverage, leading due-diligence questions, linked reference PDFs, data provenance.
2. `/pipeline` Search/sort/filter the 30 companies by market, services, self-reported mix, score and verification status. Persist filter state to URL query params. Correct sorting should work for every visible column. Show research status, not "live deal" stages.
3. `/companies/[id]` Company profile: verbatim sourced facts, clearly labelled self-report, leadership names where disclosed, specific primary-source link, operating fit and warnings. NEVER show estimated company revenue, EBITDA, EV, seller likelihood, sale price or deal stage.
4. `/market` Sector facts with provenance, vintage and cutoff qualifiers. Display Capstone's 2026 YTD figures faithfully. No unsupported claims of live data.
5. `/underwriting` Separate sample transaction simulator with scenario selector, assumptions (max two decimal places), entry EV and sources/uses, five-year financial forecast and debt waterfall, sponsor economics, validation warnings.
6. `/sensitivity` Editable transaction assumptions, entry/exit 5x5 multiple sensitivity, scenario comparison, material model limitations and margin of safety.
7. `/execution` Decision gates, hypothetical LOI topics, diligence tracker and 100-day integration workplan. No active outreach or buyer representation.
8. `/evidence` All 30 first-party sources, company-level research flags, link behavior, reference dates, evidence limitations.
9. `/methodology` Scoring weights, weighting formula, input taxonomy, assumptions-vs-results policy, export methodology, disclaimers and independent status.

Use the company/public data files; no placeholder businesses, fake aggregate financial statistics, invented office maps, made-up reviews, fabricated seller-stage progress or nonsourced competitive data.

## 4. Score engine

For every company, compute a public-research score:

`score = recurring*0.20 + residential*0.30 + austin_adjacency*0.20 + owner_evidence*0.15 + source_confidence*0.15`.

Weights are analyst assumptions that can be edited in the UI, with max two decimal places and a validation that all weights sum exactly to 1.00 within presentation rounding. Rating inputs are sourced analyst judgments from CSV, integer 1..5, not market values.

Labels: score >=4.00 => `High research`; score >=3.50 and <4.00 => `Medium research`; otherwise => `Watchlist`. Use the spreadsheet's logic and thresholds. A research score NEVER implies seller willingness, attractiveness of price, or likelihood of a transaction.

## 5. Financial calculation contract (exact Excel parity)

**Units:** monetary amounts are USD millions, fractional percentage inputs such as 0.18 represent 18.00%. Never silently treat 18.00 as 18.00 rather than 0.18.

**Model active-case default = Base.** The Cases sheet sets growth, margin and exit multiple. Other assumptions are on Deal Inputs. Financial calculations are identical to the workbook. Respect all rounding only for display. The JavaScript finance engine must never use displayed/rounded results to feed new calculations.

Entry:

```
revenue0          = input_baseline_revenue
EBITDA0           = revenue0 * active_case_ebitda_margin
EV0               = EBITDA0 * entry_multiple
original_debt     = min(EBITDA0 * debt_to_ebitda, EV0 * max_debt_pct_ev)
rollover_equity   = EV0 * seller_rollover_pct_ev
transaction_fees  = EV0 * transaction_fees_pct_ev
financing_fees    = original_debt * financing_fees_pct_debt
total_uses        = EV0 + transaction_fees + financing_fees
sponsor_equity    = total_uses - original_debt - rollover_equity
total_sources     = original_debt + rollover_equity + sponsor_equity
sponsor_ownership = sponsor_equity / (sponsor_equity + rollover_equity)
```

Forecast for year `y = 1..5` (or hold period from input):

```
revenue_y         = revenue_previous * (1 + growth)
core_ebitda_y     = revenue_y * active_case_margin
synergies_y       = (y >= synergy_start_year) ? yearly_synergy : 0
total_ebitda_y    = core_ebitda_y + synergies_y
da_y              = revenue_y * depreciation_pct
EBIT_y            = total_ebitda_y - da_y
begin_debt_y      = (y == 1) ? original_debt : previous_ending_debt
interest_y        = begin_debt_y * cash_interest_rate
cash_taxes_y      = max(0, (EBIT_y - interest_y) * tax_rate)
capex_y           = revenue_y * capex_pct
nwc_investment_y  = max(0, revenue_y - revenue_previous) * nwc_pct_incremental_revenue
integration_y     = (y == integration_spend_year) ? integration_cost : 0
free_cash_flow_y  = total_ebitda_y - interest_y - cash_taxes_y - capex_y - nwc_investment_y - integration_y
begin_cash_y      = (y == 1) ? 0 : previous_ending_cash
mandatory_paid_y  = min(begin_debt_y, original_debt*mandatory_amort_pct_original_debt, max(0,free_cash_flow_y+begin_cash_y))
extra_sweep_y     = min(max(0,begin_debt_y-mandatory_paid_y),max(0,free_cash_flow_y+begin_cash_y-mandatory_paid_y))
total_paid_y      = mandatory_paid_y + extra_sweep_y
ending_debt_y     = max(0,begin_debt_y-total_paid_y)
ending_cash_y     = max(0,begin_cash_y+free_cash_flow_y-total_paid_y)
operating_gap_y   = max(0,-(free_cash_flow_y+begin_cash_y))
amort_gap_y       = max(0,min(begin_debt_y,original_debt*mandatory_amort_pct_original_debt)-mandatory_paid_y)
```

Flag any operating or mandatory-amortization shortfall. Funding deficit does not disappear because available cash is floored to zero. Current model does **not** automatically draw revolver financing or fund incremental sponsor equity.

Exit:

```
exit_EV           = year5_total_ebitda * active_case_exit_multiple
exit_equity       = exit_EV - final_debt + final_cash
sponsor_proceeds  = exit_equity * sponsor_ownership
sponsor_MOIC      = sponsor_proceeds / sponsor_equity
sponsor_gross_IRR = sponsor_MOIC ** (1/hold_years) - 1
```

Reject or prominently flag cases with sponsor equity <=0, invalid revenue/growth, funding gaps or invalid return math. Avoid misleading IRRs from impossible transactions.

Sensitivities: vary entry and exit multiples in 0.50x steps from the active case. As documented in the spreadsheet, the currently supplied **partial** sensitivity freezes the active original debt, debt waterfall and ending cash and does not constitute a fully re-underwritten capital structure. Show this limitation at all times. Make no ungrounded claims about real-market multiples.

## 6. Exact acceptance tests

Use `formula_engine_reference_tests.json` as immutable reference expectations. Verify all three cases and every relevant calculated field (entry sources/uses, forecast cash waterfall, returns and base sensitivity grid) to absolute tolerance `1e-6` where applicable. Expected at default inputs:

- Downside sponsor gross IRR `0.17918060472602537`; MOIC `2.2798256539316237`.
- Base sponsor gross IRR `0.2512327404385808`; MOIC `3.066835623486469`.
- Upside sponsor gross IRR `0.3203242168556266`; MOIC `4.012388204835165`.
- Source/use check exactly zero within numerical tolerance, seller+sponsor ownership exactly 1.00, base funding shortfall zero.
- Sensitivity center equals active case IRR.

Add automated tests to catch:

- Fewer/more than exactly 30 data records, duplicate IDs, invalid citation URLs, missing source evidence.
- A company profile with a financial value that has no verified actual financial source.
- Any company labelled for sale, contacted or willing to sell without a supplied and dated record.
- Invalid weights, negative capital stack, zero or negative sponsor investment and wrong percentage normalization.
- Any numeric assumption with more than two displayed decimal places. All user-editable inputs have 0.01 precision in their own display unit and reject longer decimals rather than silently altering them.
- Live model output not matching workbook baseline JSON.
- No data/score row hardcoded directly into JSX components.
- Unknown company route returns a useful 404.
- Filter query parameters and keyboard navigation work.
- Responsive layout without horizontal overflow at mobile widths, sensible table scroll, contrast and visible focus states.
- Exports match dataset and have no formula-filled fabricated financial actuals.

## 7. Data, security and delivery

- Use local typed parsers, schema validation (e.g., Zod), deterministic transforms and no untrusted HTML injection.
- Do not use external analytics requiring consent, trackers, secrets or server-to-server scrapers. No authentication necessary for read-only demonstration.
- Never expose credentials or fabricate connected sources. No contact automation or bulk outreach.
- Include source URLs on individual company pages and in exported CSV.
- Include download links for the exact supplied investment PDFs, Excel workbook and the two CSVs.
- Add a disclosure banner that remains readable: `Independent applicant work sample. Not affiliated with Ridgepeak Partners or Fortress Service Partners. Company data is public and unverified. Financial case is illustrative.`
- Use clear, polished institutional visual design with white/light neutral background, navy/teal accents, disciplined typography, dense but navigable data tables.
- README with exact commands, architecture, input provenance, formula contract, tests, deployment guide and no affiliation disclaimer.
- Run formatting, linting, TypeScript compile, unit tests, a production build and browser e2e tests. Fix failures, do not skip or suppress.
- Deploy only if user credentials are available and authorized. If unavailable, deliver locally without false claims of deployment.

## 8. Output and final engineering report

Report exactly: (1) architecture, (2) routes, (3) data count and evidence status, (4) base/downside/upside model results, (5) formula parity result and number of assertions, (6) mobile/accessibility test results, (7) download checks, (8) build/test failures and resolutions, (9) repo/deployment status, (10) remaining factual data gaps.

**Acceptance principle:** Do not trade financial correctness and sourcing integrity for a polished dashboard or a higher test count.

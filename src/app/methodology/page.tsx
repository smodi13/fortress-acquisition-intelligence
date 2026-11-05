import type { Metadata } from "next";
import { Downloads } from "@/components/Downloads";
import { Callout, PageHead, Tag } from "@/components/ui";
import { THRESHOLDS, WEIGHT_KEYS, WEIGHT_LABELS, defaultWeights } from "@/lib/research/score";
import { fromStored } from "@/lib/finance/inputs";
import { DISCLAIMER } from "@/data/narrative";

export const metadata: Metadata = { title: "Methodology" };
const w = defaultWeights();

const CONTRACT = `revenue0          = baseline_revenue
EBITDA0           = revenue0 × case_margin
EV0               = EBITDA0 × entry_multiple
original_debt     = MIN(EBITDA0 × debt_to_EBITDA, EV0 × max_debt_pct_EV)
rollover_equity   = EV0 × rollover_pct
transaction_fees  = EV0 × txn_fee_pct         financing_fees = debt × fin_fee_pct
total_uses        = EV0 + transaction_fees + financing_fees
sponsor_equity    = total_uses − original_debt − rollover_equity
sponsor_ownership = sponsor_equity ÷ (sponsor_equity + rollover_equity)

year y = 1..5
revenue_y         = revenue_(y−1) × (1 + growth)
total_EBITDA_y    = revenue_y × margin + (y ≥ synergy_start ? synergy : 0)
EBIT_y            = total_EBITDA_y − revenue_y × depreciation_pct
interest_y        = beginning_debt_y × interest_rate
cash_taxes_y      = MAX(0, (EBIT_y − interest_y) × tax_rate)
FCF_y             = EBITDA − interest − taxes − capex − ΔNWC − integration
mandatory_y       = MIN(beginning_debt, original_debt × amort_pct, MAX(0, FCF_y + beginning_cash))
sweep_y           = MIN(MAX(0, beginning_debt − mandatory), MAX(0, FCF_y + beginning_cash − mandatory))
ending_debt_y     = MAX(0, beginning_debt − mandatory − sweep)
ending_cash_y     = MAX(0, beginning_cash + FCF_y − mandatory − sweep)
shortfall_y       = MAX(0, −(FCF_y + beginning_cash)) + unpaid mandatory amortization

exit_EV           = year5_total_EBITDA × exit_multiple
exit_equity       = exit_EV − ending_debt + ending_cash
sponsor_proceeds  = exit_equity × sponsor_ownership
MOIC              = sponsor_proceeds ÷ sponsor_equity
gross IRR         = MOIC^(1 ÷ hold_years) − 1`;

export default function Methodology() {
  return (
    <>
      <PageHead title="Methodology">
        <p>
          How the research is scored, how the illustrative model is calculated, and how the data is kept
          honest.
        </p>
      </PageHead>
      <Callout kind="info">
        <strong>Independent status.</strong> {DISCLAIMER}
      </Callout>

      <section className="card" aria-labelledby="h-prov">
        <h2 id="h-prov">Provenance taxonomy</h2>
        <ul className="clean">
          <li>
            <Tag kind="fact" /> Information from a cited public source, shown as the source states it.
          </li>
          <li>
            <Tag kind="self" /> Statements a company makes about itself (ownership, history, services).
            Unverified.
          </li>
          <li>
            <Tag kind="judg" /> Analyst ratings and notes (1–5 scales, caveats). Judgments, not measurements.
          </li>
          <li>
            <Tag kind="assm" /> Editable financial inputs for the illustrative transaction. Not market quotes.
          </li>
          <li>
            <Tag kind="calc" /> Values computed by the engine from assumptions. Never typed in.
          </li>
          <li>
            <Tag kind="unk" /> Information that is not known; displayed as unknown, never estimated.
          </li>
        </ul>
      </section>

      <section className="card" style={{ marginTop: "1rem" }} aria-labelledby="h-score">
        <h2 id="h-score">Research score</h2>
        <p>
          <code>
            score = recurring×{fromStored("pct", w.recurring).toFixed(2)} + residential×
            {fromStored("pct", w.residential).toFixed(2)} + austin×{fromStored("pct", w.austin).toFixed(2)} +
            owner×{fromStored("pct", w.owner).toFixed(2)} + source_confidence×
            {fromStored("pct", w.sourceConfidence).toFixed(2)}
          </code>
        </p>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
          <table>
            <thead>
              <tr>
                <th>Criterion</th>
                <th className="num">Weight</th>
              </tr>
            </thead>
            <tbody>
              {WEIGHT_KEYS.map((k) => (
                <tr key={k}>
                  <th scope="row">{WEIGHT_LABELS[k]}</th>
                  <td className="num">{(fromStored("pct", w[k]) * 100).toFixed(2)}%</td>
                </tr>
              ))}
              <tr className="total">
                <th scope="row">Total</th>
                <td className="num">100.00%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: ".75rem" }}>
          Labels: ≥ {THRESHOLDS.high.toFixed(2)} <strong>High research</strong>; ≥{" "}
          {THRESHOLDS.medium.toFixed(2)} and &lt; {THRESHOLDS.high.toFixed(2)}{" "}
          <strong>Medium research</strong>; otherwise <strong>Watchlist</strong>. Weights are analyst
          assumptions, editable on the Pipeline page (two decimals; must total exactly 100.00%). Ratings are
          integers 1–5 from the supplied CSV. A threshold comparison tolerates 1e-9 so floating-point noise
          cannot flip a label.
        </p>
        <p>
          <strong>
            A research score never implies seller willingness, price attractiveness or likelihood of a
            transaction.
          </strong>{" "}
          Equal scores share a rank.
        </p>
        <p className="small muted">
          Market normalization: the free-text market field maps deterministically to four metros (Austin /
          Central Texas, San Antonio, Dallas–Fort Worth, Houston) for filtering only.
        </p>
      </section>

      <section className="card" style={{ marginTop: "1rem" }} aria-labelledby="h-fin">
        <h2 id="h-fin">Financial engine</h2>
        <p>
          The Excel workbook is the financial source of truth (291 formulas; no calculated output is
          hardcoded). The TypeScript engine reproduces its logic exactly. USD millions; percentages are
          fractions internally (0.18 = 18.00%) and entered in display units (18.00).
        </p>
        <pre className="formula-block" tabIndex={0} aria-label="Calculation contract">
          {CONTRACT}
        </pre>
        <h3>Policies</h3>
        <ul>
          <li>
            <strong>Assumptions vs. results.</strong> Only labeled assumptions and sourced facts are typed
            values. Outputs, tables, charts and sensitivities are calculated at full precision and rounded for
            display only; rounded values are never reused.
          </li>
          <li>
            <strong>Two-decimal rule.</strong> Inputs with more than two decimals (in their displayed unit)
            are rejected with an error, never silently rounded. Whole years are integers.
          </li>
          <li>
            <strong>No revolver or equity cure.</strong> Funding gaps are flagged, not financed. Cash is
            floored at zero but the deficit is retained in the shortfall lines.
          </li>
          <li>
            <strong>Invalid math.</strong> Non-positive sponsor equity or negative exit equity yields an error
            flag and no IRR (the workbook would show 0). Impossible transactions never display a misleading
            return.
          </li>
          <li>
            <strong>Hold period</strong> is locked at 5 years because the workbook forecasts and exits in Year
            5.
          </li>
          <li>
            <strong>Sensitivity limitation.</strong> The workbook grid varies entry and exit multiples only
            and holds debt sizing, debt paydown and exit cash constant at the active case. It is a partial
            valuation sensitivity, not a full re-underwrite. The Scenarios page also reports a full re-run of
            the model at each entry multiple so the difference is visible.
          </li>
          <li>
            <strong>Simplifications</strong> inherited from the workbook: no tax basis step-up,
            working-capital peg, purchase accounting or indemnities; gross returns before fees, carry and
            investor-level taxes.
          </li>
          <li>
            <strong>Not in the workbook</strong> (added by this application, labeled as such): value-creation
            bridge, break-even multiples and mechanical stress flexes. They are arithmetic on engine outputs.
          </li>
        </ul>
        <h3>Verification</h3>
        <p>
          Automated tests compare every forecast row and period, entry sources and uses, returns and the 5×5
          grid against the reference JSON and the workbook’s cached cells (tolerance 1e-6), and re-run
          LibreOffice full recalculations of edited copies of the workbook against the engine.
        </p>
      </section>

      <section className="card" style={{ marginTop: "1rem" }} aria-labelledby="h-exp">
        <h2 id="h-exp">Data and exports</h2>
        <ul>
          <li>
            Data is read from the supplied CSV, JSON and workbook files at build time, validated with Zod
            schemas (strict: unknown columns are rejected) and checked for exactly 30 unique companies,
            matching evidence rows, https sources, and no sale/contact/financial claims.
          </li>
          <li>
            The six downloads are byte-for-byte copies of the supplied files, verified by SHA-256 at build
            time and in tests. The Pipeline CSV export is a view of the same dataset with calculated scores
            and source URLs; it contains no company financial values.
          </li>
          <li>No analytics, trackers, API keys or outbound calls. No contact automation.</li>
        </ul>
        <Downloads />
      </section>
    </>
  );
}

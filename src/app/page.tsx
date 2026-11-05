import Link from "next/link";
import { Downloads } from "@/components/Downloads";
import { Callout, ExtLink, Kpi, PageHead, Tag } from "@/components/ui";
import { decisionSought, recommendation, risks, thesis } from "@/data/narrative";
import { fmtPct, fmtUsd, fmtX } from "@/lib/finance/format";
import { runModel } from "@/lib/finance/engine";
import { defaultState, stateToInputs } from "@/lib/finance/inputs";
import { SCENARIOS } from "@/lib/finance/types";
import { loadDataset } from "@/lib/research/load";
import { scoredDefault } from "@/lib/research/summary";
import { NEXT_RESEARCH_STEPS } from "@/lib/research/flags";
import { OUTREACH_LABEL, STANCE_LABEL, outreachOf } from "@/lib/research/stance";

export default function Overview() {
  const { companies } = loadDataset();
  const ranked = scoredDefault(companies);
  const rows = ranked.map((r) => ({ ...r, outreach: outreachOf(r.stance, r.label) }));
  const top = rows.slice(0, 12);
  const findings = companies.filter((c) => c.stanceFinding);
  const shortlist = rows.filter((r) => r.outreach === "SHORTLIST").length;
  const excluded = rows.filter((r) => r.outreach === "EXCLUDED").length;
  const queue = rows.filter((r) => r.outreach !== "EXCLUDED").slice(0, 5);
  const runs = SCENARIOS.map((s) => runModel(stateToInputs(defaultState(), s)));
  const withPrimary = companies.filter((c) => c.sourceUrl.startsWith("https://")).length;
  const firstPartyOnly = companies.filter((c) =>
    /^First-party only/i.test(c.evidence.verification_status),
  ).length;

  return (
    <>
      <PageHead title="Texas Residential Services: Acquisition Intelligence">
        <p>
          Independent public-information research on {companies.length} Texas HVAC, plumbing and electrical
          operators, plus a clearly separate illustrative transaction model. Prepared for the Investment
          Analyst role at Ridgepeak Partners, informed by public information on Fortress Service Partners. As
          of November 4, 2026.
        </p>
      </PageHead>

      <Callout kind="warn">
        <strong>Status: research only.</strong> No company has been contacted. No company has been verified as
        being for sale. No historical financial statements are available for any company. A research score is
        never a view on seller willingness, valuation, or likelihood of a transaction.
      </Callout>

      <section aria-labelledby="h-kpi" className="grid g4">
        <h2 id="h-kpi" className="sr-only">
          Research scope
        </h2>
        <Kpi
          label="Researched companies"
          value={companies.length}
          sub="Public, first-party sources"
          kind="fact"
        />
        <Kpi
          label="Immediate outreach shortlist"
          value={shortlist}
          sub={`Readiness not established; ${excluded} publicly opposed, excluded`}
          kind="judg"
        />
        <Kpi label="Financials verified" value={0} sub="Revenue and EBITDA unknown for all" kind="unk" />
        <Kpi label="Licenses verified" value={0} sub="TDLR / TSBPE checks pending" kind="unk" />
      </section>

      <section className="card" aria-labelledby="h-decision" style={{ marginTop: "1rem" }}>
        <h2 id="h-decision">Decision summary</h2>
        <p>
          {companies.length} businesses were researched and ranked on <strong>strategic fit</strong>. Fit is
          not transaction readiness: no company has been contacted or verified as a seller, and{" "}
          {findings.length} have public statements about ownership (below). Treat the ranking as a
          qualification queue, not a list of actionable targets.
        </p>
        <p className="small muted">
          {recommendation.value}{" "}
          <span className="src">
            ({recommendation.source}, p.{recommendation.page})
          </span>
        </p>
      </section>

      <section className="card" aria-labelledby="h-top" style={{ marginTop: "1rem" }}>
        <h2 id="h-top">Strategic-fit ranking (top 12 of {companies.length})</h2>
        <p className="small muted">
          Score (1–5) from analyst ratings and the Methodology weights. Ties share a rank. Outreach status is
          separate from fit.
        </p>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Top ranked research candidates">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Company</th>
                <th>Market</th>
                <th className="num">Score</th>
                <th>Strategic fit</th>
                <th>Public owner stance</th>
                <th>Outreach status</th>
              </tr>
            </thead>
            <tbody>
              {top.map((c) => (
                <tr key={c.id}>
                  <td className="num">{c.rank}</td>
                  <td>
                    <Link href={`/companies/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>{c.market}</td>
                  <td className="num">{c.score.toFixed(2)}</td>
                  <td>
                    <span
                      className={`pill ${c.label === "High research" ? "high" : c.label === "Medium research" ? "med" : "watch"}`}
                    >
                      {c.label}
                    </span>
                  </td>
                  <td>{STANCE_LABEL[c.stance]}</td>
                  <td>
                    <span className={`pill ${c.outreach === "EXCLUDED" ? "bad" : "watch"}`}>
                      {OUTREACH_LABEL[c.outreach]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: ".75rem" }}>
          <Link href="/pipeline">Explore all {companies.length} companies →</Link>
        </p>
      </section>

      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <section className="card" aria-labelledby="h-stance">
          <h2 id="h-stance">Public owner-stance findings</h2>
          <ul className="clean">
            {findings.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>: {STANCE_LABEL[c.stance]}. <Tag kind="self" />{" "}
                <a href={c.stanceFinding!.sourceUrl} target="_blank" rel="noopener noreferrer">
                  source<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <span className="src"> · accessed {c.stanceFinding!.accessedDate}</span>
              </li>
            ))}
          </ul>
          <p className="src">
            Company self-reports, not independently verified. Excluded from the immediate outreach shortlist;
            scores unchanged. No stance is inferred for the other {companies.length - findings.length}.
          </p>
        </section>

        <section className="card" aria-labelledby="h-gaps">
          <h2 id="h-gaps">Verification gaps</h2>
          <ul className="clean">
            <li>
              Company financials verified: <strong>0 of {companies.length}</strong>
            </li>
            <li>
              Independent license and ownership checks: <strong>0 of {companies.length}</strong> (first-party
              only: {firstPartyOnly})
            </li>
            <li>
              Ownership characteristics (family-owned, not PE-backed; self-reported):{" "}
              <strong>
                {companies.filter((c) => c.ownership).length} of {companies.length}
              </strong>
            </li>
            <li>
              Owner stance assessed:{" "}
              <strong>
                {findings.length} of {companies.length}
              </strong>
            </li>
            <li>
              Seller intent: <strong>unknown for all {companies.length}</strong>
            </li>
          </ul>
        </section>
      </div>

      <section className="card" aria-labelledby="h-next" style={{ marginTop: "1rem" }}>
        <h2 id="h-next">Next-diligence priorities</h2>
        <p>
          First verify ownership and stance for the highest-fit companies not publicly opposed:{" "}
          {queue.map((q, i) => (
            <span key={q.id}>
              {i > 0 && ", "}
              <Link href={`/companies/${q.id}`}>{q.name}</Link>
            </span>
          ))}
          .
        </p>
        <ol>
          {NEXT_RESEARCH_STEPS.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ol>
      </section>

      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <section className="card" aria-labelledby="h-risks">
          <h2 id="h-risks">Important investment risks</h2>
          <ul className="clean">
            {risks.map((r) => (
              <li key={r.value}>
                {r.value}{" "}
                <span className="src">
                  ({r.source}, p.{r.page})
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="h-case">
          <h2 id="h-case">Illustrative underwriting case summary</h2>
          <Callout kind="warn">
            <strong>Illustrative underwriting, not company-specific financials.</strong> Hypothetical
            $8.00mm-revenue sample acquisition; no identified company’s revenue or EBITDA is known.{" "}
            <Tag kind="calc" /> outputs below are calculated live by the engine from workbook assumptions.
          </Callout>
          <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
            <table>
              <caption className="sr-only">Scenario returns</caption>
              <thead>
                <tr>
                  <th>Case</th>
                  <th className="num">Entry EV ($mm)</th>
                  <th className="num">Exit multiple</th>
                  <th className="num">MOIC</th>
                  <th className="num">Gross IRR</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((m) => (
                  <tr key={m.scenario}>
                    <th scope="row">{m.scenario}</th>
                    <td className="num">{fmtUsd(m.entry.enterpriseValue)}</td>
                    <td className="num">{fmtX(m.returns.exitMultiple)}</td>
                    <td className="num">{fmtX(m.returns.moic)}</td>
                    <td className="num">{fmtPct(m.returns.irr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: ".5rem" }}>
            Illustrative target gross IRR {fmtPct(runs[1]!.returns.targetIrr)}: base case{" "}
            {runs[1]!.returns.status.toLowerCase()} by {fmtPct(runs[1]!.returns.irrSurplus)} points. Margin is
            thin. <Link href="/underwriting">Open the model →</Link>
          </p>
        </section>
      </div>

      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <section className="card" aria-labelledby="h-cov">
          <h2 id="h-cov">Source evidence coverage</h2>
          <ul className="clean">
            <li>
              Primary-source links:{" "}
              <strong>
                {withPrimary} of {companies.length}
              </strong>{" "}
              <Tag kind="fact" />
            </li>
            <li>
              Evidence status “first-party only”:{" "}
              <strong>
                {firstPartyOnly} of {companies.length}
              </strong>
              . Independent license and ownership checks outstanding for all.
            </li>
            <li>
              Verified historical revenue or EBITDA: <strong>0 of {companies.length}</strong>
            </li>
            <li>
              Seller intent: <strong>unknown for all {companies.length}</strong>; do not infer willingness to
              sell
            </li>
          </ul>
          <p>
            <Link href="/evidence">Open the evidence register →</Link>
          </p>
        </section>
        <section className="card" aria-labelledby="h-dl">
          <h2 id="h-dl">Research work products</h2>
          <Downloads />
          <p className="small muted">
            Source:{" "}
            <ExtLink href="https://www.fortressservicepartners.com/">Fortress Service Partners</ExtLink>{" "}
            (public website).
          </p>
        </section>
      </div>
    </>
  );
}

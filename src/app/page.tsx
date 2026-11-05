import Link from "next/link";
import { Downloads } from "@/components/Downloads";
import { Callout, ExtLink, Kpi, PageHead, Tag } from "@/components/ui";
import { decisionSought, recommendation, risks, thesis } from "@/data/narrative";
import { fmtPct, fmtUsd, fmtX } from "@/lib/finance/format";
import { runModel } from "@/lib/finance/engine";
import { defaultState, stateToInputs } from "@/lib/finance/inputs";
import { SCENARIOS } from "@/lib/finance/types";
import { loadDataset } from "@/lib/research/load";
import { countBy, metroCounts, scoredDefault } from "@/lib/research/summary";

export default function Overview() {
  const { companies } = loadDataset();
  const ranked = scoredDefault(companies);
  const cut = ranked[11]!.score;
  const top = ranked.filter((r) => Math.round((r.score - cut) * 1e9) >= 0);
  const metros = metroCounts(companies);
  const services = countBy(companies, (c) => c.services);
  const labels = countBy(ranked, (c) => [c.label]);
  const runs = SCENARIOS.map((s) => runModel(stateToInputs(defaultState(), s)));
  const withPrimary = companies.filter((c) => c.sourceUrl.startsWith("https://")).length;
  const firstPartyOnly = companies.filter((c) =>
    /^First-party only/i.test(c.evidence.verification_status),
  ).length;
  const max = Math.max(...metros.map(([, n]) => n));

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
        <Kpi label="Contacted" value={0} sub="No outreach performed" kind="fact" />
        <Kpi label="Financials verified" value={0} sub="Revenue and EBITDA unknown for all" kind="unk" />
        <Kpi label="Licenses verified" value={0} sub="TDLR / TSBPE checks pending" kind="unk" />
      </section>

      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <section className="card" aria-labelledby="h-thesis">
          <h2 id="h-thesis">Investment thesis</h2>
          <ul className="clean">
            {thesis.map((t) => (
              <li key={t.value}>
                {t.value}{" "}
                <span className="src">
                  ({t.source}, p.{t.page})
                </span>
              </li>
            ))}
          </ul>
          <h3 style={{ marginTop: "1rem" }}>Current recommendation</h3>
          <p>{recommendation.value}</p>
          <p className="src">
            {recommendation.source}, p.{recommendation.page}. <Tag kind="judg" /> {decisionSought.value}
          </p>
        </section>

        <section className="card" aria-labelledby="h-scope">
          <h2 id="h-scope">Research scope and market mix</h2>
          <p className="small muted">
            Geographic mix of the {companies.length} leads (normalized from the source market field).{" "}
            <Tag kind="fact" />
          </p>
          {metros.map(([m, n]) => (
            <div key={m} style={{ marginBottom: ".5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{m}</span>
                <strong className="num">{n}</strong>
              </div>
              <div className="bar" aria-hidden="true">
                <i style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </div>
          ))}
          <h3 style={{ marginTop: "1rem" }}>Service mix (companies offering each trade)</h3>
          <div className="chips">
            {services.map(([s, n]) => (
              <span key={s} className="pill watch">
                {s} · {n}
              </span>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: ".75rem" }}>
            Research priority at default weights: {labels.map(([l, n]) => `${n} ${l}`).join(" · ")}.{" "}
            <Tag kind="judg" />
          </p>
        </section>
      </div>

      <section className="card" aria-labelledby="h-top" style={{ marginTop: "1rem" }}>
        <h2 id="h-top">Highest-ranked research candidates</h2>
        <p className="small muted">
          Public-information research score (1–5) from analyst ratings and the weights on the Methodology
          page. Ties share a rank.{" "}
          {top.length > 12 &&
            `The Executive Brief lists 12; ${top.length} companies share scores at or above the 12th-place score.`}
        </p>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Top ranked research candidates">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Company</th>
                <th>Market</th>
                <th>Services</th>
                <th className="num">Score</th>
                <th>Research priority</th>
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
                  <td>{c.services.join(", ")}</td>
                  <td className="num">{c.score.toFixed(2)}</td>
                  <td>
                    <span
                      className={`pill ${c.label === "High research" ? "high" : c.label === "Medium research" ? "med" : "watch"}`}
                    >
                      {c.label}
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
            Hypothetical $8.00mm-revenue sample acquisition. Not an estimate for any identified company.{" "}
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

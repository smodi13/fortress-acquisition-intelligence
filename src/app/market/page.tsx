import type { Metadata } from "next";
import { Callout, ExtLink, PageHead, Tag } from "@/components/ui";
import market from "@/data/market-sources.json";
import { sectorPerspective } from "@/data/narrative";
import { loadDataset } from "@/lib/research/load";
import { countBy, metroCounts } from "@/lib/research/summary";

export const metadata: Metadata = { title: "Market Intelligence" };

export default function Market() {
  const { companies, manifest } = loadDataset();
  const metros = metroCounts(companies);
  const mixes = countBy(companies, (c) => [c.businessMix]);
  const capstone = market.rows.filter((r) => r.url.includes("capstonepartners"));
  const other = market.rows.filter((r) => !r.url.includes("capstonepartners"));
  return (
    <>
      <PageHead title="Market Intelligence">
        <p>
          Sector facts with provenance, vintage and cutoff qualifiers. Nothing on this page is a live feed;
          every figure is a dated statement from a cited public source.
        </p>
      </PageHead>

      <section className="card" aria-labelledby="h-cap">
        <h2 id="h-cap">Residential services M&A: Capstone Partners (October 2026)</h2>
        <Callout kind="info">
          Capstone figures are <strong>year-to-date as of the report’s dataset cutoff</strong>, not full-year
          totals, and cover only the transactions in Capstone’s own coverage. They are shown as reported.{" "}
          <Tag kind="fact" />
        </Callout>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Reported statement</th>
                <th>Reference date</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {capstone.map((r) => (
                <tr key={r.topic}>
                  <th scope="row">{r.topic}</th>
                  <td>{r.statement}</td>
                  <td className="num">{r.referenceDate}</td>
                  <td>
                    <ExtLink href={r.url}>Capstone report</ExtLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: "1rem" }} aria-labelledby="h-ctx">
        <h2 id="h-ctx">Context sources</h2>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Sourced statement</th>
                <th>Reference date</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {other.map((r) => (
                <tr key={r.topic}>
                  <th scope="row">{r.topic}</th>
                  <td>{r.statement}</td>
                  <td className="num">{r.referenceDate}</td>
                  <td>
                    <ExtLink href={r.url}>Open</ExtLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Registry rows are research sources only. Target-level license matching has not been completed.
        </p>
      </section>

      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <section className="card" aria-labelledby="h-sec">
          <h2 id="h-sec">Sector perspective</h2>
          <ul className="clean">
            {sectorPerspective.map((s) => (
              <li key={s.value}>
                {s.value}{" "}
                <span className="src">
                  ({s.source}, p.{s.page})
                </span>
              </li>
            ))}
          </ul>
          <p className="small muted">
            Analyst perspective <Tag kind="judg" />, not market data.
          </p>
        </section>
        <section className="card" aria-labelledby="h-cov">
          <h2 id="h-cov">Research coverage of the {companies.length} leads</h2>
          <p className="small muted">Counts of researched companies, not market-size estimates.</p>
          <ul className="clean">
            {metros.map(([m, n]) => (
              <li key={m}>
                {m}: <strong>{n}</strong>
              </li>
            ))}
          </ul>
          <h3>Self-reported business mix</h3>
          <ul className="clean">
            {mixes.map(([m, n]) => (
              <li key={m}>
                {m}: <strong>{n}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="small muted" style={{ marginTop: "1rem" }}>
        Research package status: {manifest.status}. {manifest.compliance}
      </p>
    </>
  );
}

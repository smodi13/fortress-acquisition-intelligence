import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, ExtLink, Kpi, PageHead, Tag } from "@/components/ui";
import { dataFlags, NEXT_RESEARCH_STEPS, STANDARD_MISSING_INFORMATION } from "@/lib/research/flags";
import { loadDataset } from "@/lib/research/load";
import { WEIGHT_KEYS, WEIGHT_LABELS, defaultWeights, labelOf, score } from "@/lib/research/score";
import { scoredDefault } from "@/lib/research/summary";
import { fromStored } from "@/lib/finance/inputs";
import { OUTREACH_LABEL, STANCE_LABEL, outreachOf } from "@/lib/research/stance";

export const dynamicParams = false;
export function generateStaticParams() {
  return loadDataset().companies.map((c) => ({ id: c.id }));
}
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = loadDataset().companies.find((x) => x.id === id);
  return { title: c ? c.name : "Company not found" };
}

const AS_OF_YEAR = 2026;

export default async function CompanyPage({ params }: Props) {
  const { id } = await params;
  const { companies } = loadDataset();
  const idx = companies.findIndex((x) => x.id === id);
  if (idx < 0) notFound();
  const c = companies[idx]!;
  const w = defaultWeights();
  const s = score(c.ratings, w);
  const label = labelOf(s);
  const rank = scoredDefault(companies).find((r) => r.id === c.id)!.rank;
  const flags = dataFlags(c);
  const outreach = outreachOf(c.stance, label);
  const sf = c.stanceFinding;
  const prev = companies[idx - 1];
  const next = companies[idx + 1];
  const years = c.foundedYear === null ? null : AS_OF_YEAR - c.foundedYear;

  return (
    <>
      <p className="small">
        <Link href="/pipeline">← Pipeline</Link>
      </p>
      <PageHead title={c.name}>
        <p>
          {c.id} · {c.market} · {c.services.join(", ")}
        </p>
      </PageHead>

      <Callout kind="warn">
        <strong>Uncontacted research lead.</strong> Not verified as being for sale. No financial statements
        are available. Everything below comes from the company’s own public webpage unless labelled otherwise.
      </Callout>

      <div className="grid g4">
        <Kpi
          label="Strategic-fit score"
          value={s.toFixed(2)}
          sub={`of 5.00 · rank ${rank} of ${companies.length}`}
          kind="judg"
        />
        <Kpi label="Strategic fit" value={label} sub="Not a view on willingness to sell" kind="judg" />
        <Kpi
          label="Operating since"
          value={c.foundedYear ?? "Unknown"}
          sub={years === null ? "Founding year not stated in source" : `≈ ${years} years (self-reported)`}
          kind={c.foundedYear ? "self" : "unk"}
        />
        <Kpi label="Seller engagement" value="None" sub="Not contacted" kind="fact" />
      </div>

      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <section className="card" aria-labelledby="h-facts">
          <h2 id="h-facts">Publicly sourced description</h2>
          <dl className="grid" style={{ gap: ".6rem", margin: 0 }}>
            <div>
              <dt className="small muted">
                Geography <Tag kind="self" />
              </dt>
              <dd style={{ margin: 0 }}>{c.market}</dd>
            </div>
            <div>
              <dt className="small muted">
                Publicly described services <Tag kind="self" />
              </dt>
              <dd style={{ margin: 0 }}>{c.services.join(", ")}</dd>
            </div>
            <div>
              <dt className="small muted">
                Business mix <Tag kind="self" />
              </dt>
              <dd style={{ margin: 0 }}>{c.businessMix}</dd>
            </div>
            <div>
              <dt className="small muted">
                Publicly identified leadership <Tag kind="self" />
              </dt>
              <dd style={{ margin: 0 }}>{c.leadership}</dd>
            </div>
            <div>
              <dt className="small muted">
                Ownership description <Tag kind="self" />
              </dt>
              <dd style={{ margin: 0 }}>{c.ownershipClaim}</dd>
            </div>
            <div>
              <dt className="small muted">Primary source (first-party)</dt>
              <dd style={{ margin: 0 }}>
                <ExtLink href={c.sourceUrl}>{c.sourceUrl}</ExtLink>
                <div className="src">
                  {c.evidence.evidence_id} · accessed {c.evidence.accessed_date} · {c.evidence.source_type}
                </div>
              </dd>
            </div>
          </dl>
        </section>

        <section className="card" aria-labelledby="h-unknown">
          <h2 id="h-unknown">Financial and transaction facts</h2>
          <p className="small muted">
            No verified financial source exists for this company, so no value is shown.
          </p>
          <table>
            <tbody>
              {[
                ["Revenue", "Unknown"],
                ["EBITDA", "Unknown"],
                ["Valuation / enterprise value", "Unknown"],
                ["Seller asking price", "Unknown"],
                ["Seller willingness to transact", "Unknown. Do not infer"],
                ["Owner conversations", "None"],
                ["LOI / transaction", "None"],
                ["License verification (TDLR / TSBPE)", "Pending"],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>
                    <Tag kind="unk">{v}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="src" style={{ marginTop: ".5rem" }}>
            {c.evidence.financial_disclosure}. {c.evidence.seller_intent}.
          </p>
        </section>
      </div>

      <section className="card" aria-labelledby="h-stance" style={{ marginTop: "1rem" }}>
        <h2 id="h-stance">Ownership stance and transaction readiness</h2>
        <p>
          <strong>Public owner stance:</strong>{" "}
          <span className={`pill ${c.stance === "OPPOSED" ? "bad" : "watch"}`}>{STANCE_LABEL[c.stance]}</span>
          {"  "}
          <strong>Outreach status:</strong>{" "}
          <span
            className={`pill ${outreach === "EXCLUDED" ? "bad" : outreach === "SHORTLIST" ? "good" : "watch"}`}
          >
            {OUTREACH_LABEL[outreach]}
          </span>
        </p>
        {sf ? (
          <>
            <p>
              “{sf.statement}” <Tag kind="self" />
            </p>
            <p className="src">
              Source: <ExtLink href={sf.sourceUrl}>{sf.sourceUrl}</ExtLink> · accessed {sf.accessedDate} ·
              company self-reported; not independently verified. This is not a confirmed seller or a confirmed
              non-seller; it is a public statement by the company, kept out of the strategic-fit score.
            </p>
          </>
        ) : (
          <p className="small muted">
            No ownership-stance finding has been supplied for this company. Nothing is inferred about
            transaction receptivity.
          </p>
        )}
        <p className="src">
          Strategic fit ({label}) and transaction readiness are separate. Publicly opposed companies stay in
          the research universe with unchanged scores but are excluded from the immediate outreach shortlist.
        </p>
      </section>

      <section className="card" aria-labelledby="h-fit" style={{ marginTop: "1rem" }}>
        <h2 id="h-fit">
          Research fit assessment <Tag kind="judg" />
        </h2>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
          <table>
            <caption className="sr-only">Score build-up</caption>
            <thead>
              <tr>
                <th>Criterion</th>
                <th className="num">Rating (1–5)</th>
                <th className="num">Weight</th>
                <th className="num">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {WEIGHT_KEYS.map((k) => (
                <tr key={k}>
                  <th scope="row">{WEIGHT_LABELS[k]}</th>
                  <td className="num">{c.ratings[k]}</td>
                  <td className="num">{(fromStored("pct", w[k]) * 100).toFixed(2)}%</td>
                  <td className="num">{(c.ratings[k] * fromStored("pct", w[k])).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="total">
                <th scope="row">Strategic-fit score</th>
                <td />
                <td className="num">100.00%</td>
                <td className="num">{s.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: ".75rem" }}>
          <strong>Analyst note:</strong> {c.note}
        </p>
        <p className="src">
          Ratings are analyst judgments from public information; weights are from the workbook. Score is a
          research-priority screen only.
        </p>
      </section>

      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <section className="card" aria-labelledby="h-cav">
          <h2 id="h-cav">Relevant caveats</h2>
          <ul className="clean">
            <li>{c.note}</li>
            {flags.map((f) => (
              <li key={f.code}>{f.text}</li>
            ))}
            <li>{c.evidence.verification_status}.</li>
          </ul>
        </section>
        <section className="card" aria-labelledby="h-miss">
          <h2 id="h-miss">Missing diligence information</h2>
          <ul className="clean">
            {STANDARD_MISSING_INFORMATION.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card" aria-labelledby="h-next" style={{ marginTop: "1rem" }}>
        <h2 id="h-next">Appropriate next research steps</h2>
        <ol>
          {NEXT_RESEARCH_STEPS.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ol>
        <p className="src">
          From the Acquisition Pipeline Executive Brief (p.3). Generic to all candidates; no company-specific
          plan has been written.
        </p>
      </section>

      <nav
        aria-label="Company navigation"
        style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem", gap: "1rem" }}
      >
        {prev ? <Link href={`/companies/${prev.id}`}>← {prev.name}</Link> : <span />}
        {next ? <Link href={`/companies/${next.id}`}>{next.name} →</Link> : <span />}
      </nav>
    </>
  );
}

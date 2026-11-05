import type { Metadata } from "next";
import { Callout, ExtLink, PageHead, Tag } from "@/components/ui";
import { STANCE_LABEL } from "@/lib/research/stance";
import { loadDataset } from "@/lib/research/load";
import { countBy } from "@/lib/research/summary";
import { EvidenceClient } from "./EvidenceClient";

export const metadata: Metadata = { title: "Evidence Register" };

export default function Evidence() {
  const { companies, manifest } = loadDataset();
  const status = countBy(companies, (c) => [c.evidence.verification_status]);
  const fin = countBy(companies, (c) => [c.evidence.financial_disclosure]);
  const intent = countBy(companies, (c) => [c.evidence.seller_intent]);
  const dates = [...new Set(companies.map((c) => c.evidence.accessed_date))];
  return (
    <>
      <PageHead title="Evidence Register">
        <p>
          One first-party source per company, with exactly what has and has not been verified. Sources were
          accessed on {dates.join(", ")}; links are not re-checked live by this site and may change.
        </p>
      </PageHead>

      <div className="grid g3">
        <section className="card">
          <h2>Verification status</h2>
          <ul className="clean">
            {status.map(([s, n]) => (
              <li key={s}>
                <strong>{n}</strong> · {s}
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Financial disclosure</h2>
          <ul className="clean">
            {fin.map(([s, n]) => (
              <li key={s}>
                <strong>{n}</strong> · {s}
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Seller intent</h2>
          <ul className="clean">
            {intent.map(([s, n]) => (
              <li key={s}>
                <strong>{n}</strong> · {s}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Callout kind="info">
        <strong>Evidence limitations.</strong> Each source is the company’s own website (self-report). TDLR
        and TSBPE license matching, entity and ownership checks, and all financial verification are
        outstanding. Company web pages can change after the access date.
      </Callout>

      <EvidenceClient companies={companies} />

      <section className="card" style={{ marginTop: "1rem" }} aria-labelledby="h-stance">
        <h2 id="h-stance">Analyst-supplied ownership-stance statements</h2>
        <p className="small muted">
          Separate from the evidence register above, which is unchanged. Each is a company self-report
          <Tag kind="self" />, not independently verified, and not a confirmed seller or non-seller.
        </p>
        <ul className="clean">
          {companies
            .filter((c) => c.stanceFinding)
            .map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong> ({c.id}): {STANCE_LABEL[c.stance]}. “{c.stanceFinding!.statement}”{" "}
                <ExtLink href={c.stanceFinding!.sourceUrl}>{c.stanceFinding!.sourceUrl}</ExtLink>
                <span className="src"> · accessed {c.stanceFinding!.accessedDate}</span>
              </li>
            ))}
        </ul>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Reference sources</h2>
        <ul className="clean">
          {Object.entries(manifest.source_docs).map(([k, u]) => (
            <li key={k}>
              {k.replace(/_/g, " ")}: <ExtLink href={u}>{u}</ExtLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

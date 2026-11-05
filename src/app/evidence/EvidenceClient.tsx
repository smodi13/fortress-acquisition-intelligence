"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExtLink } from "@/components/ui";
import type { Company } from "@/lib/research/schema";

export function EvidenceClient({ companies }: { companies: Company[] }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const n = q.toLowerCase();
    return companies.filter(
      (c) =>
        !n || [c.id, c.name, c.sourceUrl, c.evidence.verification_status].join(" ").toLowerCase().includes(n),
    );
  }, [companies, q]);
  return (
    <>
      <div className="filters">
        <label>
          Filter evidence
          <input
            type="search"
            className="plain"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter evidence register"
            placeholder="Company, ID or URL"
            style={{ minWidth: 260 }}
          />
        </label>
        <p role="status" aria-live="polite" style={{ margin: 0 }}>
          Showing <strong>{rows.length}</strong> of {companies.length} sources
        </p>
      </div>
      <div className="tablewrap" tabIndex={0} role="region" aria-label="Evidence register, scrollable">
        <table data-testid="evidence-table">
          <thead>
            <tr>
              <th>Evidence ID</th>
              <th>Company</th>
              <th>Primary source</th>
              <th>Type</th>
              <th>Accessed</th>
              <th>Verification status</th>
              <th>Financial disclosure</th>
              <th>Seller intent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.evidence.evidence_id}</td>
                <td>
                  <Link href={`/companies/${c.id}`}>{c.name}</Link>
                </td>
                <td>
                  <ExtLink href={c.evidence.source_url}>
                    {c.evidence.source_url.replace(/^https:\/\//, "")}
                  </ExtLink>
                </td>
                <td>{c.evidence.source_type}</td>
                <td className="num">{c.evidence.accessed_date}</td>
                <td>{c.evidence.verification_status}</td>
                <td>{c.evidence.financial_disclosure}</td>
                <td>{c.evidence.seller_intent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

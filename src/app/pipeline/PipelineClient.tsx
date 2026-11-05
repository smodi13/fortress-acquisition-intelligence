"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Tag } from "@/components/ui";
import { dataFlags } from "@/lib/research/flags";
import { toCsv } from "@/lib/research/csv";
import { METROS, STANCES, type Company } from "@/lib/research/schema";
import {
  WEIGHT_KEYS,
  WEIGHT_LABELS,
  defaultWeights,
  labelOf,
  rankAll,
  score,
  weightSpec,
  weightsSumPct,
  weightsSumValid,
  type ResearchLabel,
  type WeightKey,
  type WeightState,
} from "@/lib/research/score";
import { parseDisplay, toDisplayText } from "@/lib/finance/inputs";
import {
  OUTREACH_LABEL,
  OWNERSHIP_LABEL,
  PE_LABEL,
  SELLER_INTENT_LABEL,
  STANCE_LABEL,
  outreachOf,
  type OutreachStatus,
} from "@/lib/research/stance";

type Row = Company & {
  score: number;
  label: ResearchLabel;
  rank: number;
  flags: number;
  outreach: OutreachStatus;
};
type SortKey =
  | "rank"
  | "name"
  | "market"
  | "services"
  | "mix"
  | "founded"
  | "score"
  | "label"
  | "owner"
  | "conf"
  | "flags"
  | "stance"
  | "ownership"
  | "outreach";
const OUTREACH_ORDER: OutreachStatus[] = ["SHORTLIST", "NOT_ESTABLISHED", "EXCLUDED"];
const LABEL_ORDER: Record<ResearchLabel, number> = { "High research": 0, "Medium research": 1, Watchlist: 2 };

const COLS: { key: SortKey; head: string; num?: boolean; get: (r: Row) => string | number }[] = [
  { key: "rank", head: "Rank", num: true, get: (r) => r.rank },
  { key: "name", head: "Company", get: (r) => r.name.toLowerCase() },
  { key: "market", head: "Market", get: (r) => r.market.toLowerCase() },
  { key: "services", head: "Services", get: (r) => r.services.join(";").toLowerCase() },
  { key: "mix", head: "Mix (self-reported)", get: (r) => r.businessMix.toLowerCase() },
  { key: "founded", head: "Founded", num: true, get: (r) => r.foundedYear ?? Number.POSITIVE_INFINITY },
  { key: "score", head: "Score", num: true, get: (r) => r.score },
  { key: "label", head: "Strategic fit", get: (r) => LABEL_ORDER[r.label] },
  {
    key: "ownership",
    head: "Ownership (self-reported)",
    get: (r) => (r.ownership ? 0 : 1),
  },
  { key: "stance", head: "Public owner stance", get: (r) => STANCES.indexOf(r.stance) },
  { key: "outreach", head: "Outreach status", get: (r) => OUTREACH_ORDER.indexOf(r.outreach) },
  { key: "owner", head: "Owner evidence (1–5)", num: true, get: (r) => r.ratings.owner },
  { key: "conf", head: "Source confidence (1–5)", num: true, get: (r) => r.ratings.sourceConfidence },
  { key: "flags", head: "Open data flags", num: true, get: (r) => r.flags },
];

const list = (sp: URLSearchParams, k: string) => sp.getAll(k);

export function PipelineClient({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();

  const [weights, setWeights] = useState<WeightState>(defaultWeights);
  const [draft, setDraft] = useState<Record<WeightKey, string>>(
    () =>
      Object.fromEntries(
        WEIGHT_KEYS.map((k) => [k, toDisplayText(weightSpec(k), defaultWeights()[k])]),
      ) as Record<WeightKey, string>,
  );
  const parsed = WEIGHT_KEYS.map((k) => [k, parseDisplay(draft[k], weightSpec(k))] as const);
  const draftState = Object.fromEntries(parsed.map(([k, r]) => [k, r.ok ? r.stored : 0])) as WeightState;
  const draftErrors = parsed.filter(([, r]) => !r.ok);
  const draftSumOk = draftErrors.length === 0 && weightsSumValid(draftState);
  const isDefaultWeights = WEIGHT_KEYS.every((k) => weights[k] === defaultWeights()[k]);

  const q0 = sp.get("q") ?? "";
  const [q, setQ] = useState(q0);
  const sort = (sp.get("sort") as SortKey | null) ?? "rank";
  const dir = sp.get("dir") === "desc" ? "desc" : "asc";
  const metros = list(sp, "metro");
  const services = list(sp, "service");
  const mix = sp.get("mix") ?? "";
  const lab = sp.get("label") ?? "";
  const stanceF = sp.get("stance") ?? "";
  const ownF = sp.get("ownership") ?? "";
  const peF = sp.get("pe") ?? "";
  const outF = sp.get("outreach") ?? "";
  const conf = sp.get("conf") ?? "";

  const setParams = (mut: (u: URLSearchParams) => void) => {
    const u = new URLSearchParams(sp.toString());
    mut(u);
    const s = u.toString();
    router.replace(s ? `${path}?${s}` : path, { scroll: false });
  };
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q.trim())
        setParams((u) => (q.trim() ? u.set("q", q.trim()) : u.delete("q")));
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const [seenQ, setSeenQ] = useState(q0);
  if (seenQ !== q0) {
    setSeenQ(q0); // URL changed externally (back/forward, clear): adjust state during render
    if (q0 !== q.trim()) setQ(q0);
  }

  const all: Row[] = useMemo(() => {
    const scored = companies.map((c) => ({
      ...c,
      score: score(c.ratings, weights),
      flags: dataFlags(c).length,
    }));
    return rankAll(scored).map((r) => {
      const label = labelOf(r.score);
      return { ...r, label, outreach: outreachOf(r.stance, label) };
    });
  }, [companies, weights]);

  const allServices = useMemo(() => [...new Set(companies.flatMap((c) => c.services))].sort(), [companies]);
  const allMix = useMemo(() => [...new Set(companies.map((c) => c.businessMix))].sort(), [companies]);

  const spKey = sp.toString();
  const rows = useMemo(() => {
    const p = new URLSearchParams(spKey);
    const needle = (p.get("q") ?? "").toLowerCase();
    const fm = p.getAll("metro");
    const fs = p.getAll("service");
    const fmix = p.get("mix") ?? "";
    const flab = p.get("label") ?? "";
    const fstance = p.get("stance") ?? "";
    const fown = p.get("ownership") ?? "";
    const fpe = p.get("pe") ?? "";
    const fout = p.get("outreach") ?? "";
    const fconf = p.get("conf") ?? "";
    const skey = (p.get("sort") as SortKey | null) ?? "rank";
    const sdir = p.get("dir") === "desc" ? "desc" : "asc";
    const col = COLS.find((c) => c.key === skey) ?? COLS[0]!;
    const f = all.filter(
      (r) =>
        (!needle ||
          [r.name, r.market, r.leadership, r.services.join(" "), r.businessMix, r.id, r.note]
            .join(" ")
            .toLowerCase()
            .includes(needle)) &&
        (!fm.length || fm.includes(r.metro)) &&
        (!fs.length || fs.every((s) => r.services.includes(s))) &&
        (!fmix || r.businessMix === fmix) &&
        (!flab || r.label === flab) &&
        (!fstance || r.stance === fstance) &&
        (!fown || (r.ownership?.ownershipType ?? "NOT_ASSESSED") === fown) &&
        (!fpe || (r.ownership?.peStatus ?? "NOT_ASSESSED") === fpe) &&
        (!fout || r.outreach === fout) &&
        (!fconf || r.ratings.sourceConfidence >= Number(fconf)),
    );
    f.sort((a, b) => {
      const x = col.get(a);
      const y = col.get(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return (sdir === "desc" ? -c : c) || a.id.localeCompare(b.id);
    });
    return f;
  }, [all, spKey]);

  const toggle = (key: string, val: string) =>
    setParams((u) => {
      const cur = u.getAll(key);
      u.delete(key);
      (cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]).forEach((v) => u.append(key, v));
    });
  const setOne = (key: string, val: string) => setParams((u) => (val ? u.set(key, val) : u.delete(key)));
  const sortBy = (k: SortKey) =>
    setParams((u) => {
      u.set("sort", k);
      u.set("dir", sort === k && dir === "asc" ? "desc" : "asc");
    });
  const filtered = Boolean(
    q0 || metros.length || services.length || mix || lab || conf || stanceF || outF || ownF || peF,
  );

  const exportCsv = () => {
    const header = [
      "id",
      "company",
      "market",
      "metro",
      "services",
      "business_mix_self_reported",
      "founded_year",
      "publicly_identified_leadership",
      "ownership_claim_self_reported",
      "primary_source_url",
      "recurring_relevance_1_5",
      "residential_fit_1_5",
      "austin_adjacency_1_5",
      "owner_evidence_1_5",
      "source_confidence_1_5",
      "research_score",
      "research_rank",
      "strategic_fit_research_priority",
      "ownership_type_self_reported",
      "pe_status_self_reported",
      "ownership_source_url",
      "seller_intent",
      "public_owner_stance",
      "owner_stance_source_url",
      "outreach_status",
      "seller_engagement",
      "verified_financials",
      "license_verification",
      "screening_note",
    ];
    const body = rows.map((r) => [
      r.id,
      r.name,
      r.market,
      r.metro,
      r.services.join(";"),
      r.businessMix,
      r.foundedYear === null ? "" : String(r.foundedYear),
      r.leadership,
      r.ownershipClaim,
      r.sourceUrl,
      String(r.ratings.recurring),
      String(r.ratings.residential),
      String(r.ratings.austin),
      String(r.ratings.owner),
      String(r.ratings.sourceConfidence),
      r.score.toFixed(4),
      String(r.rank),
      r.label,
      OWNERSHIP_LABEL[r.ownership?.ownershipType ?? "NOT_ASSESSED"],
      PE_LABEL[r.ownership?.peStatus ?? "NOT_ASSESSED"],
      r.ownership?.sourceUrl ?? "",
      SELLER_INTENT_LABEL,
      STANCE_LABEL[r.stance],
      r.stanceFinding?.sourceUrl ?? "",
      OUTREACH_LABEL[r.outreach],
      "NOT CONTACTED",
      "NOT VERIFIED",
      "PENDING",
      r.note,
    ]);
    const blob = new Blob([toCsv(header, body)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fortress_pipeline_export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <section aria-label="Filters" className="card">
        <div className="filters">
          <label>
            Search
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, market, owner, note…"
              aria-label="Search companies"
              style={{ minWidth: 240 }}
              className="plain"
            />
          </label>
          <label>
            Business mix
            <select value={mix} onChange={(e) => setOne("mix", e.target.value)} className="plain">
              <option value="">All</option>
              {allMix.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Strategic fit
            <select value={lab} onChange={(e) => setOne("label", e.target.value)} className="plain">
              <option value="">All</option>
              {(["High research", "Medium research", "Watchlist"] as const).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Ownership (self-reported)
            <select value={ownF} onChange={(e) => setOne("ownership", e.target.value)} className="plain">
              <option value="">All</option>
              <option value="FAMILY_OWNED">{OWNERSHIP_LABEL.FAMILY_OWNED}</option>
              <option value="NOT_ASSESSED">{OWNERSHIP_LABEL.NOT_ASSESSED}</option>
            </select>
          </label>
          <label>
            PE backing (self-reported)
            <select value={peF} onChange={(e) => setOne("pe", e.target.value)} className="plain">
              <option value="">All</option>
              <option value="NO_PE_REPORTED">{PE_LABEL.NO_PE_REPORTED}</option>
              <option value="NOT_ASSESSED">{PE_LABEL.NOT_ASSESSED}</option>
            </select>
          </label>
          <label>
            Public owner stance
            <select value={stanceF} onChange={(e) => setOne("stance", e.target.value)} className="plain">
              <option value="">All</option>
              {STANCES.map((st) => (
                <option key={st} value={st}>
                  {STANCE_LABEL[st]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Outreach status
            <select value={outF} onChange={(e) => setOne("outreach", e.target.value)} className="plain">
              <option value="">All</option>
              {OUTREACH_ORDER.map((o) => (
                <option key={o} value={o}>
                  {OUTREACH_LABEL[o]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source confidence
            <select value={conf} onChange={(e) => setOne("conf", e.target.value)} className="plain">
              <option value="">Any</option>
              {[3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  ≥ {n}
                </option>
              ))}
            </select>
          </label>
          {filtered && (
            <button
              className="btn secondary"
              onClick={() => {
                setQ("");
                router.replace(path, { scroll: false });
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="filters">
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="small muted">Market</legend>
            <div className="chips">
              {METROS.map((m) => (
                <button
                  key={m}
                  className="chip"
                  aria-pressed={metros.includes(m)}
                  onClick={() => toggle("metro", m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="small muted">Service (all selected)</legend>
            <div className="chips">
              {allServices.map((s) => (
                <button
                  key={s}
                  className="chip"
                  aria-pressed={services.includes(s)}
                  onClick={() => toggle("service", s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <details className="card" style={{ marginTop: "1rem" }}>
        <summary>
          Scoring weights (analyst assumptions){" "}
          {!isDefaultWeights && <span className="pill bad">custom weights</span>}
        </summary>
        <p className="small muted">
          score = Σ rating × weight. Weights must total exactly 100.00% and use at most two decimals.{" "}
          <Tag kind="assm" /> Ratings are <Tag kind="judg" />. Changing weights re-ranks all companies.
        </p>
        <div className="grid g3">
          {WEIGHT_KEYS.map((k) => {
            const r = parsed.find(([kk]) => kk === k)![1];
            return (
              <div className="field" key={k}>
                <label htmlFor={`w-${k}`}>{WEIGHT_LABELS[k]}</label>
                <div className="ctl">
                  <input
                    id={`w-${k}`}
                    inputMode="decimal"
                    value={draft[k]}
                    aria-invalid={!r.ok}
                    aria-describedby={`w-${k}-e`}
                    onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  />
                  <span className="unit">%</span>
                </div>
                <div className="err" id={`w-${k}-e`} role={r.ok ? undefined : "alert"}>
                  {r.ok ? "" : r.error}
                </div>
              </div>
            );
          })}
        </div>
        <p
          role="status"
          className={draftSumOk ? "" : "err"}
          style={{ color: draftSumOk ? "inherit" : "var(--err)" }}
        >
          Total: {draftErrors.length ? "—" : `${weightsSumPct(draftState).toFixed(2)}%`}{" "}
          {draftSumOk ? "✓" : "(must equal 100.00%)"}
        </p>
        <button className="btn" disabled={!draftSumOk} onClick={() => setWeights(draftState)}>
          Apply weights
        </button>{" "}
        <button
          className="btn secondary"
          onClick={() => {
            setWeights(defaultWeights());
            setDraft(
              Object.fromEntries(
                WEIGHT_KEYS.map((k) => [k, toDisplayText(weightSpec(k), defaultWeights()[k])]),
              ) as Record<WeightKey, string>,
            );
          }}
        >
          Reset to workbook weights
        </button>
      </details>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "1rem 0 .5rem",
          flexWrap: "wrap",
          gap: ".5rem",
        }}
      >
        <p role="status" aria-live="polite" style={{ margin: 0 }} data-testid="result-count">
          Showing <strong>{rows.length}</strong> of {companies.length} companies
        </p>
        <button className="btn secondary" onClick={exportCsv} data-testid="export-csv">
          Export view as CSV
        </button>
      </div>

      <div
        className="tablewrap"
        tabIndex={0}
        role="region"
        aria-label="Acquisition pipeline table, scrollable"
      >
        <table data-testid="pipeline-table">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={c.num ? "num" : undefined}
                  aria-sort={sort === c.key ? (dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button onClick={() => sortBy(c.key)}>
                    {c.head}
                    <span aria-hidden="true">{sort === c.key ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
                  </button>
                </th>
              ))}
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{r.rank}</td>
                <td className="name">
                  <Link href={`/companies/${r.id}`}>{r.name}</Link>
                  <div className="src">
                    {r.id} · {r.leadership}
                  </div>
                </td>
                <td>{r.market}</td>
                <td>{r.services.join(", ")}</td>
                <td>{r.businessMix}</td>
                <td className="num">{r.foundedYear ?? "Unknown"}</td>
                <td className="num">{r.score.toFixed(2)}</td>
                <td>
                  <span
                    className={`pill ${r.label === "High research" ? "high" : r.label === "Medium research" ? "med" : "watch"}`}
                  >
                    {r.label}
                  </span>
                </td>
                <td>
                  {r.ownership ? (
                    <>
                      <span className="pill watch">Family-owned</span>{" "}
                      <span className="pill watch">No PE reported</span>
                      <div className="src">
                        Company self-report,{" "}
                        <a href={r.ownership.sourceUrl} target="_blank" rel="noopener noreferrer">
                          source<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </div>
                    </>
                  ) : (
                    <span className="muted">Not yet assessed</span>
                  )}
                </td>
                <td>
                  <span className={`pill ${r.stance === "OPPOSED" ? "bad" : "watch"}`}>
                    {STANCE_LABEL[r.stance]}
                  </span>
                  {r.stanceFinding && (
                    <div className="src">
                      Company self-report,{" "}
                      <a href={r.stanceFinding.sourceUrl} target="_blank" rel="noopener noreferrer">
                        source<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </div>
                  )}
                </td>
                <td>
                  <span
                    className={`pill ${r.outreach === "EXCLUDED" ? "bad" : r.outreach === "SHORTLIST" ? "good" : "watch"}`}
                  >
                    {OUTREACH_LABEL[r.outreach]}
                  </span>
                </td>
                <td className="num">{r.ratings.owner}</td>
                <td className="num">{r.ratings.sourceConfidence}</td>
                <td className="num">{r.flags}</td>
                <td>
                  <span className="tag unk">Not contacted</span>{" "}
                  <span className="tag unk">Financials unverified</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 1}>
                  No companies match these filters. <Link href="/pipeline">Reset</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: ".5rem" }}>
        Research status only. Ownership evidence is the company’s own public description (<Tag kind="self" />
        ); ratings are analyst judgments (<Tag kind="judg" />
        ). No seller interest, valuation, or deal stage is implied.
      </p>
    </>
  );
}

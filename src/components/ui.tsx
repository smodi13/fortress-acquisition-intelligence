import type { ReactNode } from "react";

/** A-E provenance taxonomy required by the project data-integrity rules. */
const KINDS = {
  fact: ["A · Public fact", "fact"],
  self: ["B · Self-reported", "self"],
  judg: ["C · Analyst judgment", "judg"],
  assm: ["D · Assumption", "assm"],
  calc: ["E · Model output", "calc"],
  unk: ["Unknown", "unk"],
} as const;
export type Kind = keyof typeof KINDS;

export function Tag({ kind, children }: { kind: Kind; children?: ReactNode }) {
  const [label, cls] = KINDS[kind];
  return <span className={`tag ${cls}`}>{children ?? label}</span>;
}

export function Kpi({
  label,
  value,
  sub,
  kind,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  kind?: Kind;
}) {
  return (
    <div className="card kpi">
      <div className="label">
        {label} {kind && <Tag kind={kind} />}
      </div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function Callout({
  kind,
  children,
  role,
}: {
  kind: "warn" | "err" | "info" | "ok";
  children: ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div className={`callout ${kind}`} role={role}>
      {children}
    </div>
  );
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export const IllustrativeBanner = () => (
  <Callout kind="warn">
    <strong>Illustrative transaction.</strong> The $8.00mm revenue input and every figure derived from it
    describe an unnamed, hypothetical sample acquisition. They are <strong>not</strong> estimates for Woods
    Comfort Systems or any other identified company, and no company financials are available or verified.
  </Callout>
);

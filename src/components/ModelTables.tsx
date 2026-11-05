"use client";
import type { Flag, ModelResult } from "@/lib/finance/types";
import { fmtPct, fmtUsd, fmtX } from "@/lib/finance/format";
import { Callout } from "./ui";

const Row = ({
  label,
  vals,
  fmt = fmtUsd,
  cls,
}: {
  label: string;
  vals: (number | null)[];
  fmt?: (v: number | null) => string;
  cls?: string;
}) => (
  <tr className={cls}>
    <th scope="row">{label}</th>
    {vals.map((v, i) => (
      <td key={i} className="num">
        {fmt(v)}
      </td>
    ))}
  </tr>
);

export function FlagList({ flags }: { flags: Flag[] }) {
  if (!flags.length)
    return (
      <Callout kind="ok" role="status">
        No financial risk flags.
      </Callout>
    );
  return (
    <div role="status" aria-live="polite" data-testid="flags">
      {flags.map((f) => (
        <Callout
          key={f.code}
          kind={f.severity === "error" ? "err" : f.severity === "warning" ? "warn" : "info"}
        >
          <strong>
            {f.severity === "error" ? "Error" : f.severity === "warning" ? "Flag" : "Note"} · {f.code}
          </strong>
          : {f.message}
        </Callout>
      ))}
    </div>
  );
}

export function SourcesUses({ m }: { m: ModelResult }) {
  const e = m.entry;
  const uses = [
    ["Purchase of enterprise value", e.enterpriseValue],
    ["Transaction expenses", e.transactionFees],
    ["Financing fees", e.financingFees],
  ] as const;
  const src = [
    ["Original term debt", e.originalDebt],
    ["Seller equity rollover", e.rolloverEquity],
    ["Sponsor equity required", e.sponsorEquity],
  ] as const;
  return (
    <div className="grid g2">
      <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
        <table data-testid="sources-uses">
          <caption>Sources ($mm)</caption>
          <tbody>
            {src.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td className="num">{fmtUsd(v)}</td>
                <td className="num muted">{fmtPct(e.totalSources ? v / e.totalSources : null)}</td>
              </tr>
            ))}
            <tr className="total">
              <th scope="row">Total sources</th>
              <td className="num">{fmtUsd(e.totalSources)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
        <table>
          <caption>Uses ($mm)</caption>
          <tbody>
            {uses.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td className="num">{fmtUsd(v)}</td>
                <td className="num muted">{fmtPct(e.totalUses ? v / e.totalUses : null)}</td>
              </tr>
            ))}
            <tr className="total">
              <th scope="row">Total uses</th>
              <td className="num">{fmtUsd(e.totalUses)}</td>
              <td />
            </tr>
            <tr className="sub">
              <th scope="row">Sources less uses</th>
              <td className="num">{fmtUsd(e.sourcesLessUses)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
        <table>
          <caption>Equity structure</caption>
          <tbody>
            <tr>
              <th scope="row">Sponsor equity</th>
              <td className="num">{fmtUsd(e.sponsorEquity)}</td>
              <td className="num">{fmtPct(e.sponsorOwnership)}</td>
            </tr>
            <tr>
              <th scope="row">Seller rollover (pari passu)</th>
              <td className="num">{fmtUsd(e.rolloverEquity)}</td>
              <td className="num">{fmtPct(e.sellerOwnership)}</td>
            </tr>
            <tr className="total">
              <th scope="row">Total equity</th>
              <td className="num">{fmtUsd(e.sponsorEquity + e.rolloverEquity)}</td>
              <td className="num">{fmtPct(e.sponsorOwnership + e.sellerOwnership)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
        <table>
          <caption>Entry metrics</caption>
          <tbody>
            <tr>
              <th scope="row">Entry normalized EBITDA ($mm)</th>
              <td className="num">{fmtUsd(e.ebitda0)}</td>
            </tr>
            <tr>
              <th scope="row">Enterprise value ($mm)</th>
              <td className="num">{fmtUsd(e.enterpriseValue)}</td>
            </tr>
            <tr>
              <th scope="row">Debt / EBITDA</th>
              <td className="num">{fmtX(e.debtToEbitda)}</td>
            </tr>
            <tr>
              <th scope="row">Debt / enterprise value</th>
              <td className="num">{fmtPct(e.debtToEv)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ForecastTable({ m }: { m: ModelResult }) {
  const f = m.forecast;
  const yrs = f.period;
  return (
    <div className="tablewrap" tabIndex={0} role="region" aria-label="Five-year forecast, scrollable">
      <table data-testid="forecast">
        <caption className="sr-only">Five-year operating and debt forecast, USD millions</caption>
        <thead>
          <tr>
            <th scope="col">$mm</th>
            {yrs.map((y) => (
              <th key={y} scope="col" className="num">
                {y === 0 ? "Entry (Yr 0)" : `Year ${y}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row label="Revenue" vals={f.revenue} />
          <Row label="YoY growth" vals={f.growth} fmt={fmtPct} cls="sub" />
          <Row label="Operating EBITDA" vals={f.operatingEbitda} />
          <Row label="EBITDA synergies" vals={f.synergies} />
          <Row label="Total EBITDA" vals={f.totalEbitda} cls="total" />
          <Row label="Depreciation & amortization" vals={f.da} />
          <Row label="EBIT" vals={f.ebit} />
          <Row label="Beginning debt" vals={f.beginDebt} />
          <Row label="Cash interest" vals={f.interest} />
          <Row label="Cash taxes" vals={f.cashTaxes} />
          <Row label="Capital expenditures" vals={f.capex} />
          <Row label="Working-capital investment" vals={f.nwcInvestment} />
          <Row label="Integration costs" vals={f.integration} />
          <Row label="Free cash flow available for paydown" vals={f.freeCashFlow} cls="total" />
          <Row label="Mandatory principal paid" vals={f.mandatoryPaid} />
          <Row label="Excess cash flow sweep" vals={f.sweepPaid} />
          <Row label="Total principal paid" vals={f.totalPaid} />
          <Row label="Ending debt" vals={f.endDebt} cls="total" />
          <Row label="Beginning cash" vals={f.beginCash} />
          <Row label="Ending cash" vals={f.endCash} cls="total" />
          <Row label="Unfinanced operating shortfall" vals={f.operatingShortfall} />
          <Row label="Unpaid mandatory amortization" vals={f.unpaidMandatory} />
        </tbody>
      </table>
    </div>
  );
}

export function ReturnsTable({ m }: { m: ModelResult }) {
  const r = m.returns;
  return (
    <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
      <table data-testid="returns">
        <caption>Exit and sponsor returns</caption>
        <tbody>
          <tr>
            <th scope="row">Year 5 total EBITDA ($mm)</th>
            <td className="num">{fmtUsd(r.year5Ebitda)}</td>
          </tr>
          <tr>
            <th scope="row">Exit EV / EBITDA</th>
            <td className="num">{fmtX(r.exitMultiple)}</td>
          </tr>
          <tr>
            <th scope="row">Exit enterprise value ($mm)</th>
            <td className="num">{fmtUsd(r.exitEv)}</td>
          </tr>
          <tr>
            <th scope="row">Less: ending debt ($mm)</th>
            <td className="num">{fmtUsd(r.endingDebt)}</td>
          </tr>
          <tr>
            <th scope="row">Plus: ending cash ($mm)</th>
            <td className="num">{fmtUsd(r.endingCash)}</td>
          </tr>
          <tr className="total">
            <th scope="row">Exit distributable equity ($mm)</th>
            <td className="num">{fmtUsd(r.exitEquity)}</td>
          </tr>
          <tr>
            <th scope="row">Sponsor ownership</th>
            <td className="num">{fmtPct(r.sponsorOwnership)}</td>
          </tr>
          <tr>
            <th scope="row">Sponsor exit proceeds ($mm)</th>
            <td className="num">{fmtUsd(r.sponsorProceeds)}</td>
          </tr>
          <tr>
            <th scope="row">Sponsor entry equity ($mm)</th>
            <td className="num">{fmtUsd(r.sponsorEquity)}</td>
          </tr>
          <tr className="total">
            <th scope="row">Gross MOIC</th>
            <td className="num">{fmtX(r.moic)}</td>
          </tr>
          <tr className="total">
            <th scope="row">Gross IRR</th>
            <td className="num">{fmtPct(r.irr)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Checks({ m }: { m: ModelResult }) {
  return (
    <ul className="clean" aria-label="Model integrity checks" data-testid="checks">
      {m.checks.map((c) => (
        <li key={c.label}>
          <span className={`pill ${c.pass ? "good" : "bad"}`}>{c.pass ? "PASS" : "FAIL"}</span> {c.label}{" "}
          <span className="src">{c.detail}</span>
        </li>
      ))}
    </ul>
  );
}

"use client";
import { AssumptionField } from "@/components/AssumptionField";
import { DebtCashChart, EbitdaChart } from "@/components/Charts";
import { Checks, FlagList, ForecastTable, ReturnsTable, SourcesUses } from "@/components/ModelTables";
import { useModel } from "@/components/ModelProvider";
import { ScenarioSelect } from "@/components/ScenarioSelect";
import { Kpi, Tag } from "@/components/ui";
import { fmtPct, fmtPts, fmtUsd, fmtX } from "@/lib/finance/format";
import { toCsv } from "@/lib/research/csv";

const GROUPS: [string, string[]][] = [
  ["Operating foundation", ["deal.baselineRevenue"]],
  ["Entry valuation and equity", ["deal.entryMultiple", "deal.rolloverPctEv", "deal.transactionFeesPctEv"]],
  [
    "Debt financing",
    [
      "deal.debtToEbitda",
      "deal.maxDebtPctEv",
      "deal.cashInterestRate",
      "deal.financingFeesPctDebt",
      "deal.mandatoryAmortPct",
    ],
  ],
  ["Cash flow", ["deal.taxRate", "deal.capexPct", "deal.depreciationPct", "deal.nwcPctIncrementalRevenue"]],
  [
    "Synergies and integration",
    ["deal.yearlySynergy", "deal.synergyStartYear", "deal.integrationCost", "deal.integrationYear"],
  ],
  ["Return hurdle", ["deal.targetIrr", "deal.holdYears"]],
];

export function UnderwritingClient() {
  const { result: m, scenario, reset, isDefault } = useModel();
  const r = m.returns;
  const caseIds = [
    `case.${scenario}.growth`,
    `case.${scenario}.ebitdaMargin`,
    `case.${scenario}.exitMultiple`,
  ];

  const exportCsv = () => {
    const f = m.forecast;
    const rows: [string, number[]][] = [
      ["Revenue", f.revenue],
      ["Total EBITDA", f.totalEbitda],
      ["Free cash flow", f.freeCashFlow],
      ["Ending debt", f.endDebt],
      ["Ending cash", f.endCash],
    ];
    const csv = toCsv(
      ["line_item_usd_mm", ...f.period.map((p) => `year_${p}`)],
      rows.map(([k, v]) => [k, ...v.map(String)]),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `illustrative_forecast_${scenario.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="split">
      <aside className="card sticky" aria-label="Assumptions">
        <h2 style={{ marginTop: 0 }}>
          Assumptions <Tag kind="assm" />
        </h2>
        <p className="small muted">
          Enter values in display units (18.00 means 18.00%). At most two decimals; longer entries are
          rejected, not rounded.
        </p>
        <ScenarioSelect />
        <h3 style={{ marginTop: "1rem" }}>{scenario} case</h3>
        {caseIds.map((id) => (
          <AssumptionField key={id} id={id} />
        ))}
        {GROUPS.map(([title, ids]) => (
          <details key={title} open={title !== "Cash flow"}>
            <summary>{title}</summary>
            {ids.map((id) => (
              <AssumptionField key={id} id={id} />
            ))}
          </details>
        ))}
        <button className="btn secondary" onClick={reset} disabled={isDefault}>
          Reset to workbook defaults
        </button>
      </aside>

      <div>
        <section aria-label="Headline results" className="grid g4">
          <Kpi
            label="Entry enterprise value"
            value={`$${fmtUsd(m.entry.enterpriseValue)}mm`}
            sub={`${fmtX(m.entry.ebitda0 ? m.entry.enterpriseValue / m.entry.ebitda0 : null)} × $${fmtUsd(m.entry.ebitda0)}mm EBITDA`}
            kind="calc"
          />
          <Kpi
            label="Sponsor equity"
            value={`$${fmtUsd(m.entry.sponsorEquity)}mm`}
            sub={`${fmtPct(m.entry.sponsorOwnership)} ownership`}
            kind="calc"
          />
          <Kpi label="Gross MOIC" value={fmtX(r.moic)} sub={`Exit EV $${fmtUsd(r.exitEv)}mm`} kind="calc" />
          <Kpi
            label="Gross IRR"
            value={fmtPct(r.irr)}
            sub={`${fmtPts(r.irrSurplus)} vs ${fmtPct(r.targetIrr)} hurdle`}
            kind="calc"
          />
        </section>
        <p style={{ margin: ".75rem 0" }} data-testid="status">
          Case status:{" "}
          <span className={`pill ${r.status.startsWith("PASSES") ? "good" : "bad"}`}>{r.status}</span>{" "}
          <span className="small muted">
            Scenario: {scenario}. Gross, before fees, carry and investor-level taxes.
          </span>
        </p>

        <h2>Financial risk flags</h2>
        <FlagList flags={m.flags} />

        <h2>
          Entry: sources and uses <Tag kind="calc" />
        </h2>
        <SourcesUses m={m} />
        <details>
          <summary>How entry is calculated</summary>
          <pre className="formula-block" tabIndex={0}>{`EBITDA0 = revenue × EBITDA margin
EV0 = EBITDA0 × entry multiple
debt = MIN(EBITDA0 × debt/EBITDA, EV0 × max debt/EV)
rollover = EV0 × rollover %          fees = EV0 × txn % + debt × financing %
sponsor equity = (EV0 + fees) − debt − rollover
ownership = sponsor ÷ (sponsor + rollover)`}</pre>
        </details>

        <h2
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <span>
            Five-year forecast and debt waterfall <Tag kind="calc" />
          </span>
          <button className="btn secondary" onClick={exportCsv}>
            Export forecast CSV
          </button>
        </h2>
        <ForecastTable m={m} />
        <details>
          <summary>How cash and debt are calculated</summary>
          <pre
            className="formula-block"
            tabIndex={0}
          >{`FCF = EBITDA − interest − cash taxes − capex − ΔNWC − integration
cash taxes = MAX(0, (EBIT − interest) × tax rate); interest = beginning debt × rate
mandatory = MIN(beginning debt, original debt × amort %, MAX(0, FCF + beginning cash))
sweep = MIN(remaining debt, MAX(0, FCF + beginning cash − mandatory))
ending cash = MAX(0, beginning cash + FCF − repayments)
shortfall = MAX(0, −(FCF + beginning cash)) + unpaid mandatory amortization
No revolver is drawn and no equity is injected: deficits are flagged, not financed.`}</pre>
        </details>
        <div className="grid g2" style={{ marginTop: "1rem" }}>
          <div className="card">
            <h3>Debt, cash and free cash flow</h3>
            <DebtCashChart m={m} />
          </div>
          <div className="card">
            <h3>EBITDA build</h3>
            <EbitdaChart m={m} />
          </div>
        </div>

        <h2>
          Exit and sponsor returns <Tag kind="calc" />
        </h2>
        <div className="grid g2">
          <ReturnsTable m={m} />
          <div className="card">
            <h3>Model integrity checks</h3>
            <Checks m={m} />
            <p className="src">Funding shortfall over forecast: ${fmtUsd(r.totalFundingShortfall)}mm</p>
          </div>
        </div>
      </div>
    </div>
  );
}

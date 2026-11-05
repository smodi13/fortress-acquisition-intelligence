"use client";
import Link from "next/link";
import { useMemo } from "react";
import { AssumptionField } from "@/components/AssumptionField";
import { BridgeChart, ScenarioIrrChart } from "@/components/Charts";
import { FlagList } from "@/components/ModelTables";
import { useModel } from "@/components/ModelProvider";
import { ScenarioSelect } from "@/components/ScenarioSelect";
import { Callout, Kpi, Tag } from "@/components/ui";
import { risks } from "@/data/narrative";
import {
  breakEvenEntryMultiple,
  breakEvenExitMultiple,
  fullSensitivity,
  partialSensitivity,
  runModel,
  valueBridge,
  withMultiples,
} from "@/lib/finance/engine";
import { fmtPct, fmtPts, fmtUsd, fmtX } from "@/lib/finance/format";
import { SCENARIOS, type ModelInputs, type SensitivityGrid } from "@/lib/finance/types";

const FLEX_PCT = 0.01; // mechanical 1.00-point flex for growth and margin (display aid, not a forecast)

function Heat({ g, target, label }: { g: SensitivityGrid; target: number; label: string }) {
  return (
    <div className="tablewrap" tabIndex={0} role="region" aria-label={`${label}, scrollable`}>
      <table className="heat" data-testid="heatmap">
        <caption className="sr-only">
          {label}: rows are entry EV/EBITDA, columns are exit EV/EBITDA, cells are gross IRR
        </caption>
        <thead>
          <tr>
            <th scope="col">Entry ↓ / Exit →</th>
            {g.exitMultiples.map((x) => (
              <th key={x} scope="col" className="num">
                {fmtX(x)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {g.irr.map((row, i) => (
            <tr key={i}>
              <th scope="row">{fmtX(g.entryMultiples[i]!)}</th>
              {row.map((v, j) => (
                <td
                  key={j}
                  className={`cell ${v === null ? "" : v >= target ? "pass" : "fail"} ${i === 2 && j === 2 ? "center" : ""}`}
                  data-center={i === 2 && j === 2 ? "true" : undefined}
                >
                  {fmtPct(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SensitivityClient() {
  const { inputs, result: m, scenario } = useModel();
  const target = inputs.deal.targetIrr;

  const runs = useMemo(() => SCENARIOS.map((s) => runModel({ ...inputs, scenario: s })), [inputs]);
  const partial = useMemo(() => partialSensitivity(inputs, m), [inputs, m]);
  const full = useMemo(() => fullSensitivity(inputs), [inputs]);
  const bridge = useMemo(() => valueBridge(m), [m]);
  const beExit = useMemo(() => breakEvenExitMultiple(inputs, m), [inputs, m]);
  const beEntry = useMemo(() => breakEvenEntryMultiple(inputs), [inputs]);

  const maxDiff = useMemo(() => {
    let d = 0;
    partial.irr.forEach((row, i) =>
      row.forEach((v, j) => {
        const w = full.irr[i]![j];
        if (v !== null && w !== null && w !== undefined) d = Math.max(d, Math.abs(v - w));
      }),
    );
    return d;
  }, [partial, full]);

  const stress = useMemo(() => {
    const step = inputs.deal.sensitivityStep;
    const c = inputs.cases[scenario];
    const withCase = (patch: Partial<typeof c>): ModelInputs => ({
      ...inputs,
      cases: { ...inputs.cases, [scenario]: { ...c, ...patch } },
    });
    const list: [string, ModelInputs][] = [
      [`Revenue growth −${(FLEX_PCT * 100).toFixed(2)} pts`, withCase({ growth: c.growth - FLEX_PCT })],
      [
        `EBITDA margin −${(FLEX_PCT * 100).toFixed(2)} pts`,
        withCase({ ebitdaMargin: c.ebitdaMargin - FLEX_PCT }),
      ],
      [
        `Exit multiple −${step.toFixed(2)}x`,
        withMultiples(inputs, inputs.deal.entryMultiple, c.exitMultiple - step),
      ],
      [
        `Entry multiple +${step.toFixed(2)}x`,
        withMultiples(inputs, inputs.deal.entryMultiple + step, c.exitMultiple),
      ],
      [
        `Exit held at entry multiple (${fmtX(inputs.deal.entryMultiple)}): no expansion`,
        withMultiples(inputs, inputs.deal.entryMultiple, inputs.deal.entryMultiple),
      ],
    ];
    return list.map(([label, i]) => ({ label, r: runModel(i).returns }));
  }, [inputs, scenario]);

  const r = m.returns;
  return (
    <>
      <section className="card" aria-labelledby="h-sel">
        <h2 id="h-sel" style={{ marginTop: 0 }}>
          Scenario and assumptions <Tag kind="assm" />
        </h2>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: ".75rem",
          }}
        >
          <ScenarioSelect />
          <span className="small muted">
            Selected case drives the grids, bridge and flexes below. Workbook default: Base.
          </span>
        </div>
        <div className="grid g3">
          {SCENARIOS.map((s) => (
            <fieldset key={s} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: ".75rem" }}>
              <legend>
                <strong>{s}</strong>
              </legend>
              {(["growth", "ebitdaMargin", "exitMultiple"] as const).map((k) => (
                <AssumptionField key={k} id={`case.${s}.${k}`} />
              ))}
            </fieldset>
          ))}
        </div>
        <div className="grid g4">
          {["deal.entryMultiple", "deal.sensitivityStep", "deal.rolloverPctEv", "deal.targetIrr"].map(
            (id) => (
              <AssumptionField key={id} id={id} />
            ),
          )}
        </div>
        <p className="small muted">
          More transaction assumptions (debt, interest, taxes, synergies) are on the{" "}
          <Link href="/underwriting">Underwriting</Link> page and apply here too. Cases are labeled “not
          probability-weighted”.
        </p>
      </section>

      <h2>
        Scenario comparison <Tag kind="calc" />
      </h2>
      <div className="grid g2">
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
          <table data-testid="scenario-table">
            <caption className="sr-only">Scenario comparison</caption>
            <thead>
              <tr>
                <th>Metric</th>
                {runs.map((x) => (
                  <th key={x.scenario} className="num">
                    {x.scenario}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Revenue growth <Tag kind="assm" />
                </th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtPct(x.active.growth)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  EBITDA margin <Tag kind="assm" />
                </th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtPct(x.active.ebitdaMargin)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  Exit EV / EBITDA <Tag kind="assm" />
                </th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtX(x.active.exitMultiple)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Entry EV ($mm)</th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtUsd(x.entry.enterpriseValue)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Sponsor equity ($mm)</th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtUsd(x.entry.sponsorEquity)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Year 5 EBITDA ($mm)</th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtUsd(x.returns.year5Ebitda)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Exit EV ($mm)</th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtUsd(x.returns.exitEv)}
                  </td>
                ))}
              </tr>
              <tr className="total">
                <th scope="row">Gross MOIC</th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtX(x.returns.moic)}
                  </td>
                ))}
              </tr>
              <tr className="total">
                <th scope="row">Gross IRR</th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtPct(x.returns.irr)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">IRR vs {fmtPct(target)} hurdle</th>
                {runs.map((x) => (
                  <td key={x.scenario} className="num">
                    {fmtPts(x.returns.irrSurplus)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Status</th>
                {runs.map((x) => (
                  <td key={x.scenario}>
                    <span className={`pill ${x.returns.status.startsWith("PASSES") ? "good" : "bad"}`}>
                      {x.returns.status.replace(" ILLUSTRATIVE", "")}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <ScenarioIrrChart runs={runs} target={target} />
        </div>
      </div>

      <h2>Selected case: {scenario}</h2>
      <div className="grid g4">
        <Kpi label="Gross IRR" value={fmtPct(r.irr)} sub={`${fmtPts(r.irrSurplus)} vs hurdle`} kind="calc" />
        <Kpi label="Gross MOIC" value={fmtX(r.moic)} kind="calc" />
        <Kpi
          label="Exit enterprise value"
          value={`$${fmtUsd(r.exitEv)}mm`}
          sub={`${fmtX(r.exitMultiple)} × $${fmtUsd(r.year5Ebitda)}mm`}
          kind="calc"
        />
        <Kpi
          label="Break-even exit multiple"
          value={fmtX(beExit)}
          sub={`for ${fmtPct(target)} IRR; assumed ${fmtX(r.exitMultiple)}`}
          kind="calc"
        />
      </div>
      <FlagList flags={m.flags} />

      <h2>
        Key return drivers <Tag kind="calc" />
      </h2>
      <div className="grid g2">
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
          <table data-testid="bridge">
            <caption>Total equity value creation, entry to exit ($mm)</caption>
            <tbody>
              {bridge.items.map((i) => (
                <tr key={i.label}>
                  <th scope="row">{i.label}</th>
                  <td className="num">{fmtUsd(i.value)}</td>
                </tr>
              ))}
              <tr className="total">
                <th scope="row">Exit equity less entry equity (incl. seller rollover)</th>
                <td className="num">{fmtUsd(bridge.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <BridgeChart items={bridge.items} />
        </div>
      </div>

      <h2>
        Sensitivity to valuation: workbook grid <Tag kind="calc" />
      </h2>
      <Callout kind="warn">
        <strong>Partial sensitivity.</strong> This grid varies only the entry and exit EV/EBITDA multiples.
        Debt sizing, the debt paydown schedule and exit cash are held constant at the active case. It is not a
        full re-underwrite. Re-running the whole model at each entry multiple changes the largest cell by{" "}
        <strong data-testid="max-diff">{fmtPts(maxDiff)}</strong>
        {maxDiff < 1e-9 ? " (identical here: debt sizing does not change across these entry multiples)" : ""}.
        Multiples are illustrative steps, not market quotes. Green cells meet the {fmtPct(target)} hurdle; the
        outlined cell is the selected case.
      </Callout>
      <Heat g={partial} target={target} label="Gross IRR sensitivity, workbook method" />
      <p className="small muted" data-testid="center-check">
        Center cell {fmtPct(partial.irr[2]![2]!)}{" "}
        {Math.abs((partial.irr[2]![2] ?? NaN) - (r.irr ?? NaN)) < 1e-9 ? "equals" : "DIFFERS FROM"} the
        selected case IRR {fmtPct(r.irr)}.
      </p>
      <details>
        <summary>Full re-underwrite grid (application extension, not in the workbook)</summary>
        <Heat
          g={full}
          target={target}
          label="Gross IRR sensitivity, full model re-run at each entry multiple"
        />
      </details>

      <h2>Risks to hitting the return hurdle</h2>
      <div className="grid g2">
        <section className="card">
          <h3>
            Mechanical flexes (full model re-run) <Tag kind="calc" />
          </h3>
          <p className="small muted">
            Display aids showing how far the {scenario} case moves under a defined change. They are not
            forecasts.
          </p>
          <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
            <table data-testid="stress">
              <thead>
                <tr>
                  <th>Flex</th>
                  <th className="num">IRR</th>
                  <th className="num">vs hurdle</th>
                </tr>
              </thead>
              <tbody>
                <tr className="total">
                  <th scope="row">Selected case, unflexed</th>
                  <td className="num">{fmtPct(r.irr)}</td>
                  <td className="num">{fmtPts(r.irrSurplus)}</td>
                </tr>
                {stress.map((s) => (
                  <tr key={s.label}>
                    <th scope="row">{s.label}</th>
                    <td className="num">{fmtPct(s.r.irr)}</td>
                    <td className="num">{fmtPts(s.r.irrSurplus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="clean" style={{ marginTop: ".75rem" }}>
            <li>
              IRR cushion over hurdle: <strong>{fmtPts(r.irrSurplus)}</strong>
            </li>
            <li>
              Break-even exit multiple: <strong>{fmtX(beExit)}</strong> (assumed {fmtX(r.exitMultiple)}; entry{" "}
              {fmtX(inputs.deal.entryMultiple)})
            </li>
            <li>
              Break-even entry multiple (full model): <strong>{fmtX(beEntry)}</strong>
            </li>
          </ul>
        </section>
        <section className="card">
          <h3>Sourced risks from the memo</h3>
          <ul className="clean">
            {risks.map((x) => (
              <li key={x.value}>
                {x.value}{" "}
                <span className="src">
                  ({x.source}, p.{x.page})
                </span>
              </li>
            ))}
          </ul>
          <p className="small muted">
            The model excludes tax basis step-up, working-capital peg, purchase accounting, indemnities,
            revolver draws and incremental equity. Sponsor returns are gross.
          </p>
        </section>
      </div>
    </>
  );
}

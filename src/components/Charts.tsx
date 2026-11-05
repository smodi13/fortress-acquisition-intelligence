"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BridgeItem } from "@/lib/finance/engine";
import type { ModelResult } from "@/lib/finance/types";

const NAVY = "#0f2747";
const TEAL = "#0f766e";
const GREY = "#7b8794";
const RED = "#a11a1a";
const usd = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v));

export function DebtCashChart({ m }: { m: ModelResult }) {
  const data = m.forecast.period.map((y) => ({
    year: y === 0 ? "Entry" : `Yr ${y}`,
    "Ending debt": y === 0 ? m.entry.originalDebt : m.forecast.endDebt[y],
    "Ending cash": m.forecast.endCash[y],
    "Free cash flow": y === 0 ? null : m.forecast.freeCashFlow[y],
  }));
  return (
    <figure
      style={{ margin: 0 }}
      aria-label="Debt, cash and free cash flow by year; values are in the forecast table"
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e3e8ef" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={usd} width={44} />
          <Tooltip formatter={usd} />
          <Legend />
          <Bar dataKey="Ending debt" fill={NAVY} isAnimationActive={false} />
          <Bar dataKey="Ending cash" fill={TEAL} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="Free cash flow"
            stroke={GREY}
            strokeWidth={2}
            dot
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <figcaption className="src">USD millions. Calculated from the forecast above.</figcaption>
    </figure>
  );
}

export function EbitdaChart({ m }: { m: ModelResult }) {
  const data = m.forecast.period.map((y) => ({
    year: y === 0 ? "Entry" : `Yr ${y}`,
    "Operating EBITDA": m.forecast.operatingEbitda[y],
    Synergies: m.forecast.synergies[y],
  }));
  return (
    <figure style={{ margin: 0 }} aria-label="EBITDA by year; values are in the forecast table">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e3e8ef" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={usd} width={44} />
          <Tooltip formatter={usd} />
          <Legend />
          <Bar dataKey="Operating EBITDA" stackId="a" fill={NAVY} isAnimationActive={false} />
          <Bar dataKey="Synergies" stackId="a" fill={TEAL} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="src">USD millions.</figcaption>
    </figure>
  );
}

export function ScenarioIrrChart({ runs, target }: { runs: ModelResult[]; target: number }) {
  const data = runs.map((r) => ({
    case: r.scenario,
    "Gross IRR %": r.returns.irr === null ? null : r.returns.irr * 100,
  }));
  return (
    <figure
      style={{ margin: 0 }}
      aria-label="Gross IRR by scenario against the hurdle; values are in the comparison table"
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e3e8ef" />
          <XAxis dataKey="case" />
          <YAxis unit="%" width={48} />
          <Tooltip formatter={(v) => `${usd(v)}%`} />
          <ReferenceLine
            y={target * 100}
            stroke={RED}
            strokeDasharray="5 4"
            label={{
              value: `Hurdle ${(target * 100).toFixed(2)}%`,
              position: "insideTopRight",
              fill: RED,
              fontSize: 12,
            }}
          />
          <Bar dataKey="Gross IRR %" fill={TEAL} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.case}
                fill={d["Gross IRR %"] !== null && d["Gross IRR %"] >= target * 100 ? TEAL : GREY}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="src">Teal = at or above the illustrative hurdle; grey = below.</figcaption>
    </figure>
  );
}

export function BridgeChart({ items }: { items: BridgeItem[] }) {
  const data = items.map((i) => ({
    name: i.label.split(" (")[0]!.replace(" at entry multiple", "").replace(" on Year 5 EBITDA", ""),
    value: i.value,
  }));
  return (
    <figure style={{ margin: 0 }} aria-label="Equity value creation drivers; values are in the bridge table">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#e3e8ef" />
          <XAxis type="number" tickFormatter={usd} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
          <Tooltip formatter={usd} />
          <Bar dataKey="value" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.value >= 0 ? TEAL : RED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="src">USD millions of total equity value creation.</figcaption>
    </figure>
  );
}

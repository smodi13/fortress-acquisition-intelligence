/** Display formatting only. Never feed formatted/rounded values back into calculations. */
const clean = (s: string) => (/^-0(\.0+)?$/.test(s) ? s.slice(1) : s);
const NM = "n/m";

export const fmtUsd = (v: number | null, d = 2) =>
  v === null || !Number.isFinite(v)
    ? NM
    : clean(v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
export const fmtPct = (v: number | null, d = 2) =>
  v === null || !Number.isFinite(v) ? NM : clean((v * 100).toFixed(d)) + "%";
export const fmtX = (v: number | null, d = 2) =>
  v === null || !Number.isFinite(v) ? NM : clean(v.toFixed(d)) + "x";
/** Percentage-point difference, e.g. +0.12 pts */
export const fmtPts = (v: number | null) =>
  v === null || !Number.isFinite(v) ? NM : `${v >= 0 ? "+" : ""}${clean((v * 100).toFixed(2))} pts`;

"use client";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { runModel } from "@/lib/finance/engine";
import {
  DEFAULT_SCENARIO,
  FIELD_BY_ID,
  defaultState,
  stateToInputs,
  type InputState,
} from "@/lib/finance/inputs";
import { SCENARIOS, type ModelInputs, type ModelResult, type Scenario } from "@/lib/finance/types";

interface Ctx {
  state: InputState;
  scenario: Scenario;
  inputs: ModelInputs;
  result: ModelResult;
  isDefault: boolean;
  setField: (id: string, stored: number) => void;
  setScenario: (s: Scenario) => void;
  reset: () => void;
}
const ModelCtx = createContext<Ctx | null>(null);

/* ---- tiny session-persisted external store (hydration-safe via useSyncExternalStore) ---- */
const KEY = "fai.model.v1";
const listeners = new Set<() => void>();
let memory: string | null = null;
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const getSnapshot = (): string | null => {
  if (memory !== null) return memory;
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const getServerSnapshot = (): string | null => null;
const write = (v: { state: InputState; scenario: Scenario } | null) => {
  memory = v ? JSON.stringify(v) : "";
  try {
    if (v) sessionStorage.setItem(KEY, memory);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
};

/** Re-validates persisted values: integers, known editable fields, within bounds. Anything else is dropped. */
function parse(raw: string | null): { state: InputState; scenario: Scenario } {
  const state = defaultState();
  let scenario = DEFAULT_SCENARIO;
  if (!raw) return { state, scenario };
  try {
    const saved = JSON.parse(raw) as { state?: InputState; scenario?: string };
    for (const [id, v] of Object.entries(saved.state ?? {})) {
      const f = FIELD_BY_ID[id];
      if (!f || f.readOnly || !Number.isInteger(v)) continue;
      const display = f.unit === "year" ? v : v / 100;
      if (display >= f.min && display <= f.max) state[id] = v;
    }
    if ((SCENARIOS as readonly string[]).includes(saved.scenario ?? ""))
      scenario = saved.scenario as Scenario;
  } catch {
    /* corrupt storage: use defaults */
  }
  return { state, scenario };
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { state, scenario } = useMemo(() => parse(raw), [raw]);

  const setField = useCallback((id: string, stored: number) => {
    const cur = parse(getSnapshot());
    write({ state: { ...cur.state, [id]: stored }, scenario: cur.scenario });
  }, []);
  const setScenario = useCallback((s: Scenario) => {
    write({ state: parse(getSnapshot()).state, scenario: s });
  }, []);
  const reset = useCallback(() => write(null), []);

  const value = useMemo<Ctx>(() => {
    const inputs = stateToInputs(state, scenario);
    const d = defaultState();
    return {
      state,
      scenario,
      inputs,
      result: runModel(inputs),
      isDefault: scenario === DEFAULT_SCENARIO && Object.keys(d).every((k) => d[k] === state[k]),
      setField,
      setScenario,
      reset,
    };
  }, [state, scenario, setField, setScenario, reset]);

  return <ModelCtx.Provider value={value}>{children}</ModelCtx.Provider>;
}

export function useModel(): Ctx {
  const c = useContext(ModelCtx);
  if (!c) throw new Error("useModel outside ModelProvider");
  return c;
}

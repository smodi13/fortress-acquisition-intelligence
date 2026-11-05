"use client";
import { SCENARIOS } from "@/lib/finance/types";
import { useModel } from "./ModelProvider";

export function ScenarioSelect() {
  const { scenario, setScenario } = useModel();
  return (
    <div role="group" aria-label="Scenario" className="seg">
      {SCENARIOS.map((s) => (
        <button key={s} aria-pressed={scenario === s} onClick={() => setScenario(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}

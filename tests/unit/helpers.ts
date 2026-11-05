import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultState, stateToInputs } from "@/lib/finance/inputs";
import type { Scenario } from "@/lib/finance/types";

export const SRC = join(process.cwd(), "Ridgepeak_Fortress_Research");
export const readSrc = (f: string) => readFileSync(join(SRC, f), "utf8");
export const reference = JSON.parse(readSrc("formula_engine_reference_tests.json")) as RefFile;
export const TOL = reference.validation_tolerance_absolute;
export const inputsFor = (s: Scenario) => stateToInputs(defaultState(), s);

interface RefCase {
  returns: Record<string, number | string>;
  entry: Record<string, number>;
  forecast_cash_waterfall: Record<string, number[]>;
}
interface RefFile {
  validation_tolerance_absolute: number;
  cases: Record<Scenario, RefCase>;
  base_sensitivity_matrix: { data: number[][] };
}

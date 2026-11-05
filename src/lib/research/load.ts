/** Server-side loader: reads the supplied files at build time, validates, normalizes. Never mutates sources. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "./csv";
import { Manifest, type Company } from "./schema";
import { integrityErrors, normalize } from "./validate";

const DIR = join(process.cwd(), "Ridgepeak_Fortress_Research");
const read = (f: string) => readFileSync(join(DIR, f), "utf8");

export interface Dataset {
  companies: Company[];
  manifest: ReturnType<typeof Manifest.parse>;
}

let cache: Dataset | undefined;
export function loadDataset(): Dataset {
  if (cache) return cache;
  const pipeline = parseCsv(read("screening_pipeline_30.csv"));
  const evidence = parseCsv(read("evidence_register.csv"));
  const companies = normalize(pipeline, evidence);
  const manifest = Manifest.parse(JSON.parse(read("research_manifest.json")));
  const errs = integrityErrors(companies, evidence);
  if (manifest.population_count !== companies.length) errs.push("manifest population_count mismatch");
  if (errs.length) throw new Error("Dataset integrity failure:\n" + errs.join("\n"));
  cache = { companies, manifest };
  return cache;
}

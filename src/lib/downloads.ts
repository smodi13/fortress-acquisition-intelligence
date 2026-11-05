import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import list from "@/data/downloads.json";

export interface DownloadInfo {
  file: string;
  label: string;
  kind: string;
  description: string;
  bytes: number;
  sha256: string;
  href: string;
}

/** Server-only: hashes the SOURCE file so the page can show exactly what the download must equal. */
export function downloadInfo(): DownloadInfo[] {
  return list.map((d) => {
    const p = join(process.cwd(), "Ridgepeak_Fortress_Research", d.file);
    return {
      ...d,
      bytes: statSync(p).size,
      sha256: createHash("sha256").update(readFileSync(p)).digest("hex"),
      href: `/downloads/${d.file}`,
    };
  });
}

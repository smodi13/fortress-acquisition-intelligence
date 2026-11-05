// Copies the supplied research artifacts byte-for-byte into public/downloads.
// Source files are never modified. A sha256 check fails the build on any mismatch.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export const DOWNLOADS = JSON.parse(readFileSync("src/data/downloads.json", "utf8")).map((d) => d.file);
const src = "Ridgepeak_Fortress_Research";
const dst = join("public", "downloads");
mkdirSync(dst, { recursive: true });
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
for (const f of DOWNLOADS) {
  copyFileSync(join(src, f), join(dst, f));
  if (sha(join(src, f)) !== sha(join(dst, f))) throw new Error(`Download copy mismatch: ${f}`);
}
console.log(`synced ${DOWNLOADS.length} downloads`);

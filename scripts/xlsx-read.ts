/**
 * Minimal read-only reader for the supplied workbook (OOXML with an `x:` namespace prefix,
 * which common npm readers do not parse). Returns formulas and cached values per cell.
 */
import { unzipSync, strFromU8 } from "fflate";
import { readFileSync } from "node:fs";

export interface Cell {
  /** cached value: number for t="n", string otherwise */
  v: number | string | null;
  /** formula text without leading "=", if the cell is a formula */
  f: string | null;
}
export type Sheet = Map<string, Cell>;

const unescape = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export function readWorkbook(path: string): Map<string, Sheet> {
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  const text = (n: string) => {
    const f = files[n.replace(/^\//, "")];
    if (!f) throw new Error(`xlsx part missing: ${n}`);
    return strFromU8(f).replace(/^﻿/, "");
  };
  const rels = new Map<string, string>();
  for (const m of text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    const id = /Id="([^"]+)"/.exec(tag)?.[1];
    const target = /Target="([^"]+)"/.exec(tag)?.[1];
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : "xl/" + target);
  }
  const out = new Map<string, Sheet>();
  for (const m of text("xl/workbook.xml").matchAll(/<(?:x:)?sheet\b[^>]*>/g)) {
    const name = unescape(/name="([^"]+)"/.exec(m[0])?.[1] ?? "");
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1] ?? "";
    const part = rels.get(rid);
    if (!part) throw new Error(`no relationship for sheet ${name}`);
    const xml = text(part);
    const sheet: Sheet = new Map();
    for (const c of xml.matchAll(/<(?:x:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:x:)?c>)/g)) {
      const attrs = c[1] ?? "";
      const body = c[2];
      if (body === undefined) continue;
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "n";
      const raw = /<(?:x:)?v>([\s\S]*?)<\/(?:x:)?v>/.exec(body)?.[1];
      const f = /<(?:x:)?f>([\s\S]*?)<\/(?:x:)?f>/.exec(body)?.[1];
      const v = raw === undefined ? null : type === "n" ? Number(raw) : unescape(raw);
      sheet.set(ref, { v, f: f === undefined ? null : unescape(f) });
    }
    out.set(name, sheet);
  }
  return out;
}

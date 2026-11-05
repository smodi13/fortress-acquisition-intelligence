import { downloadInfo } from "@/lib/downloads";

const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`);

/** Links to exact, byte-for-byte copies of the supplied files (verified by SHA-256 at build and in tests). */
export function Downloads({ compact = false }: { compact?: boolean }) {
  const items = downloadInfo();
  return (
    <ul className="clean" aria-label="Downloadable research files">
      {items.map((d) => (
        <li key={d.file}>
          <a href={d.href} download={d.file} data-testid={`download-${d.file}`}>
            {d.label}
          </a>{" "}
          <span className="tag unk">{d.kind}</span> <span className="small muted">{kb(d.bytes)}</span>
          {!compact && (
            <>
              <div className="small muted">{d.description}</div>
              <div className="src">
                SHA-256 <code>{d.sha256.slice(0, 16)}…</code> (exact copy of the supplied file)
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

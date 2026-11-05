"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const ROUTES = [
  { href: "/", label: "Overview" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/market", label: "Market" },
  { href: "/underwriting", label: "Underwriting" },
  { href: "/sensitivity", label: "Scenarios" },
  { href: "/execution", label: "Execution" },
  { href: "/evidence", label: "Evidence" },
  { href: "/methodology", label: "Methodology" },
] as const;

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const current = (href: string) =>
    href === "/"
      ? path === "/"
      : path === href ||
        path.startsWith(href + "/") ||
        (href === "/pipeline" && path.startsWith("/companies"));
  return (
    <>
      <button
        className="btn secondary menu-btn"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen(!open)}
      >
        Menu
      </button>
      <nav className="nav" id="site-nav" aria-label="Primary" data-open={open}>
        <ul>
          {ROUTES.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                aria-current={current(r.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

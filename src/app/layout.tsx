import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ModelProvider } from "@/components/ModelProvider";
import { DISCLAIMER } from "@/data/narrative";

export const metadata: Metadata = {
  title: { default: "Fortress Acquisition Intelligence", template: "%s · Fortress Acquisition Intelligence" },
  description:
    "Independent applicant work sample: Texas residential home-services acquisition sourcing and illustrative underwriting.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <div className="disclaimer" role="note" data-testid="disclaimer">
          {DISCLAIMER}
        </div>
        <header className="topbar">
          <div className="topbar-in">
            <Link className="brand" href="/">
              FORTRESS <span>ACQUISITION INTELLIGENCE</span>
            </Link>
            <Nav />
          </div>
        </header>
        <ModelProvider>
          <main id="main" tabIndex={-1}>
            {children}
          </main>
        </ModelProvider>
        <footer>
          <div className="in">
            <p>{DISCLAIMER}</p>
            <p>
              As of November 4, 2026. No company has been contacted. No company has been verified as being for
              sale. No company financial statements are available. All dollar figures on the underwriting
              pages are in USD millions and belong to an unnamed illustrative transaction.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

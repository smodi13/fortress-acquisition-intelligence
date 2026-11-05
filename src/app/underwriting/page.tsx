import type { Metadata } from "next";
import { PageHead, IllustrativeBanner } from "@/components/ui";
import { UnderwritingClient } from "./UnderwritingClient";

export const metadata: Metadata = { title: "Acquisition Underwriting" };

export default function Underwriting() {
  return (
    <>
      <PageHead title="Acquisition Underwriting">
        <p>
          A separate, unmistakably illustrative transaction for an unnamed sample acquisition. Edit approved
          assumptions; every output recalculates immediately from the workbook’s formula logic. Amounts in USD
          millions.
        </p>
      </PageHead>
      <IllustrativeBanner />
      <UnderwritingClient />
    </>
  );
}

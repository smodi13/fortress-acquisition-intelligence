import type { Metadata } from "next";
import { PageHead, IllustrativeBanner } from "@/components/ui";
import { SensitivityClient } from "./SensitivityClient";

export const metadata: Metadata = { title: "Scenario and Sensitivity Analysis" };

export default function Sensitivity() {
  return (
    <>
      <PageHead title="Scenario and Sensitivity Analysis">
        <p>
          Compare the downside, base and upside cases, see what drives sponsor returns, and test entry and
          exit valuation. Assumptions are shared with the Underwriting page. Everything shown is calculated;
          nothing is a market quote.
        </p>
      </PageHead>
      <IllustrativeBanner />
      <SensitivityClient />
    </>
  );
}

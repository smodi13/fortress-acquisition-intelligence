import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHead } from "@/components/ui";
import { loadDataset } from "@/lib/research/load";
import { PipelineClient } from "./PipelineClient";

export const metadata: Metadata = { title: "Acquisition Pipeline" };

export default function Pipeline() {
  const { companies } = loadDataset();
  return (
    <>
      <PageHead title="Acquisition Pipeline">
        <p>
          Research workspace for {companies.length} publicly identified Texas operators. Search, filter and
          sort; filters are saved in the URL. The ranking is a transparent weighted screen of analyst ratings,
          not a deal pipeline: nothing here is contacted, verified for sale, or valued.
        </p>
      </PageHead>
      <Suspense fallback={<p>Loading pipeline…</p>}>
        <PipelineClient companies={companies} />
      </Suspense>
    </>
  );
}

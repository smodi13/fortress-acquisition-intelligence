"use client";
import { PageHead } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <PageHead title="Something went wrong">
        <p role="alert">
          This view failed to render{error.digest ? ` (ref ${error.digest})` : ""}. No data was changed.
        </p>
      </PageHead>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </>
  );
}

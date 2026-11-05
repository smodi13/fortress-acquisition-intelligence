import Link from "next/link";
import { PageHead } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <PageHead title="Page not found">
        <p>
          That page or company record does not exist. The research set contains exactly 30 companies (
          <code>FAI-001</code> to <code>FAI-030</code>).
        </p>
      </PageHead>
      <p>
        <Link className="btn" href="/pipeline">
          Open the acquisition pipeline
        </Link>{" "}
        <Link className="btn secondary" href="/">
          Back to overview
        </Link>
      </p>
    </>
  );
}

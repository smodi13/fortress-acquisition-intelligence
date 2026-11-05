import type { Metadata } from "next";
import { Callout, PageHead, Tag } from "@/components/ui";
import {
  NOT_COMMENCED,
  PLAYBOOK_NOTE,
  callGuide,
  closingReadiness,
  diligenceChecklist,
  integrationPlan,
  loiFramework,
  loiTbd,
  riskRegister,
  stageStatus,
  stages,
} from "@/data/narrative";

export const metadata: Metadata = { title: "Deal Execution" };

const Status = ({ children = NOT_COMMENCED }: { children?: string }) => (
  <span className="tag unk">{children}</span>
);

export default function Execution() {
  return (
    <>
      <PageHead title="Deal Execution">
        <p>
          A simulated transaction workflow translated from the Transaction Execution Playbook. It shows what a
          team would do; none of it has started.
        </p>
      </PageHead>
      <Callout kind="warn">
        <strong>Illustrative · hypothetical · not commenced.</strong> {PLAYBOOK_NOTE.value} There is no active
        outreach, no buyer representation, no seller contact and no deal stage progress for any company.
        Statuses below are fixed labels, not tracked activity.
      </Callout>

      <section className="card" aria-labelledby="h-stages">
        <h2 id="h-stages">Qualification funnel and stop/advance gates</h2>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Qualification stages">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Stage</th>
                <th>Professional deliverable</th>
                <th>Stop / advance test</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => (
                <tr key={s.n}>
                  <td className="num">{s.n}</td>
                  <th scope="row">{s.stage}</th>
                  <td>{s.deliverable}</td>
                  <td>{s.gate}</td>
                  <td>
                    <Status>{stageStatus(s.n)}</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details>
          <summary>Illustrative owner qualification call guide</summary>
          <ul className="clean">
            {callGuide.map(([k, v]) => (
              <li key={k}>
                <strong>{k}.</strong> {v}
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card" style={{ marginTop: "1rem" }} aria-labelledby="h-loi">
        <h2 id="h-loi">
          LOI preparation checklist <Tag kind="assm">Simulation, not an offer</Tag>
        </h2>
        <p>
          A framework for counsel and deal leadership, not a letter to send. To be determined after diligence:{" "}
          {loiTbd.join(", ")}. The illustrative workbook is not a basis to quote a live price.
        </p>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
          <table>
            <thead>
              <tr>
                <th>Term category</th>
                <th>Example decision framework (not binding)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loiFramework.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>{v}</td>
                  <td>
                    <Status>TO BE DETERMINED</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: "1rem" }} aria-labelledby="h-dd">
        <h2 id="h-dd">Diligence workstreams and tracker</h2>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Diligence tracker">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Request or analysis</th>
                <th>Investment question</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {diligenceChecklist.map((d) => (
                <tr key={d.request}>
                  <td>
                    <span className={`pill ${d.priority === "Critical" ? "bad" : "med"}`}>{d.priority}</span>
                  </td>
                  <td>{d.request}</td>
                  <td>{d.question}</td>
                  <td>
                    <Status>{NOT_COMMENCED}</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid g2" style={{ marginTop: "1rem" }}>
        <section className="card" aria-labelledby="h-risk">
          <h2 id="h-risk">Risk register and escalation criteria</h2>
          <ul className="clean">
            {riskRegister.map((r) => (
              <li key={r.risk}>
                <strong>{r.risk}.</strong> {r.response}
              </li>
            ))}
          </ul>
          <p className="src">
            Playbook p.4. The playbook assigns no owners or dates; none are invented here.
          </p>
        </section>
        <section className="card" aria-labelledby="h-close">
          <h2 id="h-close">Closing-readiness framework</h2>
          <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
            <table>
              <thead>
                <tr>
                  <th>Gate</th>
                  <th>Test</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {closingReadiness.map((g) => (
                  <tr key={g.gate}>
                    <th scope="row">
                      {g.gate}
                      <div className="src">{g.origin}</div>
                    </th>
                    <td>{g.test}</td>
                    <td>
                      <Status>{NOT_COMMENCED}</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: "1rem" }} aria-labelledby="h-100">
        <h2 id="h-100">
          Post-close integration plan: first 100 days <Tag kind="assm">Hypothetical milestones</Tag>
        </h2>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Data table, scrollable">
          <table>
            <thead>
              <tr>
                <th>Days</th>
                <th>Operations workplan</th>
                <th>Metrics to validate</th>
              </tr>
            </thead>
            <tbody>
              {integrationPlan.map((p) => (
                <tr key={p.days}>
                  <th scope="row">{p.days}</th>
                  <td>{p.workplan}</td>
                  <td>{p.metrics}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="src">No transaction has closed, so no integration has begun.</p>
      </section>
    </>
  );
}

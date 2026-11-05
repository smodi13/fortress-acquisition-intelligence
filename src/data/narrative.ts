/**
 * Narrative content transcribed from the supplied PDFs. Each block cites its source document
 * and page. No investment judgments are authored here.
 */
export interface Cited<T> {
  source: string;
  page: number;
  value: T;
}

export const DISCLAIMER =
  "Independent applicant work sample. Not affiliated with Ridgepeak Partners or Fortress Service Partners. Company data is public and unverified. Financial case is illustrative.";

const BRIEF = "Acquisition Pipeline Executive Brief";
const MEMO = "Conditional Investment Committee Memorandum";
const PLAYBOOK = "Transaction Execution Playbook";

export const thesis: Cited<string>[] = [
  {
    source: BRIEF,
    page: 1,
    value:
      "Fortress describes a buy-and-build network of locally branded residential service businesses. Ridgepeak has publicly listed Fortress as a portfolio company.",
  },
  {
    source: BRIEF,
    page: 1,
    value:
      "The objective is to identify companies warranting qualification, not to assert that they are for sale.",
  },
  {
    source: BRIEF,
    page: 1,
    value:
      "Preliminary result: prioritize Central Texas multi-trade or residential repair-and-maintenance operators for additional research. Do not extrapolate revenue, margins, owner liquidity needs, or seller receptivity from web descriptions.",
  },
];

export const sectorPerspective: Cited<string>[] = [
  {
    source: BRIEF,
    page: 1,
    value:
      "HVAC, electrical and plumbing include essential repair work, but equipment replacement and discretionary project work can introduce cyclicality.",
  },
  {
    source: BRIEF,
    page: 1,
    value:
      "Technician recruitment, dispatch productivity, service agreement retention and geographic density are critical diligence drivers; these metrics are not yet available for the prospects.",
  },
  {
    source: BRIEF,
    page: 1,
    value:
      "The acquisition thesis depends on a credible multi-year field-operations integration plan, not on multiple expansion alone.",
  },
];

export const recommendation: Cited<string> = {
  source: MEMO,
  page: 4,
  value:
    "STATUS: NOT READY FOR OFFER. Conditional approval for research qualification only. A transaction cannot be recommended on public web content alone. The first milestone is a credible seller relationship and sufficient financial data to replace every hypothetical company-level input.",
};

export const decisionSought: Cited<string> = {
  source: MEMO,
  page: 1,
  value:
    "Approve deeper sourcing diligence and a voluntary owner qualification conversation only if performed under proper authorization. DO NOT approve pricing, an LOI, lender discussions, or a live transaction.",
};

export const risks: Cited<string>[] = [
  {
    source: MEMO,
    page: 2,
    value: "Seller fit is unknown and an independent owner may reject institutional investment outright.",
  },
  {
    source: MEMO,
    page: 2,
    value:
      "Reported services and heritage may mask reliance on new equipment replacement rather than recurring repair and maintenance.",
  },
  {
    source: MEMO,
    page: 2,
    value:
      "Technician retention, licensing compliance, field safety, customer acquisition cost and warranty reserves may be weaker than peer narrative implies.",
  },
  {
    source: MEMO,
    page: 2,
    value:
      "Competitive sponsor demand can erase returns through high entry multiples; margin for underperformance is thin in the illustrative model.",
  },
  {
    source: MEMO,
    page: 4,
    value:
      "The assumed 5.50x exit multiple exceeds 5.00x entry, so downside sensitivity to valuation is economically important.",
  },
];

export const verifiedVsUnknown = {
  source: `${MEMO}, p.2`,
  reported: [
    "Central Texas HVAC and plumbing presence; the Woods family HVAC history dates to 1956, but this Central Texas company was opened in 2008.",
    "Website names Christopher Alan Woods as owner/operator and describes generational leadership.",
    "Company states it remains independent and has not been acquired by private equity.",
    "Company promotes repair, installation and related home services.",
  ],
  unknown: [
    "Revenue, EBITDA, free cash flow, balance sheet, utilization, customer counts and concentration.",
    "Owner willingness to sell or partner, legal ownership, succession priorities and price expectations.",
    "Whether minority, majority, earnout or partnership terms could ever align.",
    "Recurring agreement retention, revenue mix, new-build exposure and warranty claims.",
  ],
};

export const diligenceGates: Cited<[string, string]>[] = [
  [
    "Owner / entity",
    "Equity holders, entity chart, ownership restrictions, seller objectives and related-party contracts.",
  ],
  [
    "Quality of earnings",
    "Three years of accrual financials, tax returns, job-level contribution, normalized adjustments and cash conversion.",
  ],
  [
    "Customer economics",
    "Service vs install vs new-construction vs commercial split; service agreement renewal / churn; top customers.",
  ],
  [
    "Operations",
    "Technician headcount and tenure, utilization, dispatch density, callback rate, fleet age and maintenance.",
  ],
  [
    "Regulatory / risk",
    "TDLR and plumbing licenses, permit history, insurance, claims, worker safety, warranty exposure.",
  ],
  [
    "Pricing / deal terms",
    "Normalized trailing EBITDA, enterprise-to-equity bridge, working capital peg, debt-like items, tax exposure, rollover rights.",
  ],
  [
    "Integration",
    "Systems migration, manager incentives, local brand preservation, dispatch optimization, 100-day KPIs.",
  ],
].map((v) => ({ source: MEMO, page: 4, value: v as [string, string] }));

export const thirtyDaySequence: Cited<string>[] = [
  {
    source: BRIEF,
    page: 3,
    value:
      "Week 1: independently verify corporate entities, licenses, operating geography, and signs of existing institutional ownership. Exclude contradicted leads.",
  },
  {
    source: BRIEF,
    page: 3,
    value:
      "Week 2: collect customer mix, maintenance program indicators, hiring history, public permits where appropriate and competitive density.",
  },
  {
    source: BRIEF,
    page: 3,
    value:
      "Week 3: construct a 10-company qualification shortlist with seller-partnership narrative and evidence-backed potential objections.",
  },
  {
    source: BRIEF,
    page: 3,
    value:
      "Week 4: if authorized by Ridgepeak, develop respectful, bespoke owner outreach and request high-level operational metrics; never imply investor affiliation in independent outreach.",
  },
];

export const woodsNote: Cited<string> = {
  source: BRIEF,
  page: 3,
  value:
    "Woods Comfort Systems: lead for research qualification, not an acquisition recommendation. The business emphasizes independence and has not publicly disclosed verifiable EBITDA or transaction intent.",
};

// ---------- Execution (Transaction Execution Playbook) ----------
export const NOT_COMMENCED = "NOT COMMENCED";

export const stages: { n: number; stage: string; deliverable: string; gate: string }[] = [
  {
    n: 1,
    stage: "Research",
    deliverable: "Source evidence, trade fit, public owner background",
    gate: "Do ownership / service claims reconcile with state records?",
  },
  {
    n: 2,
    stage: "Qualification",
    deliverable: "Owner-specific thesis, call preparation and desired next steps",
    gate: "Is owner willing to speak, and is any potential structure aligned?",
  },
  {
    n: 3,
    stage: "Financial profile",
    deliverable: "High-level reported revenue, mix, EBITDA, margin normalization",
    gate: "Is there enough verifiable economics to price reasonably?",
  },
  {
    n: 4,
    stage: "Confidentiality",
    deliverable: "Mutual NDA, scope of diligence, secure document exchange",
    gate: "Has seller and counsel authorized disclosure?",
  },
  {
    n: 5,
    stage: "Indicative pricing",
    deliverable: "Nonbinding LOI with valuation range, rollover and constraints",
    gate: "Does downside return work and is owner aligned?",
  },
  {
    n: 6,
    stage: "Exclusivity and diligence",
    deliverable: "QOE, operational, legal, regulatory, insurance and cybersecurity",
    gate: "Are deal-breakers closed or priced?",
  },
  {
    n: 7,
    stage: "Signing / close",
    deliverable: "Definitive agreements, approvals, funding and transition plan",
    gate: "Are all conditions met?",
  },
];
/** Stage 1 (desk research from public sources) is the only stage the supplied materials describe as done, in part. */
export const stageStatus = (n: number) =>
  n === 1 ? "PUBLIC DESK RESEARCH ONLY: licenses and ownership NOT verified" : NOT_COMMENCED;

export const callGuide: [string, string][] = [
  [
    "Opening",
    "Explain who you are and whom you represent truthfully; seek permission to discuss a potential partnership, never imply a firm relationship that does not exist.",
  ],
  [
    "Business",
    "What percentage of activity is maintenance, repairs, replacements, new construction and commercial jobs?",
  ],
  [
    "Workforce",
    "How many technicians and dispatchers, what is average tenure, how many licensed trade supervisors, and how is capacity tracked?",
  ],
  [
    "Customer economics",
    "Are there service memberships, what is annual retention and are repeat calls concentrated in specific neighborhoods?",
  ],
  [
    "Owner objectives",
    "What future growth requires support, which elements of the brand must stay local, and how important are liquidity versus retained ownership?",
  ],
  [
    "Next steps",
    "Only with consent, request a short profile and agree on an appropriate, confidential follow-up.",
  ],
];

export const loiFramework: [string, string][] = [
  [
    "Structure",
    "Equity or asset acquisition TBD; scope and tax consequences subject to legal and tax advice.",
  ],
  [
    "Consideration",
    "Price requires verified normalized EBITDA, net debt, cash, transaction costs, and an agreed working-capital mechanism.",
  ],
  [
    "Rollover",
    "Potential pari passu ownership subject to seller goals, manager equity plan and control rights.",
  ],
  [
    "Earnout / seller note",
    "Use only to allocate objectively measurable risks, with clear accounting and dispute provisions.",
  ],
  ["Exclusivity", "Negotiated only following alignment and counsel review; no assumption of seller consent."],
  [
    "Conditions",
    "Definitive agreements, confirmatory QOE, financing, licenses, antitrust if applicable, material contracts, management retention.",
  ],
  [
    "Binding provisions",
    "Confidentiality, exclusivity and expenses may be binding only when correctly documented by counsel.",
  ],
];
export const loiTbd = [
  "Buyer",
  "Seller",
  "Date",
  "Entity",
  "Price",
  "Equity value",
  "Assumed debt",
  "Net working capital peg",
  "Exclusivity",
  "Target close date",
  "Operating covenants",
];

export const diligenceChecklist: { priority: "Critical" | "High"; request: string; question: string }[] = [
  {
    priority: "Critical",
    request: "3 years monthly P&L, balance sheets and tax returns",
    question: "Is reported EBITDA real, normalized and convertible to cash?",
  },
  {
    priority: "Critical",
    request: "Revenue by service type, cohorts and customer ZIP codes",
    question: "What fraction is recurring, emergency work, install, new-build, or commercial?",
  },
  {
    priority: "Critical",
    request: "Employee census, license holders, turnover and compensation",
    question: "Will the business retain enough qualified technicians after closing?",
  },
  {
    priority: "Critical",
    request: "Customer reviews, callbacks, warranty liabilities",
    question: "Is service quality stable and adequately reserved?",
  },
  {
    priority: "High",
    request: "Job cost and technician profitability data",
    question: "What is route-level contribution before corporate allocation?",
  },
  {
    priority: "High",
    request: "Seller compensation, related parties, owner real estate",
    question: "What normalization and ownership dependencies exist?",
  },
  {
    priority: "High",
    request: "Truck fleet, equipment and deferred capex",
    question: "Is reported free cash flow overstated?",
  },
  {
    priority: "High",
    request: "Maintenance contracts, renewals and churn by cohort",
    question: "Is repeat revenue durable or merely repetitive one-offs?",
  },
  {
    priority: "High",
    request: "Permits, licenses, insurance and litigation",
    question: "Any non-transferable licenses or transaction liabilities?",
  },
  {
    priority: "High",
    request: "IT stack, dispatch software, payment collection and cybersecurity",
    question: "Can platform shared services create real value?",
  },
];

export const riskRegister: { risk: string; response: string }[] = [
  {
    risk: "Seller refuses engagement",
    response: "Do not continue unsolicited contact; move to a different research lead.",
  },
  { risk: "License / insurance gap", response: "Stop transaction and request counsel assessment." },
  {
    risk: "Negative normalized EBITDA adjustments or weak cash conversion",
    response: "Rerun model from verified statements and reprice, or discontinue.",
  },
  {
    risk: "Technician attrition and owner reliance",
    response: "Require retention plan and downside margin case.",
  },
  {
    risk: "Exit-multiple dependence",
    response: "Ensure sponsor return meets hurdle on conservative exit assumptions.",
  },
];

export const integrationPlan: { days: string; workplan: string; metrics: string }[] = [
  {
    days: "0-30",
    workplan:
      "Retain local leadership, stabilize technicians, establish KPI baselines, protect brand identity.",
    metrics: "Employee retention, customer complaints, calls accepted, completed jobs, cash collection.",
  },
  {
    days: "31-60",
    workplan: "Map dispatch zones and training opportunities; evaluate procurement and fleet savings.",
    metrics: "Drive time, calls per tech, parts availability, callback rate, spend per vehicle.",
  },
  {
    days: "61-100",
    workplan:
      "Test carefully scoped service-agreement offers and customer cross-sell; validate integration ROI.",
    metrics: "Renewal conversion, service gross margin, customer acquisition cost, capacity and NPS.",
  },
];

/** Closing-readiness framework: assembled only from the playbook's stage gates 4-7, LOI conditions and risk escalations. */
export const closingReadiness: { gate: string; test: string; origin: string }[] = [
  {
    gate: "Seller and counsel authorization to disclose",
    test: "Has seller and counsel authorized disclosure?",
    origin: "Playbook p.2, Stage 4",
  },
  {
    gate: "Return holds on conservative assumptions",
    test: "Does downside return work and is owner aligned?",
    origin: "Playbook p.2, Stage 5",
  },
  {
    gate: "Deal-breakers closed or priced",
    test: "Are deal-breakers closed or priced?",
    origin: "Playbook p.2, Stage 6",
  },
  {
    gate: "Licenses and insurance cleared",
    test: "License / insurance gap: stop transaction and request counsel assessment.",
    origin: "Playbook p.4, Risk register",
  },
  {
    gate: "Confirmatory QOE supports price",
    test: "Rerun model from verified statements and reprice, or discontinue.",
    origin: "Playbook p.4, Risk register",
  },
  {
    gate: "Definitive agreements, approvals, funding, transition plan",
    test: "Are all conditions met?",
    origin: "Playbook p.2, Stage 7",
  },
];

export const PLAYBOOK_NOTE: Cited<string> = {
  source: PLAYBOOK,
  page: 1,
  value:
    "This playbook is a simulation of what a junior investment professional would prepare for an authorized sponsor team. No real company has been contacted, no terms have been offered, and no diligence request has been made.",
};

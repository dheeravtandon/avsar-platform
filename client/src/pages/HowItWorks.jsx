import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicShell from '../components/PublicShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints } from '../lib/api.js';
import { Card, DataTable, Notice, Status, Tabs, Tag } from '../components/ui.jsx';
import { STAGES } from '../components/Stepper.jsx';

const FLOW = [
  {
    stage: 'ASSESS', letter: 'A', title: 'Assess — the department frames the problem',
    owner: 'Nodal Officer, approved by Department Head',
    duration: '5–10 working days',
    steps: [
      ['Frame the outcome, not the product', 'The officer writes what has to change and by how much. A technical specification is explicitly not asked for, because specifying the solution is what excludes new approaches.'],
      ['Declare the baseline', 'Where the number sits today, measured the same way it will be measured during the pilot. Without a baseline a pilot cannot be judged.'],
      ['Declare the KPIs', 'Each with a target, a unit and a direction. These exact numbers, and no others, decide whether the pilot succeeded.'],
      ['Set the pilot budget ceiling and window', 'A capped amount and a fixed duration, drawn from the department innovation head.'],
      ['State the scale-up prize', 'The indicative value and volume if the pilot works. This is what makes a small pilot worth a startup\'s time.'],
      ['Department Head approves and publishes', 'The problem statement gets a file number and goes live. Startups in the matching sector are notified.'],
    ],
    artefact: 'Problem statement AVS/CH/YYYY/NNNN',
    gate: 'Cannot publish without at least one measurable KPI and a budget ceiling.',
  },
  {
    stage: 'VALIDATE', letter: 'V', title: 'Validate — eligibility, then merit',
    owner: 'Platform evidence engine, initiated by an authorised evaluator',
    duration: '15–25 working days',
    steps: [
      ['Startup applies', 'Solution summary, approach, claimed TRL, quoted pilot cost, timeline, differentiators and honest risks. Prior government experience is asked for as information, never as a qualification.'],
      ['Statutory gate runs automatically', 'DPIIT recognition and validity, entity age under ten years, turnover never above INR 100 crore, not formed by reconstruction, correct entity type. Each check is stored with the rule it comes from.'],
      ['Challenge fit gate', 'Claimed TRL against the declared floor, quoted cost against the ceiling, proposed timeline against the pilot window.'],
      ['Relaxations applied', 'Prior turnover and prior experience waived, EMD and tender fee exempted. Applied by default, recorded on the file.'],
      ['Evaluator assigned', 'An authorised evaluator is assigned by the nodal officer and must declare any conflict of interest before starting the calculation.'],
      ['Blind evidence evaluation', 'The evaluator sees the solution, not the applicant. The versioned engine derives capability, fit, evidence, governance, scalability, readiness, security, financial and risk scores from stored records.'],
      ['Confidence and risk controls', 'Weak evidence reduces claimed capability and fit. Eligibility failure, critical security risk and failed mandatory KPIs override mathematical averages.'],
      ['Result locked and explained', 'The final score, recommendation, positive and negative factors, review flags and missing-data limitations are stored together and written to the hash-chained audit trail.'],
    ],
    artefact: 'Application AVS/AP/YYYY/NNNN with an itemised gate result',
    gate: 'A blocked applicant is told the exact criterion and the exact rule. Nothing is decided informally.',
  },
  {
    stage: 'SANDBOX', letter: 'S', title: 'Sandbox — a funded, measured pilot',
    owner: 'Pilot Monitor, with the startup',
    duration: '3–6 months',
    steps: [
      ['Sanction order issued', 'Budget sanctioned within the published ceiling, against the department innovation head.'],
      ['Pilot agreement executed', 'Scope, milestones, payment schedule, IP ownership (the startup retains it by default), exit clause.'],
      ['DPDP data processing agreement', 'The pilot cannot be set live until this is on record. The platform enforces it as a hard precondition, not a checkbox.'],
      ['Milestones with linked payment', 'Typically four, summing to 100% of the sanctioned amount. Evidence is uploaded against each.'],
      ['Monthly KPI readings', 'Actuals recorded against the targets declared at Stage 1, by the startup and verified by the monitor.'],
      ['Acceptance starts the payment clock', 'On milestone acceptance, a payment falls due within 45 days under section 15 of the MSMED Act. The clock is visible to both sides.'],
      ['Closure verdict', 'The monitor or department head records SUCCESS, PARTIAL or FAILED against the declared KPIs, with a written note.'],
    ],
    artefact: 'Pilot AVS/PL/YYYY/NNNN with a KPI scorecard',
    gate: 'A failed pilot is closed with structured feedback and no bar on future applications. Failing is a permitted outcome; that is the point of a sandbox.',
  },
  {
    stage: 'ADOPT', letter: 'A', title: 'Adopt — procurement on evidence',
    owner: 'Procurement Officer, sanctioned by Department Head',
    duration: '10–20 working days',
    steps: [
      ['Evidence gate', 'A procurement cannot even be drafted unless the linked pilot carries a SUCCESS or PARTIAL verdict. The platform refuses it.'],
      ['Mode selected under a named rule', 'Single source (R.166 with R.173(i)), limited tender among pilot participants (R.162), GeM (R.149), or rate contract (R.145).'],
      ['Written justification', 'Mandatory, minimum length enforced, and placed on the audit record. This is the document an auditor will read first.'],
      ['Department Head sanctions', 'Approval is reserved to the head; a procurement officer may prepare but not sanction.'],
      ['Purchase order and PFMS reference', 'PO number generated; payments carry a PFMS transaction reference.'],
    ],
    artefact: 'Procurement AVS/PR/YYYY/NNNN with the GFR rule on its face',
    gate: 'No pilot evidence, no procurement. No named rule, no sanction.',
  },
  {
    stage: 'RAMPUP', letter: 'R', title: 'Ramp-up — buy once, deploy many',
    owner: 'Procurement Officer, then any other department',
    duration: 'Continuous',
    steps: [
      ['Listed on the Proven Solutions Registry', 'With the measured pilot KPIs attached, so a second department sees evidence rather than a claim.'],
      ['Rate contract published', 'Unit price, unit of measure and validity. Typically two years.'],
      ['Another department draws down', 'It records its own quantity, value and sanction. Discovery, evaluation and pilot are not repeated.'],
      ['Impact aggregated', 'Adoptions, value and outcomes roll up to the public transparency board.'],
    ],
    artefact: 'Catalogue entry AVS/CT/YYYY/NNNN',
    gate: 'A listing suspends automatically when the rate contract expires.',
  },
];

const ROLES = [
  ['Startup', 'Registers with DPIIT recognition, applies to problem statements, runs pilots, raises invoices and grievances.', 'Own applications, own pilots, own contracts, own payments. Public listings.'],
  ['Nodal Officer', 'Drafts problem statements, assigns the evaluation committee, shortlists, creates pilots.', 'Everything within their own department. Cannot approve their own publication.'],
  ['Department Head', 'Approves publication, sanctions procurement, records pilot closure verdicts, reads the audit trail.', 'Everything within their own department, plus approval authority.'],
  ['Evaluator', 'Initiates the automated evidence evaluation after declaring conflict of interest and reviews its explanation.', 'Only applications assigned to them, blind until the result is submitted.'],
  ['Pilot Monitor', 'Reviews milestone evidence, verifies KPI readings, records the closure verdict.', 'Pilots in their own department.'],
  ['Procurement Officer', 'Drafts procurement proposals, issues purchase orders, releases payments, lists proven solutions.', 'Procurement and payments in their own department.'],
  ['Platform Administrator', 'Manages accounts, verifies KYC, verifies audit-chain integrity.', 'Platform-wide, but cannot score, approve or sanction on behalf of a department.'],
];

const STACK = [
  ['Language', 'JavaScript (ES2022 modules) end to end — no transpiled second language on the server, JSX on the client.'],
  ['Frontend', 'React 18 with React Router 6, built by Vite 5. Charts by Recharts. No UI kit: the design system is hand-written CSS with design tokens.'],
  ['Backend', 'Node.js 22+ with Express 4. ES modules throughout. Zod for request validation at the edge of every route.'],
  ['Database', 'SQLite through the built-in node:sqlite module — zero native dependencies, so the project installs and runs anywhere Node runs. The schema is written in portable SQL and moves to PostgreSQL unchanged for production.'],
  ['Authentication', 'JSON Web Tokens, 8-hour expiry, bcrypt password hashing. Role-based authorisation enforced server-side on every route, never in the client.'],
  ['Audit', 'SHA-256 hash-chained append-only log. Each entry hashes the previous entry, so any retrospective edit breaks the chain and is detected by the integrity check.'],
  ['Accessibility', 'Semantic landmarks, skip link, visible focus rings, ARIA on live regions and progress bars, prefers-reduced-motion respected. Targets GIGW 3.0 and WCAG 2.1 AA.'],
];

export default function HowItWorks() {
  useDocumentTitle('How the model works');
  const { data: meta } = useApi(endpoints.meta(), []);
  const [tab, setTab] = useState('flow');

  return (
    <PublicShell>
      <section className="hero" style={{ padding: 'var(--s-12) 0' }}>
        <div className="hero__in">
          <span className="hero__eyebrow"><b>Reference</b> The complete mechanism, stage by stage</span>
          <h1 style={{ maxWidth: '24ch' }}>From a number that needs to move to a contract that can be reused.</h1>
          <p className="hero__lede">
            This page is the specification of the mechanism: what happens at each stage, who owns it,
            what gate has to be satisfied to move on, what artefact it produces, and which rule
            authorises it.
          </p>
        </div>
      </section>

      <div className="page">
        <div className="mb-6">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'flow', label: 'The five stages' },
              { key: 'roles', label: 'Roles and access' },
              { key: 'legal', label: 'Statutory basis' },
              { key: 'scoring', label: 'How applications are scored' },
              { key: 'tech', label: 'How the platform is built' },
            ]}
          />
        </div>

        {tab === 'flow' && (
          <>
            <div className="grid grid--5 mb-8">
              {STAGES.map((s, i) => (
                <div key={s.key} className="stagecard">
                  <span className="stagecard__letter" aria-hidden>{s.letter}</span>
                  <div className="stagecard__n">Stage {i + 1}</div>
                  <h3>{s.label}</h3>
                  <p>{s.blurb}</p>
                </div>
              ))}
            </div>

            <div className="stack gap-6">
              {FLOW.map((f, i) => (
                <Card key={f.stage} title={f.title} subtitle={`${f.owner} · typical duration ${f.duration}`}>
                  <div className="grid grid--sidebar">
                    <ol className="stack gap-4" style={{ paddingLeft: 0, listStyle: 'none', counterReset: 'st' }}>
                      {f.steps.map(([t, d], n) => (
                        <li key={t} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                          <span
                            className="mono xs"
                            style={{
                              flex: 'none', width: 24, height: 24, borderRadius: '50%',
                              display: 'grid', placeItems: 'center',
                              background: 'var(--brand-050)', color: 'var(--brand-700)',
                              border: '1px solid var(--brand-100)',
                            }}
                          >
                            {i + 1}.{n + 1}
                          </span>
                          <span>
                            <span className="strong small">{t}</span>
                            <span className="dim small" style={{ display: 'block' }}>{d}</span>
                          </span>
                        </li>
                      ))}
                    </ol>

                    <div className="stack gap-3">
                      <div>
                        <div className="capline mb-2">Artefact produced</div>
                        <div className="mono small">{f.artefact}</div>
                      </div>
                      <div>
                        <div className="capline mb-2">Gate to the next stage</div>
                        <Notice tone="warning" icon={false}>{f.gate}</Notice>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {tab === 'roles' && (
          <Card title="Seven roles, one workflow" subtitle="Authorisation is enforced on the server for every route; the navigation only hides what the server would refuse anyway." flush>
            <DataTable
              columns={[
                { key: 'role', header: 'Role', render: (r) => <span className="cell-title">{r[0]}</span> },
                { key: 'does', header: 'What they do', render: (r) => <span className="small dim">{r[1]}</span> },
                { key: 'sees', header: 'What they can see', render: (r) => <span className="small dim">{r[2]}</span> },
              ]}
              rows={ROLES}
              rowKey={(r) => r[0]}
            />
          </Card>
        )}

        {tab === 'legal' && (
          <div className="stack gap-4">
            <Notice tone="legal" title="No new statute is required">
              Every relaxation applied and every route to award used by AVSAR already exists in the
              General Financial Rules or in a standing notification. The platform&apos;s contribution
              is to apply them consistently, automatically, and with a record.
            </Notice>

            <Card title="Instruments the platform relies on" flush>
              <DataTable
                columns={[
                  { key: 'code', header: 'Instrument', mono: true, render: (r) => <span className="mono small">{r.code}</span> },
                  { key: 'title', header: 'Subject', render: (r) => <span className="small">{r.title}</span> },
                  { key: 'date', header: 'Dated', render: (r) => <span className="small muted">{r.date || '—'}</span> },
                ]}
                rows={meta?.policy?.references ?? []}
                rowKey={(r) => r.code}
                empty={{ title: 'Loading' }}
              />
            </Card>

            <Card title="Relaxations applied automatically to every eligible applicant" flush>
              <DataTable
                columns={[
                  { key: 'label', header: 'Relaxation', render: (r) => <span className="cell-title">{r.label}</span> },
                  { key: 'authority', header: 'Authority', render: (r) => <span className="mono xs muted">{r.authority}</span> },
                ]}
                rows={meta?.policy?.relaxations ?? []}
                rowKey={(r) => r.code}
                empty={{ title: 'Loading' }}
              />
            </Card>

            <div className="grid grid--3">
              <Card title="Payment protection">
                <p className="small dim">
                  Section 15 of the MSMED Act 2006 requires payment within 45 days of acceptance. The
                  clock starts automatically on milestone acceptance, is visible to both parties, and a
                  breach is counted on the public transparency board.
                </p>
              </Card>
              <Card title="Data protection">
                <p className="small dim">
                  A pilot cannot be set live until the DPDP Act 2023 data processing agreement is
                  executed. Purpose limitation is enforced by the pilot scope; audit logs are retained
                  for 180 days in line with the CERT-In directions of 2022.
                </p>
              </Card>
              <Card title="Accessibility">
                <p className="small dim">
                  The interface targets GIGW 3.0 and WCAG 2.1 level AA: semantic landmarks, a skip
                  link, visible focus, sufficient contrast, no information conveyed by colour alone,
                  and reduced-motion support.
                </p>
              </Card>
            </div>
          </div>
        )}

        {tab === 'scoring' && (
          <div className="stack gap-4">
            <div className="grid grid--3">
              <Card title="Discovery match score">
                <p className="small dim mb-3">
                  Used to rank the registry for a department and to give a startup a fit indication
                  before it applies. It is a transparent weighted model, not an opaque one, because a
                  shortlist has to be defensible in audit.
                </p>
                {Object.entries(meta?.matching?.weights ?? {}).map(([k, v]) => (
                  <div key={k} className="row between small mb-2">
                    <span className="dim" style={{ textTransform: 'capitalize' }}>{k}</span>
                    <span className="tnum strong">{v} pts</span>
                  </div>
                ))}
                <div className="mt-3">
                  <Notice tone="legal" icon={false}>
                    Prior government track record contributes points but is never a gate. GFR 2017
                    Rule 173(i) waives prior experience as a qualification.
                  </Notice>
                </div>
              </Card>

              <Card title="Evidence evaluation">
                <p className="small dim mb-3">
                  The server-side engine combines capability, problem fit, verified evidence,
                  governance, scalability, pilot readiness, security, financial continuity and
                  risk. Its current version is {meta?.evaluationEngine?.algorithmVersion ?? '1.0.0'}.
                </p>
                <div className="stack gap-2 small">
                  <div className="row between"><span className="dim">Minimum preferred evidence confidence</span><span className="tnum strong">{meta?.evaluationEngine?.minimumEvidenceConfidence ?? 55}</span></div>
                  <div className="row between"><span className="dim">Scale recommendation threshold</span><span className="tnum strong">{meta?.evaluationEngine?.minimumScaleRecommendationScore ?? 75}</span></div>
                  <div className="row between"><span className="dim">Mandatory risk-review threshold</span><span className="tnum strong">{meta?.evaluationEngine?.manualReviewRiskThreshold ?? 70}</span></div>
                </div>
                <div className="mt-4">
                  <Notice tone="legal" icon={false}>
                    The calculation is deterministic and versioned. It does not call a generative-AI
                    service and does not award a contract automatically.
                  </Notice>
                </div>
              </Card>

              <Card title="Integrity controls">
                <ul className="small dim stack gap-2" style={{ paddingLeft: '1.1em' }}>
                  <li>Conflict-of-interest declaration is mandatory before an evaluation can run.</li>
                  <li>The first pass is blind: the evaluator sees the solution, not the applicant.</li>
                  <li>The result and its algorithm version are locked and cannot be edited.</li>
                  <li>Missing source data is scored conservatively and disclosed as a limitation.</li>
                  <li>Every automated result is written to the hash-chained audit trail.</li>
                </ul>
              </Card>
            </div>

            <Card title="How the result is formed" subtitle="The same versioned rules are applied to every applicant">
              <div className="grid grid--3">
                <div>
                  <div className="capline mb-2">Evidence adjustment</div>
                  <p className="small dim">High capability and problem-fit claims are reduced when official verification, independent validation, references or supporting documents are weak.</p>
                </div>
                <div>
                  <div className="capline mb-2">Mandatory overrides</div>
                  <p className="small dim">Eligibility failure or critical security risk puts the application on hold. Critical overall risk or very weak evidence forces review.</p>
                </div>
                <div>
                  <div className="capline mb-2">Human authority retained</div>
                  <p className="small dim">The engine recommends; authorised officials remain responsible for shortlisting, pilot approval and procurement, with reasons recorded on file.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'tech' && (
          <div className="stack gap-4">
            <Notice tone="info" title="Why this section exists">
              A procurement platform asks departments and startups to trust it with sanction orders,
              scores and payment records. It should be willing to say plainly what it is made of.
            </Notice>

            <Card title="Technology" flush>
              <DataTable
                columns={[
                  { key: 'k', header: 'Layer', render: (r) => <span className="cell-title">{r[0]}</span> },
                  { key: 'v', header: 'Choice and reason', render: (r) => <span className="small dim">{r[1]}</span> },
                ]}
                rows={STACK}
                rowKey={(r) => r[0]}
              />
            </Card>

            <div className="grid grid--2">
              <Card title="Request path">
                <ol className="small dim stack gap-2" style={{ paddingLeft: '1.2em' }}>
                  <li>React route renders and calls the typed endpoint map — no URL strings in components.</li>
                  <li>Fetch carries the JWT; a 401 clears the token and returns the user to sign-in.</li>
                  <li>Express authenticates the token and reloads the user, so a suspended account fails immediately.</li>
                  <li>Role authorisation runs before the handler.</li>
                  <li>Zod parses and coerces the body; a failure returns field-level errors the form renders inline.</li>
                  <li>The workflow engine asserts the state transition is legal before any write.</li>
                  <li>The write happens, then an audit entry is chained onto the previous hash.</li>
                </ol>
              </Card>

              <Card title="Design decisions worth defending">
                <ul className="small dim stack gap-3" style={{ paddingLeft: '1.1em' }}>
                  <li><b>State machines in one file.</b> Legal transitions for challenges, applications, pilots and procurements are declared together, not scattered through handlers, so the order of operations can be reviewed end to end.</li>
                  <li><b>Policy constants in one file.</b> The ten-year age limit, the INR 100 crore ceiling and the 45-day payment clock live in a single module with the rule cited beside each.</li>
                  <li><b>Explainable scoring.</b> Both the match engine and the evaluation model return the reason for every point awarded, because a shortlist must survive audit.</li>
                  <li><b>No native dependencies.</b> The database is the Node runtime&apos;s own SQLite, so the project installs with one command and cannot fail on a build toolchain.</li>
                </ul>
              </Card>
            </div>

            <Card title="Capability tags used by the match engine">
              <div className="row gap-2 wrap">
                {(meta?.capabilityTags ?? []).map((t) => <Tag key={t}>{t}</Tag>)}
              </div>
            </Card>
          </div>
        )}

        <div className="mt-8 center">
          <div className="row gap-3" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--primary btn--lg" to="/challenges">See open problem statements</Link>
            <Link className="btn btn--secondary btn--lg" to="/register">Register a startup</Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

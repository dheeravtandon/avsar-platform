import { Link } from 'react-router-dom';
import PublicShell from '../components/PublicShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints } from '../lib/api.js';
import { inr, num } from '../lib/format.js';
import { STAGES } from '../components/Stepper.jsx';
import { IconArrowRight, IconCheck, IconAlert } from '../components/Icons.jsx';

const PAIN = [
  {
    problem: 'A tender specifies the solution, not the outcome',
    detail: 'Technical specifications are written from what the market already sells, so a genuinely new approach is non-responsive before it is read.',
    fix: 'Departments publish an outcome with declared KPIs and a baseline. How the number is moved is left to the applicant.',
  },
  {
    problem: 'Prior turnover and prior experience clauses',
    detail: 'A three-year-old company cannot show five years of similar supply, so it is filtered out at the bid-qualification stage regardless of merit.',
    fix: 'GFR 2017 Rule 173(i) relaxations are applied automatically to every DPIIT-recognised applicant, and the exemption is recorded on the file.',
  },
  {
    problem: 'No budget line for an unproven solution',
    detail: 'There is no safe way to spend a small amount to find out whether something works before committing to a full procurement.',
    fix: 'A ring-fenced pilot budget with milestone-linked release, a fixed duration and an exit clause that costs the department nothing if the KPIs are missed.',
  },
  {
    problem: 'Nine to eighteen months from need to order',
    detail: 'By the time a conventional tender concludes, the requirement has changed and the startup has run out of runway.',
    fix: 'Publish, evaluate, pilot and procure inside a single tracked file, with every stage timestamped on a public dashboard.',
  },
  {
    problem: 'Every department starts from zero',
    detail: 'A solution proven in one city is re-tendered, re-evaluated and re-piloted by the next department that needs it.',
    fix: 'A Proven Solutions Registry with a rate contract: another department draws down at a discovered price without repeating discovery, evaluation or pilot.',
  },
  {
    problem: 'Payment arrives when it arrives',
    detail: 'A delayed payment is an inconvenience for a large supplier and an existential event for a startup.',
    fix: 'The 45-day clock under section 15 of the MSMED Act starts on milestone acceptance, runs visibly, and breaches are published.',
  },
];

export default function Landing() {
  useDocumentTitle('Startup Public Procurement Platform');
  const { data } = useApi(endpoints.publicDashboard(), []);
  const h = data?.headline;

  return (
    <PublicShell>
      <section className="hero">
        <div className="hero__in">
          <span className="hero__eyebrow">
            <b>AVSAR</b> Assess · Validate · Sandbox · Adopt · Ramp-up
          </span>
          <h1>Public money, buying what has actually been proven to work.</h1>
          <p className="hero__lede">
            AVSAR is a startup-friendly public procurement mechanism. A government department
            publishes the outcome it needs rather than the product it wants. Recognised startups
            apply through a statutory eligibility gate, the strongest are funded to run a short,
            measured pilot, and only what clears its declared KPIs is procured — then made
            available to every other department at a contracted price.
          </p>

          <div className="row gap-3 wrap mt-6">
            <Link className="btn btn--primary btn--lg" to="/challenges">
              Browse open problem statements <IconArrowRight width={16} height={16} />
            </Link>
            <Link className="btn btn--secondary btn--lg" to="/how-it-works">
              How the model works
            </Link>
            <Link className="btn btn--ghost btn--lg" to="/dashboard">
              Transparency board
            </Link>
          </div>
        </div>
      </section>

      <div className="statband">
        <div>
          <div className="statband__v">{num(h?.openChallenges ?? 0)}</div>
          <div className="statband__l">Problem statements open for application</div>
        </div>
        <div>
          <div className="statband__v">{num(h?.eligibleStartups ?? 0)}</div>
          <div className="statband__l">DPIIT-recognised startups cleared to bid</div>
        </div>
        <div>
          <div className="statband__v">{inr(h?.pilotValue ?? 0)}</div>
          <div className="statband__l">Sanctioned across running and closed pilots</div>
        </div>
        <div>
          <div className="statband__v">{inr(h?.contractValue ?? 0)}</div>
          <div className="statband__l">Contract value awarded after a cleared pilot</div>
        </div>
      </div>

      {/* ---------------------------------------------------------- stages */}
      <section className="section">
        <div className="section__in">
          <h2 className="section__title">Five stages, one file number</h2>
          <p className="section__lede">
            A problem statement enters as <span className="mono">AVS/CH/2026/0001</span> and keeps a
            traceable line through application, evaluation, pilot and contract. Nothing moves to the
            next stage until the gate for the current one is satisfied, and every transition is
            written to a hash-chained audit trail.
          </p>

          <div className="grid grid--5">
            {STAGES.map((s, i) => (
              <article key={s.key} className="stagecard">
                <span className="stagecard__letter" aria-hidden>{s.letter}</span>
                <div className="stagecard__n">Stage {i + 1}</div>
                <h3>{s.label}</h3>
                <p>{s.blurb}</p>
                <ul>
                  {STAGE_DETAIL[s.key].map((d) => <li key={d}>{d}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ pain / fix */}
      <section className="section section--sunken">
        <div className="section__in">
          <h2 className="section__title">What stops a startup selling to government, and what this changes</h2>
          <p className="section__lede">
            Each row is a specific failure mode in conventional procurement and the specific
            mechanism in AVSAR that addresses it. The mechanisms are not aspirations — they are
            enforced in the workflow engine and are visible on the audit trail.
          </p>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="tablewrap">
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: '34%' }}>The blocker today</th>
                    <th style={{ width: '32%' }}>Why it bites</th>
                    <th>What AVSAR does instead</th>
                  </tr>
                </thead>
                <tbody>
                  {PAIN.map((p) => (
                    <tr key={p.problem}>
                      <td>
                        <span className="row gap-2" style={{ alignItems: 'flex-start' }}>
                          <IconAlert width={15} height={15} style={{ color: 'var(--red-600)', marginTop: 2, flex: 'none' }} />
                          <span className="cell-title">{p.problem}</span>
                        </span>
                      </td>
                      <td className="dim">{p.detail}</td>
                      <td>
                        <span className="row gap-2" style={{ alignItems: 'flex-start' }}>
                          <IconCheck width={15} height={15} style={{ color: 'var(--green-600)', marginTop: 2, flex: 'none' }} />
                          <span>{p.fix}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- audiences */}
      <section className="section">
        <div className="section__in">
          <div className="grid grid--3">
            <Audience
              title="For a department"
              lede="You have a number you need to move and no confidence that anything on the market moves it."
              points={[
                'Write the outcome and the baseline, not a technical specification.',
                'The registry proposes candidates with an explainable match score, so a shortlist can be defended in audit.',
                'Spend a capped pilot budget to find out. Milestone-linked release; nothing paid for evidence not accepted.',
                'Procure on the strength of measured KPIs under a named GFR rule, with the justification on file.',
              ]}
              cta={{ to: '/how-it-works', label: 'Read the department workflow' }}
            />
            <Audience
              title="For a startup"
              lede="You have something that works and no way past a qualification clause written for incumbents."
              points={[
                'Register once with DPIIT recognition. Eligibility is checked against statute and the verdict is itemised.',
                'Prior turnover and prior experience clauses are waived; EMD and tender fee are exempt.',
                'Apply to an outcome, not a specification, and see the exact gate result if you are blocked.',
                'A cleared pilot puts you on the Proven Solutions Registry, where other departments can buy without another tender.',
              ]}
              cta={{ to: '/register', label: 'Register your startup' }}
            />
            <Audience
              title="For the public"
              lede="Public money is being spent on unproven technology. That deserves to be visible."
              points={[
                'Every published problem statement, its KPIs and its budget ceiling are open.',
                'The conversion funnel from application to contract is published, including how many pilots failed.',
                'Median cycle time at each handoff is measured against the conventional tender benchmark.',
                'The audit trail is hash-chained: any retrospective edit breaks the chain and is detectable.',
              ]}
              cta={{ to: '/dashboard', label: 'Open the transparency board' }}
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- legal */}
      <section className="section section--sunken">
        <div className="section__in">
          <h2 className="section__title">Built on rules that already exist</h2>
          <p className="section__lede">
            AVSAR does not ask for a new statute. Every relaxation it applies and every procurement
            route it offers already sits in the General Financial Rules or in a standing notification.
            The platform&apos;s contribution is to apply them consistently and to leave a record.
          </p>
          <div className="grid grid--3">
            {LEGAL.map((l) => (
              <div key={l.ref} className="card">
                <div className="card__body">
                  <div className="mono xs" style={{ color: 'var(--accent-600)' }}>{l.ref}</div>
                  <div className="strong mt-2">{l.title}</div>
                  <p className="small muted mt-2">{l.use}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__in center">
          <h2 className="section__title">See it end to end</h2>
          <p className="section__lede" style={{ margin: '0 auto var(--s-6)' }}>
            The demonstration database carries a full lifecycle: a non-revenue water problem statement
            published by a state water board, four applications, an explainable automated evaluation, a
            six-month pilot with monthly KPI readings, a rate contract, and two other departments
            drawing down against it.
          </p>
          <div className="row gap-3" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--primary btn--lg" to="/login">Sign in with a demo role</Link>
            <Link className="btn btn--secondary btn--lg" to="/solutions">Open the Proven Solutions Registry</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Audience({ title, lede, points, cta }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card__body grow">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>{title}</h3>
        <p className="small muted mt-2">{lede}</p>
        <ul className="mt-4 small" style={{ paddingLeft: 0, listStyle: 'none' }}>
          {points.map((p) => (
            <li key={p} className="row gap-2 mb-3" style={{ alignItems: 'flex-start' }}>
              <IconCheck width={14} height={14} style={{ color: 'var(--green-600)', marginTop: 3, flex: 'none' }} />
              <span className="dim">{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card__foot">
        <Link className="btn btn--secondary btn--sm" to={cta.to}>{cta.label}</Link>
      </div>
    </div>
  );
}

const STAGE_DETAIL = {
  ASSESS: ['Outcome, baseline and KPIs', 'Pilot budget ceiling declared', 'Department head approves to publish'],
  VALIDATE: ['Automatic statutory eligibility gate', 'Blind, versioned evidence evaluation', 'Risk flags and limitations recorded'],
  SANDBOX: ['Sanction order and DPDP agreement', 'Milestone-linked payment release', 'Monthly KPI readings against target'],
  ADOPT: ['Verdict recorded against declared KPIs', 'Mode chosen under a named GFR rule', 'Purchase order and PFMS reference'],
  RAMPUP: ['Two-year rate contract', 'Listed on the Proven Solutions Registry', 'Any department draws down without re-tendering'],
};

const LEGAL = [
  { ref: 'DPIIT G.S.R. 127(E)', title: 'Who counts as a startup', use: 'Entity age under ten years, turnover never above INR 100 crore, not formed by splitting or reconstruction. Checked on every application and itemised on the file.' },
  { ref: 'GFR 2017, Rule 173(i)', title: 'Relaxation of prior turnover and experience', use: 'The clause that keeps young companies out of tenders is waived for recognised startups. AVSAR applies it by default rather than on request.' },
  { ref: 'GFR 2017, Rule 170', title: 'Exemption from bid security', use: 'No Earnest Money Deposit and no tender document fee, so applying costs a startup nothing but the work.' },
  { ref: 'GFR 2017, Rules 145 / 149 / 162 / 166', title: 'Routes to award', use: 'Rate contract, GeM, limited tender among pilot participants, or single source where the pilot established that only one solution meets the KPIs.' },
  { ref: 'MSMED Act 2006, s.15', title: 'Payment within 45 days', use: 'The clock starts on milestone acceptance, is visible to both sides, and a breach is published on the transparency board.' },
  { ref: 'DPDP Act 2023 · CERT-In', title: 'Data protection in the sandbox', use: 'A pilot cannot go live until the data processing agreement is executed. Audit logs are hash-chained and retained for 180 days.' },
];

import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import PublicShell from '../components/PublicShell.jsx';
import { useApi, useDebounced, useDocumentTitle } from '../lib/hooks.js';
import { endpoints, qs } from '../lib/api.js';
import { inr, date, daysBetween } from '../lib/format.js';
import { Card, DataTable, DL, Empty, ErrorState, Input, Loading, Notice, Select, Status, Tag } from '../components/ui.jsx';
import { IconArrowLeft, IconSearch } from '../components/Icons.jsx';

export default function PublicChallenges() {
  const { id } = useParams();
  return id ? <Detail id={id} /> : <List />;
}

/* ------------------------------------------------------------------ list */

function List() {
  useDocumentTitle('Open problem statements');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState('PUBLISHED');
  const q = useDebounced(search);

  const { data: meta } = useApi(endpoints.meta(), []);
  const { data, loading, error, reload } = useApi(endpoints.challenges(qs({ q, sector, status })), [q, sector, status]);

  return (
    <PublicShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <h1>Problem statements</h1>
            <p>
              Each entry is an outcome a department needs, with a declared baseline, measurable KPIs
              and a pilot budget ceiling. Applications are open to any DPIIT-recognised startup —
              prior turnover and prior experience requirements do not apply.
            </p>
          </div>
          <Link className="btn btn--primary" to="/register">Register to apply</Link>
        </div>

        <div className="toolbar">
          <div className="row gap-2 toolbar__search">
            <IconSearch width={15} height={15} className="muted" />
            <Input placeholder="Search by title, text or file number" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sector} onChange={(e) => setSector(e.target.value)} placeholder="All sectors" options={meta?.sectors ?? []} />
          <Select
            value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Any stage"
            options={[
              { value: 'PUBLISHED', label: 'Open for applications' },
              { value: 'CLOSED', label: 'Applications closed' },
              { value: 'EVALUATION', label: 'Under evaluation' },
              { value: 'PILOT', label: 'In pilot' },
              { value: 'PROCURED', label: 'Procured' },
            ]}
          />
          <div className="grow" />
          <span className="xs muted">{data?.length ?? 0} shown</span>
        </div>

        <div className="card" style={{ borderRadius: '0 0 var(--r-md) var(--r-md)' }}>
          {loading && <div className="card__body"><Loading /></div>}
          {error && <div className="card__body"><ErrorState error={error} onRetry={reload} /></div>}
          {!loading && !error && (
            <DataTable
              onRowClick={(r) => navigate(`/challenges/${r.id}`)}
              columns={[
                {
                  key: 'title', header: 'Problem statement',
                  render: (r) => (
                    <>
                      <span className="code">{r.code}</span>
                      <span className="cell-title mt-2" style={{ maxWidth: '56ch' }}>{r.title}</span>
                      <span className="cell-sub">{r.dept_name} · {r.ministry}</span>
                    </>
                  ),
                },
                { key: 'sector', header: 'Sector', render: (r) => <span className="small">{r.sector}</span> },
                { key: 'trl_min', header: 'Min TRL', align: 'right', render: (r) => <span className="tnum">{r.trl_min}</span> },
                {
                  key: 'pilot_budget_ceiling', header: 'Pilot ceiling', align: 'right',
                  render: (r) => (<><span className="tnum strong">{inr(r.pilot_budget_ceiling)}</span><span className="cell-sub">{r.pilot_duration_months} months</span></>),
                },
                {
                  key: 'scale_value', header: 'Scale-up', align: 'right',
                  render: (r) => (r.scale_value ? (<><span className="tnum">{inr(r.scale_value)}</span><span className="cell-sub">{r.scale_units}</span></>) : <span className="muted">—</span>),
                },
                { key: 'application_count', header: 'Applied', align: 'right' },
                { key: 'status', header: 'Stage', render: (r) => <Status code={r.status} context="challenge" /> },
                {
                  key: 'closes_at', header: 'Closes',
                  render: (r) => {
                    if (!r.closes_at) return <span className="muted">—</span>;
                    const d = -daysBetween(r.closes_at);
                    return (
                      <>
                        <span className="small">{date(r.closes_at)}</span>
                        <span className="cell-sub" style={{ color: d < 7 && d >= 0 ? 'var(--red-600)' : undefined }}>
                          {d >= 0 ? `${d} days left` : 'closed'}
                        </span>
                      </>
                    );
                  },
                },
              ]}
              rows={data ?? []}
              empty={{ title: 'No problem statements match', body: 'Try clearing the sector or stage filter.' }}
            />
          )}
        </div>
      </div>
    </PublicShell>
  );
}

/* ---------------------------------------------------------------- detail */

function Detail({ id }) {
  const { data: c, loading, error, reload } = useApi(endpoints.challenge(id), [id]);
  useDocumentTitle(c?.title);

  if (loading) return <PublicShell><div className="page"><Loading rows={6} /></div></PublicShell>;
  if (error) return <PublicShell><div className="page"><ErrorState error={error} onRetry={reload} /></div></PublicShell>;
  if (!c) return <PublicShell><div className="page"><Empty title="Not found" /></div></PublicShell>;

  const daysLeft = c.closes_at ? -daysBetween(c.closes_at) : null;

  return (
    <PublicShell>
      <div className="page">
        <Link to="/challenges" className="row gap-2 small mb-4"><IconArrowLeft width={14} height={14} /> All problem statements</Link>

        <div className="pagehead">
          <div className="grow">
            <div className="row gap-3 mb-2">
              <span className="code mono">{c.code}</span>
              <Status code={c.status} context="challenge" />
              {c.security_clearance && <Status code="SEC" label="Security clearance required" tone="danger" />}
            </div>
            <h1 style={{ maxWidth: '30ch' }}>{c.title}</h1>
            <p className="mt-2">{c.dept_name} · {c.ministry}</p>
          </div>
          <div className="stack gap-2" style={{ minWidth: 200 }}>
            <Link className="btn btn--primary btn--lg" to="/register">Register and apply</Link>
            {daysLeft !== null && (
              <span className="xs muted center">
                {daysLeft >= 0 ? `${daysLeft} days remaining` : 'Applications closed'}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid--4 mb-6">
          <div className="tile tile--accent">
            <div className="tile__label">Pilot budget ceiling</div>
            <div className="tile__value">{inr(c.pilot_budget_ceiling)}</div>
            <div className="tile__foot">Over {c.pilot_duration_months} months</div>
          </div>
          <div className="tile tile--saffron">
            <div className="tile__label">Indicative scale-up</div>
            <div className="tile__value">{inr(c.scale_value)}</div>
            <div className="tile__foot">{c.scale_units || 'On successful pilot'}</div>
          </div>
          <div className="tile">
            <div className="tile__label">Minimum readiness</div>
            <div className="tile__value">TRL {c.trl_min}</div>
            <div className="tile__foot">Demonstrable in a relevant environment</div>
          </div>
          <div className="tile">
            <div className="tile__label">Intellectual property</div>
            <div className="tile__value" style={{ fontSize: 'var(--text-lg)' }}>
              {{ STARTUP_RETAINS: 'Startup retains', JOINT: 'Jointly held', GOVT_OWNS: 'Government owns' }[c.ip_terms]}
            </div>
            <div className="tile__foot">Recorded in the pilot agreement</div>
          </div>
        </div>

        <div className="grid grid--sidebar">
          <div className="stack gap-4">
            <Card title="The problem">
              <p className="reading" style={{ fontSize: 'var(--text-md)' }}>{c.problem_statement}</p>
              {c.background && (<><div className="capline mt-6 mb-2">Background</div><p className="reading dim">{c.background}</p></>)}
              {c.current_baseline && (<><div className="capline mt-6 mb-2">Where things stand today</div><p className="reading dim">{c.current_baseline}</p></>)}
              {c.desired_outcome && (<><div className="capline mt-6 mb-2">What success looks like</div><p className="reading dim">{c.desired_outcome}</p></>)}
            </Card>

            <Card title="Success criteria" subtitle="These exact numbers decide whether a pilot is judged successful" flush>
              <DataTable
                columns={[
                  { key: 'label', header: 'Indicator', render: (k) => <span className="cell-title">{k.label}</span> },
                  { key: 'target', header: 'Target', align: 'right', render: (k) => <span className="tnum strong">{k.target} {k.unit}</span> },
                  {
                    key: 'direction', header: 'Direction',
                    render: (k) => <Status plain tone={k.direction === 'DOWN' ? 'info' : 'accent'} label={k.direction === 'DOWN' ? 'Lower is better' : 'Higher is better'} />,
                  },
                ]}
                rows={c.success_kpis ?? []}
                rowKey={(k) => k.key}
                empty={{ title: 'No KPIs declared' }}
              />
            </Card>

            <Card title="Deployment context">
              <DL items={[
                ['Environment', c.deployment_env],
                ['Data the department can provide', c.data_availability],
                ['Capability tags', (c.tags ?? []).length ? <div className="row gap-2 wrap">{c.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div> : null],
                ['Published on', date(c.published_at)],
                ['Applications close', date(c.closes_at)],
              ]} />
            </Card>
          </div>

          <div className="stack gap-4">
            <Card title="Who can apply">
              <ul className="small stack gap-2" style={{ paddingLeft: '1.1em' }}>
                <li>DPIIT-recognised startup, recognition valid on the date of application</li>
                <li>Incorporated within the last ten years</li>
                <li>Turnover never above INR 100 crore in any financial year</li>
                <li>Not formed by splitting up or reconstruction</li>
                <li>Technology Readiness Level {c.trl_min} or above</li>
              </ul>
              <div className="mt-4">
                <Notice tone="success" title="What does not apply">
                  No prior turnover requirement, no prior experience requirement, no Earnest Money
                  Deposit and no tender fee. GFR 2017 Rules 170 and 173(i).
                </Notice>
              </div>
            </Card>

            <Card title="What happens after you apply">
              <ol className="small stack gap-3" style={{ paddingLeft: '1.2em' }}>
                <li><b>Eligibility gate.</b> Automatic and immediate. If you are blocked you are told which specific criterion failed and under which rule.</li>
                <li><b>Committee evaluation.</b> Technical 70, commercial 30. The first pass is blind — the committee scores the solution before it sees the applicant.</li>
                <li><b>Pilot.</b> Shortlisted applicants are funded to run a time-boxed pilot with milestone-linked payment.</li>
                <li><b>Procurement.</b> A pilot that clears its KPIs is procured under a named GFR rule with the justification on the public file.</li>
              </ol>
              <div className="mt-4">
                <Link className="btn btn--secondary btn--block" to="/how-it-works">Read the full workflow</Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

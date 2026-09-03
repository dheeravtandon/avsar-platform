import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date } from '../lib/format.js';
import { Bar, DataTable, ErrorState, Loading, PageHead, Status, Tile, Notice } from '../components/ui.jsx';

export default function Pilots() {
  useDocumentTitle('Pilots');
  const perms = usePerms();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(endpoints.pilots(), []);

  const rows = data ?? [];
  const active = rows.filter((p) => p.status === 'ACTIVE');
  const sanctioned = rows.reduce((s, p) => s + Number(p.budget_sanctioned || 0), 0);
  const cleared = rows.filter((p) => p.verdict === 'SUCCESS').length;

  return (
    <AppShell crumbs={[{ label: 'Pilots' }]}>
      <PageHead
        title={perms.isStartup ? 'My pilots' : 'Pilots'}
        lede="A pilot is a funded, time-boxed deployment measured against the KPIs declared when the problem statement was published. Failing is a permitted outcome — that is what makes it a sandbox."
      />

      <div className="grid grid--4 mb-6">
        <Tile label="Pilots" value={rows.length} accent="accent" />
        <Tile label="Currently running" value={active.length} accent="saffron" />
        <Tile label="Cleared their KPIs" value={cleared} accent="green" />
        <Tile label="Sanctioned value" value={inr(sanctioned)} />
      </div>

      {loading && <Loading rows={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {rows.some((p) => p.status === 'AGREEMENT_PENDING') && perms.isStartup && (
            <div className="mb-4">
              <Notice tone="warning" title="A pilot agreement is waiting for you">
                A pilot cannot go live until the DPDP Act 2023 data processing agreement is executed.
                Open the pilot to review the scope, milestones and payment schedule and accept.
              </Notice>
            </div>
          )}

          <div className="card">
            <DataTable
              onRowClick={(r) => navigate(`/app/pilots/${r.id}`)}
              columns={[
                { key: 'code', header: 'File', mono: true },
                {
                  key: 'title', header: 'Pilot',
                  render: (r) => (<><span className="cell-title" style={{ maxWidth: '44ch' }}>{r.title}</span><span className="cell-sub">{r.challenge_code} · {r.sector}</span></>),
                },
                ...(perms.isStartup
                  ? [{ key: 'dept_name', header: 'Department', render: (r) => (<><span className="small">{r.dept_name}</span><span className="cell-sub">{r.ministry}</span></>) }]
                  : [{ key: 'brand_name', header: 'Startup', render: (r) => (<><span className="cell-title">{r.brand_name || r.legal_name}</span><span className="cell-sub">{r.startup_state}</span></>) }]),
                { key: 'budget_sanctioned', header: 'Sanctioned', align: 'right', render: (r) => <span className="tnum">{inr(r.budget_sanctioned)}</span> },
                {
                  key: 'progress', header: 'Milestones', align: 'right',
                  render: (r) => (
                    <div style={{ minWidth: 96 }}>
                      <div className="row between mb-2 xs"><span className="muted">{r.progress.milestonesDone}/{r.progress.milestonesTotal}</span><span className="tnum">{r.progress.percent}%</span></div>
                      <Bar value={r.progress.percent} />
                    </div>
                  ),
                },
                {
                  key: 'window', header: 'Window',
                  render: (r) => (<><span className="small">{date(r.start_date)}</span><span className="cell-sub">to {date(r.end_date)}</span></>),
                },
                { key: 'status', header: 'Status', render: (r) => <Status code={r.status} context="pilot" /> },
                { key: 'verdict', header: 'Verdict', render: (r) => (r.verdict ? <Status code={r.verdict} /> : <span className="muted">—</span>) },
              ]}
              rows={rows}
              empty={{
                title: 'No pilots yet',
                body: perms.isStartup
                  ? 'A pilot is created once a department shortlists your application and sanctions a budget.'
                  : 'Create a pilot from a shortlisted application.',
              }}
            />
          </div>
        </>
      )}
    </AppShell>
  );
}

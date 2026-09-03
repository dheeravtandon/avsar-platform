import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDebounced, useDocumentTitle } from '../lib/hooks.js';
import { endpoints, qs } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date, daysBetween } from '../lib/format.js';
import { DataTable, ErrorState, Input, Loading, PageHead, Select, Status, Button } from '../components/ui.jsx';
import { IconPlus, IconSearch } from '../components/Icons.jsx';

export default function Challenges() {
  useDocumentTitle('Problem statements');
  const perms = usePerms();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState('');
  const [mine, setMine] = useState(perms.isOfficial && !perms.isEvaluator);
  const q = useDebounced(search);

  const { data: meta } = useApi(endpoints.meta(), []);
  const { data, loading, error, reload } = useApi(
    endpoints.challenges(qs({ q, sector, status, mine: mine ? '1' : '' })),
    [q, sector, status, mine],
  );

  return (
    <AppShell crumbs={[{ label: 'Problem statements' }]}>
      <PageHead
        title="Problem statements"
        lede={
          perms.isStartup
            ? 'Outcomes departments need. Each carries a declared baseline, measurable KPIs and a capped pilot budget. Your fit score is calculated from your profile.'
            : 'Outcomes your department has published, with the applications received against each.'
        }
        actions={perms.canAuthorChallenge && (
          <Link className="btn btn--primary" to="/app/challenges/new">
            <IconPlus width={15} height={15} /> New problem statement
          </Link>
        )}
      />

      <div className="toolbar">
        <div className="row gap-2 toolbar__search">
          <IconSearch width={15} height={15} className="muted" />
          <Input placeholder="Search title, text or file number" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sector} onChange={(e) => setSector(e.target.value)} placeholder="All sectors" options={meta?.sectors ?? []} />
        <Select
          value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Any stage"
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PENDING_APPROVAL', label: 'Awaiting approval' },
            { value: 'PUBLISHED', label: 'Open for applications' },
            { value: 'CLOSED', label: 'Applications closed' },
            { value: 'EVALUATION', label: 'Under evaluation' },
            { value: 'PILOT', label: 'In pilot' },
            { value: 'PROCURED', label: 'Procured' },
          ]}
        />
        {perms.isOfficial && !perms.isEvaluator && (
          <label className="row gap-2 small nowrap" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            My department only
          </label>
        )}
        <div className="grow" />
        <span className="xs muted">{data?.length ?? 0} shown</span>
      </div>

      <div className="card" style={{ borderRadius: '0 0 var(--r-md) var(--r-md)' }}>
        {loading && <div className="card__body"><Loading /></div>}
        {error && <div className="card__body"><ErrorState error={error} onRetry={reload} /></div>}
        {!loading && !error && (
          <DataTable
            onRowClick={(r) => navigate(`/app/challenges/${r.id}`)}
            columns={[
              {
                key: 'title', header: 'Problem statement',
                render: (r) => (
                  <>
                    <span className="code">{r.code}</span>
                    <span className="cell-title mt-2" style={{ maxWidth: '52ch' }}>{r.title}</span>
                    <span className="cell-sub">{r.dept_name}</span>
                  </>
                ),
              },
              { key: 'sector', header: 'Sector', render: (r) => <span className="small">{r.sector}</span> },
              {
                key: 'pilot_budget_ceiling', header: 'Pilot ceiling', align: 'right',
                render: (r) => (<><span className="tnum strong">{inr(r.pilot_budget_ceiling)}</span><span className="cell-sub">{r.pilot_duration_months} mo · TRL {r.trl_min}+</span></>),
              },
              { key: 'application_count', header: 'Applied', align: 'right' },
              ...(perms.isStartup ? [{
                key: 'match', header: 'Your fit', align: 'right',
                render: (r) => (r.match ? (
                  <>
                    <span className="tnum strong">{r.match.score}</span>
                    <span className="cell-sub">/ 100</span>
                  </>
                ) : <span className="muted">—</span>),
              }] : []),
              { key: 'status', header: 'Stage', render: (r) => <Status code={r.status} context="challenge" /> },
              {
                key: 'closes_at', header: 'Closes',
                render: (r) => {
                  if (!r.closes_at) return <span className="muted">—</span>;
                  const d = -daysBetween(r.closes_at);
                  return (<><span className="small">{date(r.closes_at)}</span><span className="cell-sub">{d >= 0 ? `${d}d left` : 'closed'}</span></>);
                },
              },
              ...(perms.isStartup ? [{
                key: 'action', header: '', align: 'right',
                render: (r) => (r.hasApplied
                  ? <Status plain tone="success" label="Applied" />
                  : r.status === 'PUBLISHED'
                    ? <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); navigate(`/app/challenges/${r.id}/apply`); }}>Apply</Button>
                    : null),
              }] : []),
            ]}
            rows={data ?? []}
            empty={{
              title: 'No problem statements match',
              body: perms.canAuthorChallenge
                ? 'Clear the filters, or draft the first problem statement for your department.'
                : 'Try clearing the sector or stage filter.',
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints, qs } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date } from '../lib/format.js';
import { DataTable, ErrorState, Loading, PageHead, Select, Status, Notice } from '../components/ui.jsx';

export default function Applications() {
  useDocumentTitle('Applications');
  const perms = usePerms();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useApi(endpoints.applications(qs({ status })), [status]);

  const blocked = (data ?? []).filter((a) => a.status === 'ELIGIBILITY_FAIL');

  return (
    <AppShell crumbs={[{ label: 'Applications' }]}>
      <PageHead
        title={perms.isStartup ? 'My applications' : 'Applications received'}
        lede={perms.isStartup
          ? 'Every application you have submitted, with its exact position in the workflow and the gate result that put it there.'
          : 'Applications against your department\'s problem statements, after the statutory eligibility gate.'}
      />

      {perms.isStartup && blocked.length > 0 && (
        <div className="mb-4">
          <Notice tone="warning" title={`${blocked.length} application${blocked.length === 1 ? '' : 's'} blocked at the eligibility gate`}>
            Open the application to see exactly which criterion failed and under which rule. Most gate
            failures are a profile field that is out of date rather than a real disqualification.
          </Notice>
        </div>
      )}

      <div className="toolbar">
        <Select
          value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Any status"
          options={[
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'ELIGIBILITY_FAIL', label: 'Eligibility gate failed' },
            { value: 'UNDER_EVALUATION', label: 'Under evaluation' },
            { value: 'SHORTLISTED', label: 'Shortlisted' },
            { value: 'SELECTED_FOR_PILOT', label: 'Selected for pilot' },
            { value: 'REJECTED', label: 'Not taken forward' },
            { value: 'WITHDRAWN', label: 'Withdrawn' },
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
            onRowClick={(r) => navigate(`/app/applications/${r.id}`)}
            columns={[
              { key: 'code', header: 'File', mono: true },
              {
                key: 'solution_title', header: 'Solution',
                render: (r) => (<><span className="cell-title">{r.solution_title}</span><span className="cell-sub">{r.challenge_code} · {r.challenge_title}</span></>),
              },
              ...(perms.isStartup ? [] : [{
                key: 'brand_name', header: 'Applicant',
                render: (r) => (<><span className="cell-title">{r.brand_name || r.legal_name}</span><span className="cell-sub">{r.startup_city}, {r.startup_state}</span></>),
              }]),
              { key: 'trl_claimed', header: 'TRL', align: 'right' },
              {
                key: 'quoted_pilot_cost', header: 'Quote', align: 'right',
                render: (r) => (<><span className="tnum">{inr(r.quoted_pilot_cost)}</span><span className="cell-sub">ceiling {inr(r.pilot_budget_ceiling)}</span></>),
              },
              { key: 'timeline_weeks', header: 'Weeks', align: 'right' },
              { key: 'match_score', header: 'Match', align: 'right', render: (r) => <span className="tnum">{Math.round(r.match_score || 0)}</span> },
              { key: 'status', header: 'Status', render: (r) => <Status code={r.status} context="application" /> },
              { key: 'submitted_at', header: 'Submitted', render: (r) => <span className="small muted">{date(r.submitted_at)}</span> },
            ]}
            rows={data ?? []}
            empty={{
              title: 'No applications',
              body: perms.isStartup
                ? 'Browse open problem statements and apply to the ones that match what you build.'
                : 'Applications appear here once startups apply to your published problem statements.',
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

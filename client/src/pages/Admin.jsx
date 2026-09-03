import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { date, relative, titleCase } from '../lib/format.js';
import {
  Button, Card, DataTable, ErrorState, Loading, Notice, PageHead,
  Status, Tabs, Tile, useToast,
} from '../components/ui.jsx';

export default function Admin() {
  useDocumentTitle('Administration');
  const toast = useToast();
  const [tab, setTab] = useState('users');
  const { data: users, loading, error, reload } = useApi(endpoints.adminUsers(), []);
  const { data: startups, reload: reloadStartups } = useApi(endpoints.startups(''), []);
  const { data: depts } = useApi(endpoints.departments(), []);
  const { data: integrity, reload: reloadIntegrity } = useApi(endpoints.auditVerify(), []);

  const setStatus = async (id, status) => {
    try {
      await api.post(`/admin/users/${id}/status`, { status });
      toast.success(`Account ${status.toLowerCase()}`);
      reload();
    } catch (err) { toast.error(err.message); }
  };

  const setKyc = async (id, status) => {
    try {
      await api.post(`/admin/startups/${id}/kyc`, { status });
      toast.success(`KYC marked ${status.toLowerCase()}`);
      reloadStartups();
    } catch (err) { toast.error(err.message); }
  };

  const rows = users ?? [];

  return (
    <AppShell crumbs={[{ label: 'Administration' }]}>
      <PageHead
        title="Platform administration"
        lede="Accounts, KYC verification and audit-chain integrity. An administrator can suspend an account and verify identity, but cannot score, approve or sanction on behalf of a department."
      />

      <div className="grid grid--4 mb-6">
        <Tile label="Accounts" value={rows.length} accent="accent" />
        <Tile label="Departments" value={depts?.length ?? 0} />
        <Tile label="Startups" value={startups?.length ?? 0} />
        <Tile
          label="Audit chain"
          value={integrity ? (integrity.intact ? 'Intact' : 'Broken') : '—'}
          accent={integrity?.intact ? 'green' : 'saffron'}
          foot={`${integrity?.total ?? 0} entries`}
        />
      </div>

      <Tabs
        value={tab} onChange={setTab}
        tabs={[
          { key: 'users', label: 'Accounts', count: rows.length },
          { key: 'kyc', label: 'Startup KYC', count: startups?.length ?? 0 },
          { key: 'depts', label: 'Departments', count: depts?.length ?? 0 },
        ]}
      />

      <div className="mt-5">
        {loading && <Loading rows={5} />}
        {error && <ErrorState error={error} onRetry={reload} />}

        {tab === 'users' && !loading && (
          <Card title="Accounts" flush>
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: (r) => (<><span className="cell-title">{r.name}</span><span className="cell-sub">{r.email}</span></>) },
                { key: 'role', header: 'Role', render: (r) => <span className="small">{titleCase(r.role)}</span> },
                { key: 'designation', header: 'Designation', render: (r) => <span className="small dim">{r.designation || '—'}</span> },
                { key: 'dept_name', header: 'Department', render: (r) => <span className="small">{r.dept_name || '—'}</span> },
                { key: 'last_login_at', header: 'Last sign-in', render: (r) => <span className="small muted">{r.last_login_at ? relative(r.last_login_at) : 'never'}</span> },
                { key: 'status', header: 'Status', render: (r) => <Status code={r.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'} tone={r.status === 'ACTIVE' ? 'success' : 'danger'} label={titleCase(r.status)} /> },
                {
                  key: 'act', header: '', align: 'right',
                  render: (r) => (r.status === 'ACTIVE'
                    ? <Button size="sm" variant="danger" onClick={() => setStatus(r.id, 'SUSPENDED')}>Suspend</Button>
                    : <Button size="sm" variant="success" onClick={() => setStatus(r.id, 'ACTIVE')}>Reinstate</Button>),
                },
              ]}
              rows={rows}
              empty={{ title: 'No accounts' }}
            />
          </Card>
        )}

        {tab === 'kyc' && (
          <Card title="Startup KYC" subtitle="CIN, GSTIN and Udyam verification. In production these are API checks against MCA, GSTN and the Udyam registry." flush>
            <DataTable
              columns={[
                { key: 'brand_name', header: 'Startup', render: (r) => (<><span className="cell-title">{r.brand_name || r.legal_name}</span><span className="cell-sub">{r.legal_name}</span></>) },
                { key: 'dpiit_number', header: 'DPIIT', mono: true },
                { key: 'incorporation_date', header: 'Incorporated', render: (r) => <span className="small">{date(r.incorporation_date)}</span> },
                { key: 'state', header: 'State', render: (r) => <span className="small">{r.state}</span> },
                { key: 'eligibility_status', header: 'Gate', render: (r) => <Status code={r.eligibility_status} /> },
                {
                  key: 'act', header: '', align: 'right',
                  render: (r) => (
                    <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="success" onClick={() => setKyc(r.id, 'VERIFIED')}>Verify</Button>
                      <Button size="sm" variant="danger" onClick={() => setKyc(r.id, 'REJECTED')}>Reject</Button>
                    </div>
                  ),
                },
              ]}
              rows={startups ?? []}
              empty={{ title: 'No startups registered' }}
            />
          </Card>
        )}

        {tab === 'depts' && (
          <Card title="Participating departments" flush>
            <DataTable
              columns={[
                { key: 'code', header: 'Code', mono: true },
                { key: 'name', header: 'Department', render: (r) => (<><span className="cell-title">{r.name}</span><span className="cell-sub">{r.ministry}</span></>) },
                { key: 'level', header: 'Level', render: (r) => <span className="small">{titleCase(r.level)}</span> },
                { key: 'state', header: 'State', render: (r) => <span className="small">{r.state || '—'}</span> },
                { key: 'budget_head', header: 'Budget head', mono: true, render: (r) => <span className="mono xs">{r.budget_head || '—'}</span> },
                { key: 'challenge_count', header: 'Statements', align: 'right' },
                { key: 'status', header: 'Status', render: (r) => <Status code="ACTIVE" tone="success" label={titleCase(r.status)} /> },
              ]}
              rows={depts ?? []}
              empty={{ title: 'No departments' }}
            />
          </Card>
        )}
      </div>

      <div className="mt-6">
        <div className="row gap-3">
          <Button variant="secondary" onClick={reloadIntegrity}>Re-verify audit chain</Button>
          {integrity && (
            <Notice tone={integrity.intact ? 'success' : 'danger'}>
              {integrity.intact
                ? `Chain verified across ${integrity.total} entries. Head hash ${String(integrity.head).slice(0, 16)}…`
                : `Chain verification failed at entry ${integrity.brokenAt}.`}
            </Notice>
          )}
        </div>
      </div>
    </AppShell>
  );
}

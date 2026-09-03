import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDebounced, useDocumentTitle } from '../lib/hooks.js';
import { endpoints, qs } from '../lib/api.js';
import { inr, date } from '../lib/format.js';
import {
  Card, DataTable, DL, ErrorState, Input, Loading, Modal, Notice,
  PageHead, Select, Status, Tag, Tile,
} from '../components/ui.jsx';
import { IconSearch } from '../components/Icons.jsx';

export default function Registry() {
  useDocumentTitle('Startup registry');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [state, setState] = useState('');
  const [minTrl, setMinTrl] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [open, setOpen] = useState(null);
  const q = useDebounced(search);

  const { data: meta } = useApi(endpoints.meta(), []);
  const { data, loading, error, reload } = useApi(
    endpoints.startups(qs({ q, sector, state, minTrl, eligible: eligibleOnly ? '1' : '' })),
    [q, sector, state, minTrl, eligibleOnly],
  );

  const rows = data ?? [];

  return (
    <AppShell crumbs={[{ label: 'Startup registry' }]}>
      <PageHead
        title="Startup registry"
        lede="Search the market directly instead of waiting for applications. Every entry has cleared the statutory eligibility gate; merit is still decided by the committee against the published rubric."
      />

      <div className="grid grid--4 mb-6">
        <Tile label="Startups shown" value={rows.length} accent="accent" />
        <Tile label="Women-led" value={rows.filter((r) => r.women_led).length} accent="saffron" />
        <Tile label="First-time government suppliers" value={rows.filter((r) => !r.has_prior_govt_order).length} />
        <Tile label="With a contract on the platform" value={rows.filter((r) => r.contract_count > 0).length} accent="green" />
      </div>

      <div className="toolbar">
        <div className="row gap-2 toolbar__search">
          <IconSearch width={15} height={15} className="muted" />
          <Input placeholder="Search by name or capability" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sector} onChange={(e) => setSector(e.target.value)} placeholder="All sectors" options={meta?.sectors ?? []} />
        <Select value={state} onChange={(e) => setState(e.target.value)} placeholder="All states" options={meta?.states ?? []} />
        <Select value={minTrl} onChange={(e) => setMinTrl(e.target.value)} placeholder="Any TRL"
          options={[5, 6, 7, 8, 9].map((n) => ({ value: n, label: `TRL ${n}+` }))} />
        <label className="row gap-2 small nowrap" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />
          Eligible only
        </label>
      </div>

      <div className="card" style={{ borderRadius: '0 0 var(--r-md) var(--r-md)' }}>
        {loading && <div className="card__body"><Loading /></div>}
        {error && <div className="card__body"><ErrorState error={error} onRetry={reload} /></div>}
        {!loading && !error && (
          <DataTable
            onRowClick={(r) => setOpen(r)}
            columns={[
              {
                key: 'brand_name', header: 'Startup',
                render: (r) => (<><span className="cell-title">{r.brand_name || r.legal_name}</span><span className="cell-sub">{r.legal_name}</span></>),
              },
              { key: 'sector', header: 'Sector', render: (r) => (<><span className="small">{r.sector}</span><span className="cell-sub">{r.sub_sector}</span></>) },
              {
                key: 'capabilities', header: 'Capabilities',
                render: (r) => <div className="row gap-1 wrap">{r.capabilities.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}{r.capabilities.length > 3 && <span className="xs muted">+{r.capabilities.length - 3}</span>}</div>,
              },
              { key: 'trl', header: 'TRL', align: 'right', render: (r) => <span className="tnum strong">{r.trl}</span> },
              { key: 'employees', header: 'Team', align: 'right' },
              { key: 'city', header: 'Based in', render: (r) => (<><span className="small">{r.city}</span><span className="cell-sub">{r.state}</span></>) },
              { key: 'pilot_count', header: 'Pilots', align: 'right' },
              { key: 'contract_count', header: 'Contracts', align: 'right' },
              { key: 'eligibility_status', header: 'Gate', render: (r) => <Status code={r.eligibility_status} /> },
            ]}
            rows={rows}
            empty={{ title: 'No startups match', body: 'Try widening the sector, state or readiness filter.' }}
          />
        )}
      </div>

      <div className="mt-6">
        <Notice tone="legal" title="Using the registry defensibly">
          Approaching a startup directly from this registry does not by itself authorise a purchase.
          It is a discovery tool: the department still publishes a problem statement, and the applicant
          still passes the eligibility gate and the committee.
        </Notice>
      </div>

      <StartupModal id={open?.id} onClose={() => setOpen(null)} />
    </AppShell>
  );
}

function StartupModal({ id, onClose }) {
  const { data: s, loading } = useApi(id ? endpoints.startup(id) : null, [id], { skip: !id });

  return (
    <Modal open={!!id} wide title={s?.brand_name || s?.legal_name || 'Startup'} subtitle={s?.legal_name} onClose={onClose}>
      {loading && <Loading rows={5} />}
      {s && (
        <>
          <div className="grid grid--2 mb-4">
            <Card title="Identity">
              <DL tight items={[
                ['Entity type', s.entity_type?.replace('_', ' ')],
                ['Incorporated', date(s.incorporation_date)],
                ['DPIIT recognition', <span className="mono">{s.dpiit_number}</span>],
                ['CIN', <span className="mono xs">{s.cin || '—'}</span>],
                ['GSTIN', <span className="mono xs">{s.gstin || '—'}</span>],
                ['Udyam', <span className="mono xs">{s.udyam_number || '—'}</span>],
                ['KYC', <Status code={s.kyc_status} />],
              ]} />
            </Card>
            <Card title="Profile">
              <DL tight items={[
                ['Sector', `${s.sector}${s.sub_sector ? ` · ${s.sub_sector}` : ''}`],
                ['Readiness', `TRL ${s.trl}`],
                ['Team', s.employees],
                ['Location', `${s.city || ''}${s.city ? ', ' : ''}${s.state || ''}`],
                ['Women-led', s.women_led ? 'Yes' : 'No'],
                ['Prior government order', s.has_prior_govt_order ? 'Yes' : 'No (not a disqualifier)'],
                ['Website', s.website ? <a href={s.website} target="_blank" rel="noreferrer">{s.website}</a> : null],
                ['Capabilities', <div className="row gap-1 wrap">{(s.capabilities ?? []).map((t) => <Tag key={t}>{t}</Tag>)}</div>],
              ]} />
            </Card>
          </div>

          <Card title="Track record on this platform" flush className="mb-4">
            <DataTable
              columns={[
                { key: 'code', header: 'Pilot', mono: true },
                { key: 'title', header: 'Title', render: (r) => <span className="small">{r.title}</span> },
                { key: 'status', header: 'Status', render: (r) => <Status code={r.status} /> },
                { key: 'verdict', header: 'Verdict', render: (r) => (r.verdict ? <Status code={r.verdict} /> : <span className="muted">—</span>) },
              ]}
              rows={s.track?.pilots ?? []}
              rowKey={(r) => r.code}
              empty={{ title: 'No pilots yet' }}
            />
          </Card>

          {(s.track?.contracts ?? []).length > 0 && (
            <Card title="Contracts" flush>
              <DataTable
                columns={[
                  { key: 'code', header: 'File', mono: true },
                  { key: 'mode', header: 'Mode', render: (r) => <span className="small">{r.mode}</span> },
                  { key: 'contract_value', header: 'Value', align: 'right', render: (r) => <span className="tnum">{inr(r.contract_value)}</span> },
                  { key: 'status', header: 'Status', render: (r) => <Status code={r.status} /> },
                ]}
                rows={s.track.contracts}
                rowKey={(r) => r.code}
              />
            </Card>
          )}
        </>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import PublicShell from '../components/PublicShell.jsx';
import { useApi, useDebounced, useDocumentTitle } from '../lib/hooks.js';
import { endpoints, qs } from '../lib/api.js';
import { date } from '../lib/format.js';
import { Card, DataTable, ErrorState, Input, Loading, Notice, Select, Status, Tag } from '../components/ui.jsx';
import { IconSearch } from '../components/Icons.jsx';

export default function PublicRegistry() {
  useDocumentTitle('Startup registry');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [state, setState] = useState('');
  const [minTrl, setMinTrl] = useState('');
  const [womenLed, setWomenLed] = useState(false);
  const q = useDebounced(search);

  const { data: meta } = useApi(endpoints.meta(), []);
  const { data, loading, error, reload } = useApi(
    endpoints.startups(qs({ q, sector, state, minTrl, eligible: '1', womenLed: womenLed ? '1' : '' })),
    [q, sector, state, minTrl, womenLed],
  );

  return (
    <PublicShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <h1>Startup registry</h1>
            <p>
              Every DPIIT-recognised startup that has cleared the statutory eligibility gate. A
              department can search this directly rather than waiting for applications — the same
              match engine that ranks applicants is available as a discovery tool.
            </p>
          </div>
        </div>

        <div className="toolbar">
          <div className="row gap-2 toolbar__search">
            <IconSearch width={15} height={15} className="muted" />
            <Input placeholder="Search by name or capability" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sector} onChange={(e) => setSector(e.target.value)} placeholder="All sectors" options={meta?.sectors ?? []} />
          <Select value={state} onChange={(e) => setState(e.target.value)} placeholder="All states" options={meta?.states ?? []} />
          <Select
            value={minTrl} onChange={(e) => setMinTrl(e.target.value)} placeholder="Any TRL"
            options={[5, 6, 7, 8, 9].map((n) => ({ value: n, label: `TRL ${n} and above` }))}
          />
          <label className="row gap-2 small" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={womenLed} onChange={(e) => setWomenLed(e.target.checked)} />
            Women-led only
          </label>
          <div className="grow" />
          <span className="xs muted">{data?.length ?? 0} startups</span>
        </div>

        <div className="card" style={{ borderRadius: '0 0 var(--r-md) var(--r-md)' }}>
          {loading && <div className="card__body"><Loading /></div>}
          {error && <div className="card__body"><ErrorState error={error} onRetry={reload} /></div>}
          {!loading && !error && (
            <DataTable
              columns={[
                {
                  key: 'legal_name', header: 'Startup',
                  render: (r) => (
                    <>
                      <span className="cell-title">{r.brand_name || r.legal_name}</span>
                      <span className="cell-sub">{r.legal_name}</span>
                    </>
                  ),
                },
                {
                  key: 'sector', header: 'Sector',
                  render: (r) => (<><span className="small">{r.sector}</span><span className="cell-sub">{r.sub_sector}</span></>),
                },
                {
                  key: 'capabilities', header: 'Capabilities',
                  render: (r) => <div className="row gap-1 wrap">{r.capabilities.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}{r.capabilities.length > 3 && <span className="xs muted">+{r.capabilities.length - 3}</span>}</div>,
                },
                { key: 'trl', header: 'TRL', align: 'right', render: (r) => <span className="tnum strong">{r.trl}</span> },
                {
                  key: 'city', header: 'Based in',
                  render: (r) => (<><span className="small">{r.city}</span><span className="cell-sub">{r.state}</span></>),
                },
                { key: 'incorporation_date', header: 'Incorporated', render: (r) => <span className="small">{date(r.incorporation_date)}</span> },
                { key: 'pilot_count', header: 'Pilots', align: 'right' },
                { key: 'contract_count', header: 'Contracts', align: 'right' },
                {
                  key: 'flags', header: '',
                  render: (r) => (
                    <div className="row gap-1 wrap">
                      {r.women_led ? <Status plain tone="violet" label="Women-led" /> : null}
                      {!r.has_prior_govt_order ? <Status plain tone="info" label="First-time supplier" /> : null}
                    </div>
                  ),
                },
              ]}
              rows={data ?? []}
              empty={{ title: 'No startups match', body: 'Try widening the sector, state or readiness filter.' }}
            />
          )}
        </div>

        <div className="mt-6">
          <Notice tone="legal" title="What the registry does not do">
            Listing here is not a pre-qualification and confers no preference. It records that an
            entity meets the statutory definition of a startup. Merit is decided only by the
            evaluation committee against the KPIs published with each problem statement.
          </Notice>
        </div>
      </div>
    </PublicShell>
  );
}

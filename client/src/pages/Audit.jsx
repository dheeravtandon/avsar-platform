import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints } from '../lib/api.js';
import { date, relative, titleCase } from '../lib/format.js';
import { DataTable, ErrorState, Input, Loading, Notice, PageHead, Status, Tile } from '../components/ui.jsx';
import { IconSearch, IconShield } from '../components/Icons.jsx';

export default function Audit() {
  useDocumentTitle('Audit trail');
  const { data, loading, error, reload } = useApi(endpoints.audit(300), []);
  const [q, setQ] = useState('');

  const rows = (data?.items ?? []).filter((r) => {
    if (!q) return true;
    const hay = `${r.action} ${r.entity_type} ${r.actor_name} ${r.actor_role} ${JSON.stringify(r.meta)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const integrity = data?.integrity;

  return (
    <AppShell crumbs={[{ label: 'Audit trail' }]}>
      <PageHead
        title="Audit trail"
        lede="Append-only and hash-chained. Each entry stores SHA-256 of the previous entry plus its own payload, so any retrospective edit breaks every link after it and is detected by the integrity check."
      />

      <div className="grid grid--4 mb-6">
        <Tile
          label="Chain integrity"
          value={integrity ? (integrity.intact ? 'Intact' : `Broken at #${integrity.brokenAt}`) : '—'}
          accent={integrity?.intact ? 'green' : 'saffron'}
          foot={integrity?.intact ? 'Every link verified' : 'Investigate immediately'}
        />
        <Tile label="Entries" value={integrity?.total ?? 0} />
        <Tile label="Retention" value="180 days" foot="CERT-In Directions 2022" />
        <Tile label="Head hash" value={<span className="mono" style={{ fontSize: 'var(--text-xs)' }}>{integrity?.head ? `${integrity.head.slice(0, 12)}…` : '—'}</span>} />
      </div>

      {integrity && !integrity.intact && (
        <div className="mb-4">
          <Notice tone="danger" title="Audit chain integrity failure">
            The hash chain does not verify from entry {integrity.brokenAt}. This indicates the log was
            modified outside the application. Preserve the database and escalate.
          </Notice>
        </div>
      )}

      <div className="toolbar">
        <div className="row gap-2 toolbar__search">
          <IconSearch width={15} height={15} className="muted" />
          <Input placeholder="Filter by action, actor, entity or payload" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grow" />
        <span className="row gap-2 xs muted">
          <IconShield width={14} height={14} />
          {rows.length} of {data?.items?.length ?? 0} entries
        </span>
      </div>

      <div className="card" style={{ borderRadius: '0 0 var(--r-md) var(--r-md)' }}>
        {loading && <div className="card__body"><Loading /></div>}
        {error && <div className="card__body"><ErrorState error={error} onRetry={reload} /></div>}
        {!loading && !error && (
          <DataTable
            columns={[
              { key: 'id', header: '#', align: 'right', render: (r) => <span className="mono xs muted">{r.id}</span> },
              { key: 'action', header: 'Action', render: (r) => <span className="cell-title">{titleCase(r.action)}</span> },
              {
                key: 'entity', header: 'Entity',
                render: (r) => (r.entity_type ? (<><span className="small">{titleCase(r.entity_type)}</span><span className="cell-sub mono">#{r.entity_id ?? '—'}</span></>) : <span className="muted">—</span>),
              },
              {
                key: 'actor', header: 'Actor',
                render: (r) => (<><span className="small">{r.actor_name || 'System'}</span><span className="cell-sub">{r.actor_role ? titleCase(r.actor_role) : ''}</span></>),
              },
              {
                key: 'meta', header: 'Payload',
                render: (r) => {
                  const entries = Object.entries(r.meta || {});
                  if (!entries.length) return <span className="muted">—</span>;
                  return (
                    <span className="xs mono muted" style={{ display: 'block', maxWidth: '46ch', overflowWrap: 'anywhere' }}>
                      {entries.map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join('  ')}
                    </span>
                  );
                },
              },
              { key: 'created_at', header: 'When', render: (r) => (<><span className="small">{date(r.created_at, { withTime: true })}</span><span className="cell-sub">{relative(r.created_at)}</span></>) },
              { key: 'hash', header: 'Hash', render: (r) => <span className="mono xs muted">{String(r.hash).slice(0, 10)}…</span> },
            ]}
            rows={rows}
            empty={{ title: 'No entries match' }}
          />
        )}
      </div>

      <div className="mt-6">
        <Notice tone="legal" title="Why a hash chain and not just a log table">
          A conventional log can be edited by anyone with database access, and the edit leaves no trace.
          Chaining each entry to its predecessor means an edit anywhere in the history invalidates every
          subsequent hash. The integrity check above walks the whole chain and reports the first entry
          where verification fails.
        </Notice>
      </div>
    </AppShell>
  );
}

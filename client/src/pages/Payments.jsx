import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date } from '../lib/format.js';
import { DataTable, ErrorState, Loading, Notice, PageHead, Status, Tile } from '../components/ui.jsx';

export default function Payments() {
  useDocumentTitle('Payments');
  const perms = usePerms();
  const { data, loading, error, reload } = useApi(endpoints.ledger(), []);

  const rows = data ?? [];
  const outstanding = rows.filter((r) => r.status !== 'PAID');
  const breached = rows.filter((r) => r.slaBreached);
  const outstandingValue = outstanding.reduce((s, r) => s + Number(r.amount || 0), 0);
  const settledValue = rows.filter((r) => r.status === 'PAID').reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <AppShell crumbs={[{ label: 'Payments' }]}>
      <PageHead
        title={perms.isStartup ? 'My payments' : 'Payment ledger'}
        lede="Section 15 of the MSMED Act 2006 requires payment within 45 days of acceptance. The clock starts on milestone acceptance, is visible to both sides, and a breach is counted on the public transparency board."
      />

      <div className="grid grid--4 mb-6">
        <Tile label="Outstanding" value={inr(outstandingValue)} foot={`${outstanding.length} invoice${outstanding.length === 1 ? '' : 's'}`} accent="saffron" />
        <Tile label="Settled" value={inr(settledValue)} accent="green" />
        <Tile label="Past the 45-day clock" value={breached.length} accent={breached.length ? 'saffron' : 'green'} />
        <Tile label="Statutory window" value="45 days" foot="MSMED Act 2006, s.15" />
      </div>

      {breached.length > 0 && (
        <div className="mb-4">
          <Notice tone="danger" title={`${breached.length} payment${breached.length === 1 ? '' : 's'} past the statutory window`}>
            {perms.isStartup
              ? 'You may raise a grievance under the payment-delay category; it carries a 15-day resolution SLA and escalates to the department head.'
              : 'Interest is payable on delayed payment to a registered micro or small enterprise. Release these first.'}
          </Notice>
        </div>
      )}

      {loading && <Loading rows={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="card">
          <DataTable
            columns={[
              { key: 'invoice_no', header: 'Invoice', mono: true },
              {
                key: 'against', header: 'Against',
                render: (r) => (<><span className="cell-title">{r.pilot_code || r.procurement_code}</span><span className="cell-sub">{r.pilot_code ? 'Pilot milestone' : 'Contract'}</span></>),
              },
              ...(perms.isStartup
                ? [{ key: 'dept_name', header: 'Department', render: (r) => <span className="small">{r.dept_name}</span> }]
                : [{ key: 'startup_name', header: 'Supplier', render: (r) => <span className="small">{r.startup_name}</span> }]),
              { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="tnum strong">{inr(r.amount)}</span> },
              { key: 'raised_on', header: 'Raised', render: (r) => <span className="small">{date(r.raised_on)}</span> },
              {
                key: 'due_date', header: 'Due', align: 'right',
                render: (r) => (
                  <>
                    <span className="small" style={{ color: r.slaBreached ? 'var(--red-700)' : undefined }}>{date(r.due_date)}</span>
                    {r.slaBreached && <span className="cell-sub" style={{ color: 'var(--red-700)' }}>{r.overdueDays}d overdue</span>}
                  </>
                ),
              },
              { key: 'paid_on', header: 'Settled', render: (r) => <span className="small">{r.paid_on ? date(r.paid_on) : '—'}</span> },
              { key: 'pfms_ref', header: 'PFMS', mono: true, render: (r) => <span className="mono xs">{r.pfms_ref || '—'}</span> },
              { key: 'status', header: 'Status', render: (r) => <Status code={r.slaBreached ? 'OVERDUE' : r.status} /> },
            ]}
            rows={rows}
            empty={{
              title: 'No payments on record',
              body: 'A payment is raised automatically when a pilot milestone is accepted or a purchase order is issued.',
            }}
          />
        </div>
      )}
    </AppShell>
  );
}

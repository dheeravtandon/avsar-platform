import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date, titleCase } from '../lib/format.js';
import {
  Button, Card, DataTable, DL, Empty, ErrorState, Field, Input, Loading,
  Modal, Notice, PageHead, Status, Textarea, Tile, useToast,
} from '../components/ui.jsx';

export default function Procurement() {
  const { id } = useParams();
  return id ? <Detail id={id} /> : <List />;
}

/* ------------------------------------------------------------------ list */

function List() {
  useDocumentTitle('Procurement');
  const perms = usePerms();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(endpoints.procurements(), []);

  const rows = data ?? [];
  const live = rows.filter((r) => ['PO_ISSUED', 'ACTIVE'].includes(r.status));
  const value = rows.reduce((s, r) => s + Number(r.contract_value || 0), 0);

  return (
    <AppShell crumbs={[{ label: 'Procurement' }]}>
      <PageHead
        title={perms.isStartup ? 'My contracts' : 'Procurement'}
        lede="A procurement can only be raised on a pilot that carried a SUCCESS or PARTIAL verdict, under a named rule from the General Financial Rules, with a written justification on the audit record."
      />

      <div className="grid grid--3 mb-6">
        <Tile label="Procurements" value={rows.length} accent="accent" />
        <Tile label="Live contracts" value={live.length} accent="green" />
        <Tile label="Total contract value" value={inr(value)} />
      </div>

      {loading && <Loading rows={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="card">
          <DataTable
            onRowClick={(r) => navigate(`/app/procurement/${r.id}`)}
            columns={[
              { key: 'code', header: 'File', mono: true },
              {
                key: 'challenge_title', header: 'Against',
                render: (r) => (<><span className="cell-title" style={{ maxWidth: '42ch' }}>{r.challenge_title}</span><span className="cell-sub">{r.pilot_code || r.challenge_code}</span></>),
              },
              ...(perms.isStartup
                ? [{ key: 'dept_name', header: 'Department', render: (r) => <span className="small">{r.dept_name}</span> }]
                : [{ key: 'brand_name', header: 'Supplier', render: (r) => (<><span className="cell-title">{r.brand_name || r.legal_name}</span><span className="cell-sub mono">{r.dpiit_number}</span></>) }]),
              { key: 'mode', header: 'Mode', render: (r) => (<><span className="small">{titleCase(r.mode)}</span><span className="cell-sub mono">{r.gfr_rule}</span></>) },
              { key: 'contract_value', header: 'Value', align: 'right', render: (r) => <span className="tnum strong">{inr(r.contract_value)}</span> },
              { key: 'window', header: 'Term', render: (r) => (<><span className="small">{date(r.contract_start)}</span><span className="cell-sub">to {date(r.contract_end)}</span></>) },
              { key: 'po_number', header: 'PO', mono: true, render: (r) => <span className="mono xs">{r.po_number || '—'}</span> },
              { key: 'status', header: 'Status', render: (r) => <Status code={r.status} /> },
            ]}
            rows={rows}
            empty={{
              title: 'No procurements yet',
              body: perms.isStartup
                ? 'A contract appears here once a department procures on the strength of your pilot.'
                : 'Raise a procurement from a pilot that has cleared its KPIs.',
            }}
          />
        </div>
      )}
    </AppShell>
  );
}

/* ---------------------------------------------------------------- detail */

function Detail({ id }) {
  const perms = usePerms();
  const toast = useToast();
  const { data: r, loading, error, reload } = useApi(endpoints.procurement(id), [id]);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ note: '', poNumber: '', gemContractId: '', pfmsRef: '' });
  const [listing, setListing] = useState({ solutionName: '', category: '', description: '', unitPrice: '', uom: 'per unit / year', rateContractValidTill: '' });
  useDocumentTitle(r?.code);

  if (loading) return <AppShell crumbs={[{ label: 'Procurement', to: '/app/procurement' }]}><Loading rows={6} /></AppShell>;
  if (error) return <AppShell><ErrorState error={error} onRetry={reload} /></AppShell>;
  if (!r) return <AppShell><Empty title="Not found" /></AppShell>;

  const act = async (kind) => {
    setBusy(true);
    try {
      if (kind === 'list') {
        await api.post(endpoints.catalogue(), {
          procurementId: r.id,
          solutionName: listing.solutionName,
          category: listing.category,
          description: listing.description,
          unitPrice: Number(listing.unitPrice),
          uom: listing.uom,
          rateContractValidTill: listing.rateContractValidTill,
        });
        toast.success('Listed on the Proven Solutions Registry');
      } else if (kind === 'pay') {
        await api.post(endpoints.pay(modal.payment.id), { pfmsRef: f.pfmsRef });
        toast.success('Payment released');
      } else {
        await api.post(endpoints.procurementTransition(r.id), {
          to: modal.to, note: f.note, poNumber: f.poNumber || undefined, gemContractId: f.gemContractId || undefined,
        });
        toast.success(`Procurement moved to ${titleCase(modal.to)}`);
      }
      setModal(null);
      setF({ note: '', poNumber: '', gemContractId: '', pfmsRef: '' });
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const actions = [];
  if (perms.canProcure && !perms.isStartup) {
    if (r.status === 'DRAFT') actions.push({ to: 'PENDING_APPROVAL', label: 'Send for sanction', variant: 'primary' });
    if (r.status === 'PENDING_APPROVAL' && perms.canApprove) actions.push({ to: 'APPROVED', label: 'Sanction', variant: 'primary' });
    if (r.status === 'APPROVED') actions.push({ to: 'PO_ISSUED', label: 'Issue purchase order', variant: 'primary' });
    if (r.status === 'PO_ISSUED') actions.push({ to: 'ACTIVE', label: 'Mark contract active', variant: 'secondary' });
    if (r.status === 'ACTIVE') actions.push({ to: 'COMPLETED', label: 'Mark completed', variant: 'secondary' });
  }

  return (
    <AppShell crumbs={[{ label: 'Procurement', to: '/app/procurement' }, { label: r.code }]}>
      <div className="pagehead">
        <div className="grow">
          <div className="row gap-3 mb-2 wrap">
            <span className="code mono">{r.code}</span>
            <Status code={r.status} />
            <span className="tag">{r.gfr_rule}</span>
          </div>
          <h1 style={{ maxWidth: '32ch' }}>{r.challenge_title || r.code}</h1>
          <p className="mt-2 muted small">
            {r.brand_name || r.legal_name} · {r.dept_name}
            {r.pilot_code && <> · from pilot {r.pilot_code}</>}
          </p>
        </div>
        <div className="row gap-2 wrap">
          {actions.map((a) => (
            <Button key={a.to} variant={a.variant} onClick={() => setModal(a)}>{a.label}</Button>
          ))}
          {perms.canProcure && !perms.isStartup && ['PO_ISSUED', 'ACTIVE', 'COMPLETED'].includes(r.status) && (
            <Button variant="secondary" onClick={() => setModal({ kind: 'list' })}>List on registry</Button>
          )}
        </div>
      </div>

      <div className="grid grid--4 mb-6">
        <Tile label="Contract value" value={inr(r.contract_value)} accent="accent" />
        <Tile label="Term" value={`${date(r.contract_start)}`} foot={`to ${date(r.contract_end)}`} />
        <Tile label="Purchase order" value={r.po_number || '—'} foot={r.gem_contract_id ? `GeM ${r.gem_contract_id}` : 'Issued on sanction'} />
        <Tile label="Pilot verdict" value={r.pilot_verdict || '—'} accent={r.pilot_verdict === 'SUCCESS' ? 'green' : 'saffron'} foot={r.pilot_code} />
      </div>

      <div className="grid grid--sidebar">
        <div className="stack gap-4">
          <Card title="Justification on record" subtitle="The first document an auditor will read">
            <p className="reading" style={{ fontSize: 'var(--text-md)' }}>{r.justification}</p>
          </Card>

          <Card title="Payments" flush>
            <DataTable
              columns={[
                { key: 'invoice_no', header: 'Invoice', mono: true },
                { key: 'amount', header: 'Amount', align: 'right', render: (x) => <span className="tnum strong">{inr(x.amount)}</span> },
                { key: 'due_date', header: 'Due', render: (x) => <span className="small">{date(x.due_date)}</span> },
                { key: 'paid_on', header: 'Settled', render: (x) => <span className="small">{x.paid_on ? date(x.paid_on) : '—'}</span> },
                { key: 'pfms_ref', header: 'PFMS', mono: true, render: (x) => <span className="mono xs">{x.pfms_ref || '—'}</span> },
                { key: 'status', header: 'Status', render: (x) => <Status code={x.status} /> },
                {
                  key: 'act', header: '', align: 'right',
                  render: (x) => (perms.canProcure && !perms.isStartup && x.status !== 'PAID'
                    ? <Button size="sm" variant="primary" onClick={() => setModal({ kind: 'pay', payment: x })}>Release</Button>
                    : null),
                },
              ]}
              rows={r.payments ?? []}
              empty={{ title: 'No payments raised yet' }}
            />
          </Card>
        </div>

        <div className="stack gap-4">
          <Card title="Mode of procurement">
            <div className="strong small mb-2">{r.modeMeta?.label || titleCase(r.mode)}</div>
            <div className="mono xs muted mb-3">{r.gfr_rule}</div>
            <p className="small dim">{r.modeMeta?.note}</p>
          </Card>

          <Card title="Record">
            <DL tight items={[
              ['Supplier', r.legal_name],
              ['DPIIT recognition', <span className="mono">{r.dpiit_number}</span>],
              ['Department', r.dept_name],
              ['Ministry', r.ministry],
              ['Sanctioned on', r.approved_at ? date(r.approved_at) : null],
              ['Source pilot', r.pilot_code ? <Link to="/app/pilots">{r.pilot_code}</Link> : null],
              ['Pilot budget', r.budget_sanctioned ? inr(r.budget_sanctioned) : null],
            ]} />
          </Card>
        </div>
      </div>

      <Modal
        open={!!modal}
        title={modal?.kind === 'list' ? 'List on the Proven Solutions Registry' : modal?.kind === 'pay' ? 'Release payment' : modal?.label}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={() => act(modal.kind || 'transition')}>Confirm</Button>
          </>
        }
      >
        {modal?.kind === 'list' && (
          <>
            <div className="mb-4">
              <Notice tone="info" title="What listing does">
                Any other department can then draw this solution down at the published price without
                repeating discovery, evaluation or pilot. The measured pilot KPIs are attached to the
                listing, so a second department sees evidence rather than a claim.
              </Notice>
            </div>
            <Field label="Solution name" required><Input value={listing.solutionName} onChange={(e) => setListing({ ...listing, solutionName: e.target.value })} /></Field>
            <Field label="Category" required><Input value={listing.category} onChange={(e) => setListing({ ...listing, category: e.target.value })} placeholder="Environment & Water" /></Field>
            <Field label="Description" required hint="What another department is buying, and what it was proven to do. Minimum 30 characters.">
              <Textarea rows={4} value={listing.description} onChange={(e) => setListing({ ...listing, description: e.target.value })} />
            </Field>
            <div className="grid grid--2">
              <Field label="Unit price (INR)" required hint={listing.unitPrice ? inr(listing.unitPrice) : null}>
                <Input type="number" value={listing.unitPrice} onChange={(e) => setListing({ ...listing, unitPrice: e.target.value })} />
              </Field>
              <Field label="Unit of measure" required><Input value={listing.uom} onChange={(e) => setListing({ ...listing, uom: e.target.value })} /></Field>
            </div>
            <Field label="Rate contract valid till" required>
              <Input type="date" value={listing.rateContractValidTill} onChange={(e) => setListing({ ...listing, rateContractValidTill: e.target.value })} />
            </Field>
          </>
        )}

        {modal?.kind === 'pay' && (
          <>
            <div className="mb-4">
              <DL tight items={[
                ['Invoice', modal.payment.invoice_no],
                ['Amount', <span className="strong tnum">{inr(modal.payment.amount)}</span>],
                ['Due by', date(modal.payment.due_date)],
              ]} />
            </div>
            <Field label="PFMS transaction reference" required hint="Recorded on the audit trail against this release.">
              <Input value={f.pfmsRef} onChange={(e) => setF({ ...f, pfmsRef: e.target.value })} placeholder="PFMS/2026/123456" />
            </Field>
          </>
        )}

        {!modal?.kind && (
          <>
            <Field label="Note for the record"><Textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
            {modal?.to === 'PO_ISSUED' && (
              <div className="grid grid--2">
                <Field label="Purchase order number" hint="Generated automatically if left blank.">
                  <Input value={f.poNumber} onChange={(e) => setF({ ...f, poNumber: e.target.value })} />
                </Field>
                <Field label="GeM contract id" hint="If the order is placed through GeM.">
                  <Input value={f.gemContractId} onChange={(e) => setF({ ...f, gemContractId: e.target.value })} />
                </Field>
              </div>
            )}
            {modal?.to === 'APPROVED' && (
              <Notice tone="warning" title="Sanction is reserved to the department head">
                Sanctioning commits departmental funds. The action, the actor and the time are written
                to the hash-chained audit trail.
              </Notice>
            )}
          </>
        )}
      </Modal>
    </AppShell>
  );
}

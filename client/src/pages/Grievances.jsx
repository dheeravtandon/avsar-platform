import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { date, relative, titleCase } from '../lib/format.js';
import {
  Button, DataTable, ErrorState, Field, Loading, Modal, Notice,
  PageHead, Select, Status, Textarea, Tile, useToast,
} from '../components/ui.jsx';
import { IconPlus } from '../components/Icons.jsx';

export default function Grievances() {
  useDocumentTitle('Grievances');
  const perms = usePerms();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(endpoints.grievances(), []);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ category: 'ELIGIBILITY', description: '' });
  const [res, setRes] = useState({ resolution: '', status: 'RESOLVED' });

  const rows = data ?? [];
  const open = rows.filter((r) => !['RESOLVED', 'CLOSED'].includes(r.status));
  const overdue = rows.filter((r) => r.overdue);

  const raise = async () => {
    setBusy(true);
    try {
      const out = await api.post(endpoints.grievances(), f);
      toast.success(`Grievance raised. Resolution due by ${out.slaDue}.`);
      setModal(null); setF({ category: 'ELIGIBILITY', description: '' });
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    setBusy(true);
    try {
      await api.post(endpoints.resolveGrievance(modal.row.id), res);
      toast.success('Grievance closed');
      setModal(null); setRes({ resolution: '', status: 'RESOLVED' });
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell crumbs={[{ label: 'Grievances' }]}>
      <PageHead
        title="Grievance redressal"
        lede="A published route to challenge an eligibility verdict, an evaluation outcome, a payment delay or a scope dispute. Every grievance carries a 15-day resolution SLA and escalates to the department head when breached."
        actions={<Button variant="primary" onClick={() => setModal({ kind: 'new' })}><IconPlus width={15} height={15} /> Raise a grievance</Button>}
      />

      <div className="grid grid--3 mb-6">
        <Tile label="Total raised" value={rows.length} />
        <Tile label="Open" value={open.length} accent={open.length ? 'saffron' : 'green'} />
        <Tile label="Past the 15-day SLA" value={overdue.length} accent={overdue.length ? 'saffron' : 'green'} />
      </div>

      {loading && <Loading rows={4} />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="card">
          <DataTable
            columns={[
              { key: 'code', header: 'File', mono: true },
              { key: 'category', header: 'Category', render: (r) => <span className="small">{titleCase(r.category)}</span> },
              {
                key: 'description', header: 'Grievance',
                render: (r) => (<><span className="small dim" style={{ maxWidth: '60ch', display: 'block' }}>{r.description}</span>{r.resolution && <span className="cell-sub" style={{ color: 'var(--green-700)' }}>Resolution: {r.resolution}</span>}</>),
              },
              ...(perms.isStartup ? [] : [{ key: 'raised_by_name', header: 'Raised by', render: (r) => (<><span className="small">{r.raised_by_name}</span><span className="cell-sub">{titleCase(r.raised_by_role)}</span></>) }]),
              { key: 'created_at', header: 'Raised', render: (r) => <span className="small muted">{relative(r.created_at)}</span> },
              {
                key: 'sla_due', header: 'SLA',
                render: (r) => (<><span className="small" style={{ color: r.overdue ? 'var(--red-700)' : undefined }}>{date(r.sla_due)}</span>{r.overdue && <span className="cell-sub" style={{ color: 'var(--red-700)' }}>breached</span>}</>),
              },
              { key: 'status', header: 'Status', render: (r) => <Status code={r.status} /> },
              {
                key: 'act', header: '', align: 'right',
                render: (r) => (!perms.isStartup && !['RESOLVED', 'CLOSED'].includes(r.status)
                  ? <Button size="sm" variant="primary" onClick={() => setModal({ kind: 'resolve', row: r })}>Resolve</Button>
                  : null),
              },
            ]}
            rows={rows}
            empty={{ title: 'No grievances', body: 'Nothing has been escalated on this platform.' }}
          />
        </div>
      )}

      <div className="mt-6">
        <Notice tone="legal" title="What a grievance can and cannot do">
          It can require a department to state its reasons on the record, correct a gate result based
          on mistaken facts, or escalate a payment past its statutory window. It cannot reverse a
          committee&apos;s scoring judgement — only require that the judgement was made under the
          published rubric with a conflict-of-interest declaration on file.
        </Notice>
      </div>

      <Modal
        open={!!modal}
        title={modal?.kind === 'new' ? 'Raise a grievance' : 'Resolve grievance'}
        subtitle={modal?.kind === 'resolve' ? modal.row.code : 'Resolution is due within 15 days'}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button
              variant="primary" loading={busy}
              disabled={modal?.kind === 'new' ? f.description.length < 30 : res.resolution.length < 20}
              onClick={modal?.kind === 'new' ? raise : resolve}
            >
              Submit
            </Button>
          </>
        }
      >
        {modal?.kind === 'new' ? (
          <>
            <Field label="Category" required>
              <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}
                options={[
                  { value: 'ELIGIBILITY', label: 'Eligibility gate result' },
                  { value: 'EVALUATION', label: 'Evaluation process' },
                  { value: 'PAYMENT_DELAY', label: 'Payment delay' },
                  { value: 'SCOPE', label: 'Pilot or contract scope' },
                  { value: 'OTHER', label: 'Other' },
                ]} />
            </Field>
            <Field label="What happened" required hint={`Be specific: file numbers, dates and the outcome you are seeking. ${f.description.length}/30 minimum.`}>
              <Textarea rows={6} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </Field>
          </>
        ) : modal ? (
          <>
            <div className="mb-4"><Notice tone="info" title={titleCase(modal.row.category)}>{modal.row.description}</Notice></div>
            <Field label="Outcome" required>
              <Select value={res.status} onChange={(e) => setRes({ ...res, status: e.target.value })}
                options={[
                  { value: 'RESOLVED', label: 'Resolved' },
                  { value: 'ESCALATED', label: 'Escalated to a higher authority' },
                  { value: 'CLOSED', label: 'Closed without action' },
                ]} />
            </Field>
            <Field label="Resolution on record" required hint="Visible to the person who raised it and written to the audit trail. Minimum 20 characters.">
              <Textarea rows={5} value={res.resolution} onChange={(e) => setRes({ ...res, resolution: e.target.value })} />
            </Field>
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}

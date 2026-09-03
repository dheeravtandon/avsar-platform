import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date, relative, titleCase, daysBetween } from '../lib/format.js';
import {
  Bar, Button, Card, DataTable, DL, Empty, ErrorState, Field, Input, Loading,
  Modal, Notice, Status, Tabs, Textarea, Tile, useToast, CheckLine, Select,
} from '../components/ui.jsx';
import { IconCheck, IconX, IconPlus } from '../components/Icons.jsx';

export default function PilotDetail() {
  const { id } = useParams();
  const perms = usePerms();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: p, loading, error, reload } = useApi(endpoints.pilot(id), [id]);
  const [tab, setTab] = useState('scorecard');
  const [modal, setModal] = useState(null);
  useDocumentTitle(p?.code);

  if (loading) return <AppShell crumbs={[{ label: 'Pilots', to: '/app/pilots' }]}><Loading rows={6} /></AppShell>;
  if (error) return <AppShell><ErrorState error={error} onRetry={reload} /></AppShell>;
  if (!p) return <AppShell><Empty title="Not found" /></AppShell>;

  const met = (p.scorecard ?? []).filter((k) => k.met).length;
  const totalKpis = (p.scorecard ?? []).length;
  const daysLeft = p.end_date ? -daysBetween(p.end_date) : null;

  return (
    <AppShell crumbs={[{ label: 'Pilots', to: '/app/pilots' }, { label: p.code }]}>
      <div className="pagehead">
        <div className="grow">
          <div className="row gap-3 mb-2 wrap">
            <span className="code mono">{p.code}</span>
            <Status code={p.status} context="pilot" />
            {p.verdict && <Status code={p.verdict} />}
            <Link className="xs" to={`/app/challenges/${p.challenge_id}`}>{p.challenge_code}</Link>
          </div>
          <h1 style={{ maxWidth: '32ch' }}>{p.title}</h1>
          <p className="mt-2 muted small">
            {p.brand_name || p.legal_name} · {p.dept_name}
            {p.sanction_order_no && <> · sanction {p.sanction_order_no}</>}
          </p>
        </div>
        <div className="row gap-2 wrap">
          <PilotActions p={p} perms={perms} setModal={setModal} />
        </div>
      </div>

      {p.status === 'AGREEMENT_PENDING' && (
        <div className="mb-6">
          <Notice tone="warning" title="Pilot agreement not yet executed">
            This pilot cannot go live until the DPDP Act 2023 data processing agreement is signed. The
            platform enforces this as a hard precondition rather than a checkbox.
          </Notice>
        </div>
      )}

      <div className="grid grid--5 mb-6">
        <Tile label="Sanctioned" value={inr(p.budget_sanctioned)} accent="accent" />
        <Tile label="Milestones cleared" value={`${p.progress.milestonesDone} / ${p.progress.milestonesTotal}`} foot={`${p.progress.percent}% of value released`} />
        <Tile label="KPIs met" value={totalKpis ? `${met} / ${totalKpis}` : '—'} accent={met === totalKpis && totalKpis > 0 ? 'green' : 'saffron'} />
        <Tile label="Window" value={daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft} days left` : 'Ended') : '—'} foot={`${date(p.start_date)} – ${date(p.end_date)}`} />
        <Tile label="Sandbox reach" value={p.sandbox_users ? Number(p.sandbox_users).toLocaleString('en-IN') : '—'} foot="Users or assets in scope" />
      </div>

      <Tabs
        value={tab} onChange={setTab}
        tabs={[
          { key: 'scorecard', label: 'KPI scorecard', count: totalKpis },
          { key: 'milestones', label: 'Milestones', count: (p.milestones ?? []).length },
          { key: 'payments', label: 'Payments', count: (p.payments ?? []).length },
          { key: 'terms', label: 'Terms' },
          { key: 'trail', label: 'Audit trail', count: (p.timeline ?? []).length },
        ]}
      />

      <div className="mt-5">
        {tab === 'scorecard' && <Scorecard p={p} perms={perms} setModal={setModal} />}
        {tab === 'milestones' && <Milestones p={p} perms={perms} setModal={setModal} />}
        {tab === 'payments' && <Payments p={p} />}
        {tab === 'terms' && <Terms p={p} />}
        {tab === 'trail' && <Trail rows={p.timeline ?? []} />}
      </div>

      <PilotModals modal={modal} setModal={setModal} p={p} reload={reload} toast={toast} navigate={navigate} />
    </AppShell>
  );
}

/* --------------------------------------------------------------- actions */

function PilotActions({ p, perms, setModal }) {
  const out = [];
  if (perms.isStartup && p.status === 'AGREEMENT_PENDING') {
    out.push(<Button key="accept" variant="primary" onClick={() => setModal({ kind: 'accept' })}>Accept agreement and start</Button>);
  }
  if (!perms.isStartup && perms.isOfficial) {
    if (p.status === 'AGREEMENT_PENDING') out.push(<Button key="go" variant="primary" onClick={() => setModal({ kind: 'accept' })}>Record agreement and activate</Button>);
    if (p.status === 'ACTIVE') {
      out.push(<Button key="hold" onClick={() => setModal({ kind: 'transition', to: 'ON_HOLD', label: 'Put pilot on hold' })}>Put on hold</Button>);
      out.push(<Button key="rev" variant="primary" onClick={() => setModal({ kind: 'transition', to: 'UNDER_REVIEW', label: 'Move to closure review' })}>Move to closure review</Button>);
    }
    if (p.status === 'ON_HOLD') out.push(<Button key="res" variant="primary" onClick={() => setModal({ kind: 'transition', to: 'ACTIVE', label: 'Resume pilot' })}>Resume</Button>);
    if (p.status === 'UNDER_REVIEW' && perms.canReviewMilestone) {
      out.push(<Button key="s" variant="success" onClick={() => setModal({ kind: 'transition', to: 'SUCCESS', label: 'Record verdict: KPIs met' })}>KPIs met</Button>);
      out.push(<Button key="pp" onClick={() => setModal({ kind: 'transition', to: 'PARTIAL', label: 'Record verdict: partially met' })}>Partially met</Button>);
      out.push(<Button key="f" variant="danger" onClick={() => setModal({ kind: 'transition', to: 'FAILED', label: 'Record verdict: KPIs not met' })}>Not met</Button>);
    }
    if (p.verdict === 'SUCCESS' && perms.canProcure) {
      out.push(<Button key="proc" variant="primary" onClick={() => setModal({ kind: 'procure' })}>Raise procurement</Button>);
    }
  }
  return out;
}

/* ------------------------------------------------------------- scorecard */

function Scorecard({ p, perms, setModal }) {
  const canRecord = perms.isStartup || perms.canReviewMilestone;
  if (!(p.scorecard ?? []).length) return <Empty title="No KPIs on this pilot" />;

  return (
    <div className="stack gap-4">
      {canRecord && p.status === 'ACTIVE' && (
        <div className="row between">
          <span className="small muted">Readings are recorded monthly by the startup and verified by the pilot monitor.</span>
          <Button size="sm" variant="secondary" onClick={() => setModal({ kind: 'kpi' })}>
            <IconPlus width={14} height={14} /> Record a reading
          </Button>
        </div>
      )}

      <div className="grid grid--2">
        {p.scorecard.map((k) => (
          <Card key={k.key} title={k.label} subtitle={`Target ${k.target} ${k.unit} · ${k.direction === 'DOWN' ? 'lower is better' : 'higher is better'}`}>
            <div className="row between mb-3" style={{ alignItems: 'baseline' }}>
              <div>
                <span className="serif tnum" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
                  {k.latest ?? '—'}
                </span>
                <span className="muted small"> {k.unit}</span>
                {k.period && <span className="xs muted"> · {k.period}</span>}
              </div>
              <Status
                plain
                tone={k.met ? 'success' : k.attainment >= 80 ? 'warning' : 'danger'}
                label={k.met ? 'Target met' : `${k.attainment}% of target`}
              />
            </div>
            <Bar value={k.attainment} />

            {k.series.length > 1 && (
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={k.series} margin={{ left: -22, right: 8, top: 6, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--ink-200)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <ReferenceLine y={k.target} stroke="var(--saffron-600)" strokeDasharray="4 3" label={{ value: 'target', fontSize: 10, fill: 'var(--saffron-700)', position: 'right' }} />
                    <Line type="monotone" dataKey="value" stroke="var(--brand-600)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ milestones */

function Milestones({ p, perms, setModal }) {
  return (
    <Card
      title="Milestones and payment release"
      subtitle="Acceptance of a milestone starts a 45-day payment clock under section 15 of the MSMED Act."
      flush
    >
      <DataTable
        columns={[
          { key: 'seq', header: '#', align: 'right', render: (m) => <span className="tnum">M{m.seq}</span> },
          {
            key: 'title', header: 'Milestone',
            render: (m) => (<><span className="cell-title">{m.title}</span>{m.evidence_note && <span className="cell-sub">{m.evidence_note}</span>}{m.remarks && <span className="cell-sub" style={{ color: 'var(--amber-700)' }}>{m.remarks}</span>}</>),
          },
          { key: 'due_date', header: 'Due', render: (m) => <span className="small">{date(m.due_date)}</span> },
          {
            key: 'payout_amount', header: 'Payout', align: 'right',
            render: (m) => (<><span className="tnum strong">{inr(m.payout_amount)}</span><span className="cell-sub">{m.payout_percent}%</span></>),
          },
          { key: 'status', header: 'Status', render: (m) => <Status code={m.status} /> },
          {
            key: 'action', header: '', align: 'right',
            render: (m) => {
              if (perms.isStartup && ['PENDING', 'REJECTED'].includes(m.status) && p.status === 'ACTIVE') {
                return <Button size="sm" variant="primary" onClick={() => setModal({ kind: 'submitMs', milestone: m })}>Submit evidence</Button>;
              }
              if (perms.canReviewMilestone && !perms.isStartup && m.status === 'SUBMITTED') {
                return <Button size="sm" variant="primary" onClick={() => setModal({ kind: 'reviewMs', milestone: m })}>Review</Button>;
              }
              return null;
            },
          },
        ]}
        rows={p.milestones ?? []}
        empty={{ title: 'No milestones defined' }}
      />
    </Card>
  );
}

function Payments({ p }) {
  const today = new Date();
  return (
    <Card title="Payments raised against this pilot" flush>
      <DataTable
        columns={[
          { key: 'invoice_no', header: 'Invoice', mono: true },
          { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="tnum strong">{inr(r.amount)}</span> },
          { key: 'raised_on', header: 'Raised', render: (r) => <span className="small">{date(r.raised_on)}</span> },
          {
            key: 'due_date', header: 'Due (45 days)',
            render: (r) => {
              const overdue = r.status !== 'PAID' && new Date(r.due_date) < today;
              return (<><span className="small" style={{ color: overdue ? 'var(--red-700)' : undefined }}>{date(r.due_date)}</span>{overdue && <span className="cell-sub" style={{ color: 'var(--red-700)' }}>SLA breached</span>}</>);
            },
          },
          { key: 'paid_on', header: 'Settled', render: (r) => <span className="small">{r.paid_on ? date(r.paid_on) : '—'}</span> },
          { key: 'pfms_ref', header: 'PFMS reference', mono: true, render: (r) => <span className="mono xs">{r.pfms_ref || '—'}</span> },
          { key: 'status', header: 'Status', render: (r) => <Status code={r.status} /> },
        ]}
        rows={p.payments ?? []}
        empty={{ title: 'No payments yet', body: 'A payment is raised automatically when a milestone is accepted.' }}
      />
    </Card>
  );
}

function Terms({ p }) {
  return (
    <div className="grid grid--2">
      <Card title="Pilot agreement">
        <DL items={[
          ['Scope', p.scope],
          ['Sanction order', p.sanction_order_no],
          ['Budget sanctioned', <span className="strong tnum">{inr(p.budget_sanctioned)}</span>],
          ['Window', `${date(p.start_date)} to ${date(p.end_date)}`],
          ['Pilot monitor', p.monitor_name],
          ['Intellectual property', { STARTUP_RETAINS: 'Startup retains IP', JOINT: 'Jointly held', GOVT_OWNS: 'Government owns IP' }[p.ip_clause]],
          ['DPDP data processing agreement', p.dpa_signed
            ? <span className="row gap-2"><IconCheck width={14} height={14} style={{ color: 'var(--green-600)' }} /> Executed</span>
            : <span className="row gap-2"><IconX width={14} height={14} style={{ color: 'var(--red-600)' }} /> Not executed</span>],
        ]} />
      </Card>

      <div className="stack gap-4">
        {p.verdict && (
          <Card title="Closure verdict">
            <div className="mb-3"><Status code={p.verdict} /></div>
            <p className="small dim">{p.verdict_note}</p>
            <div className="xs muted mt-3">Recorded {date(p.verdict_at, { withTime: true })}</div>
          </Card>
        )}
        <Card title="What the pilot is measured against">
          <ul className="small dim stack gap-2" style={{ paddingLeft: '1.1em' }}>
            <li>The KPIs declared on the problem statement, and nothing else.</li>
            <li>Readings recorded during the pilot window, verified by the monitor.</li>
            <li>Milestone evidence accepted by the department.</li>
          </ul>
          <div className="mt-3">
            <Notice tone="legal" icon={false}>
              A verdict of FAILED closes the pilot with structured feedback and places no bar on future
              applications by the same startup.
            </Notice>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Trail({ rows }) {
  return (
    <Card title="Audit trail">
      {rows.length === 0 ? <Empty title="No entries yet" /> : (
        <div className="timeline">
          {rows.map((r, i) => (
            <div className="tl-item" key={i}>
              <div className="tl-item__t">{titleCase(r.action)}</div>
              <div className="tl-item__m">{r.actor_role ? titleCase(r.actor_role) : 'System'} · {date(r.created_at, { withTime: true })} · {relative(r.created_at)}</div>
              {r.meta?.note && <div className="small dim mt-2">{r.meta.note}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- modals */

function PilotModals({ modal, setModal, p, reload, toast, navigate }) {
  const [note, setNote] = useState('');
  const [dpa, setDpa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [kpi, setKpi] = useState({ kpiKey: '', actualValue: '', period: new Date().toISOString().slice(0, 7) });
  const [proc, setProc] = useState({ mode: 'SINGLE_SOURCE', justification: '', contractValue: '', contractStart: '', contractEnd: '' });

  const close = () => { setModal(null); setNote(''); setEvidence(''); setDpa(false); };

  const run = async (decision) => {
    setBusy(true);
    try {
      if (modal.kind === 'accept') {
        await api.post(endpoints.pilotTransition(p.id), { to: 'ACTIVE', dpaSigned: true });
        toast.success('Pilot is live');
      } else if (modal.kind === 'transition') {
        await api.post(endpoints.pilotTransition(p.id), { to: modal.to, note });
        toast.success(`Pilot moved to ${titleCase(modal.to)}`);
      } else if (modal.kind === 'submitMs') {
        await api.post(endpoints.milestoneSubmit(p.id, modal.milestone.id), { evidenceNote: evidence });
        toast.success('Evidence submitted for review');
      } else if (modal.kind === 'reviewMs') {
        await api.post(endpoints.milestoneReview(p.id, modal.milestone.id), { decision, remarks: note });
        toast.success(decision === 'APPROVED' ? 'Milestone accepted — payment clock started' : 'Milestone returned');
      } else if (modal.kind === 'kpi') {
        const target = p.scorecard.find((k) => k.key === kpi.kpiKey);
        await api.post(endpoints.kpi(p.id), {
          kpiKey: kpi.kpiKey, kpiLabel: target.label, targetValue: target.target,
          actualValue: Number(kpi.actualValue), unit: target.unit, period: kpi.period,
        });
        toast.success('Reading recorded');
      } else if (modal.kind === 'procure') {
        const res = await api.post(endpoints.procurements(), {
          pilotId: p.id, mode: proc.mode, justification: proc.justification,
          contractValue: Number(proc.contractValue),
          contractStart: proc.contractStart, contractEnd: proc.contractEnd,
        });
        toast.success(`Procurement ${res.code} drafted`);
        navigate(`/app/procurement/${res.id}`);
        return;
      }
      close();
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!modal) return null;

  const titles = {
    accept: 'Accept the pilot agreement',
    transition: modal.label,
    submitMs: `Submit evidence for milestone ${modal.milestone?.seq}`,
    reviewMs: `Review milestone ${modal.milestone?.seq}`,
    kpi: 'Record a KPI reading',
    procure: 'Raise a procurement on this pilot',
  };

  const canConfirm = {
    accept: dpa,
    transition: true,
    submitMs: evidence.length >= 10,
    reviewMs: true,
    kpi: kpi.kpiKey && kpi.actualValue !== '',
    procure: proc.justification.length >= 50 && proc.contractValue && proc.contractStart && proc.contractEnd,
  }[modal.kind];

  return (
    <Modal
      open wide={modal.kind === 'procure'}
      title={titles[modal.kind]}
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          {modal.kind === 'reviewMs' ? (
            <>
              <Button variant="danger" disabled={busy || note.length < 5} onClick={() => run('REJECTED')}>
                Return for revision
              </Button>
              <Button variant="success" loading={busy} onClick={() => run('APPROVED')}>
                Accept milestone
              </Button>
            </>
          ) : (
            <Button variant="primary" loading={busy} disabled={!canConfirm} onClick={() => run()}>Confirm</Button>
          )}
        </>
      }
    >
      {modal.kind === 'accept' && (
        <>
          <div className="mb-4">
            <DL tight items={[
              ['Scope', p.scope],
              ['Budget sanctioned', inr(p.budget_sanctioned)],
              ['Window', `${date(p.start_date)} to ${date(p.end_date)}`],
              ['Milestones', `${p.milestones?.length ?? 0}, payment released against each`],
              ['Intellectual property', { STARTUP_RETAINS: 'Startup retains IP', JOINT: 'Jointly held', GOVT_OWNS: 'Government owns IP' }[p.ip_clause]],
            ]} />
          </div>
          <CheckLine checked={dpa} onChange={setDpa} title="Data processing agreement executed (DPDP Act 2023)">
            Personal data accessed during the pilot is processed only for the declared purpose, is not
            retained beyond the pilot window without fresh consent, and is erased on closure. The
            platform will not set the pilot live without this.
          </CheckLine>
        </>
      )}

      {modal.kind === 'transition' && (
        <Field label="Note for the record" hint="Written to the audit trail and shown to the startup.">
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={['SUCCESS', 'PARTIAL', 'FAILED'].includes(modal.to) ? 'Verdict against each declared KPI, with the reasoning' : 'Reason'} />
        </Field>
      )}

      {modal.kind === 'submitMs' && (
        <>
          <div className="mb-4"><Notice tone="info">{modal.milestone.title}</Notice></div>
          <Field label="Evidence submitted" required hint="Describe what is being submitted. Minimum 10 characters.">
            <Textarea rows={4} value={evidence} onChange={(e) => setEvidence(e.target.value)}
              placeholder="Deployment photographs, verification log, signed field acceptance note" />
          </Field>
          <Notice tone="legal">
            On acceptance, {inr(modal.milestone.payout_amount)} falls due within 45 days under section 15
            of the MSMED Act.
          </Notice>
        </>
      )}

      {modal.kind === 'reviewMs' && (
        <>
          <div className="mb-4">
            <DL tight items={[
              ['Milestone', modal.milestone.title],
              ['Evidence', modal.milestone.evidence_note],
              ['Payout on acceptance', <span className="strong tnum">{inr(modal.milestone.payout_amount)}</span>],
              ['Submitted', relative(modal.milestone.submitted_at)],
            ]} />
          </div>
          <Field label="Remarks" hint="Required if returning for revision.">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </>
      )}

      {modal.kind === 'kpi' && (
        <>
          <Field label="Indicator" required>
            <Select value={kpi.kpiKey} onChange={(e) => setKpi({ ...kpi, kpiKey: e.target.value })} placeholder="Select an indicator"
              options={(p.scorecard ?? []).map((k) => ({ value: k.key, label: `${k.label} (target ${k.target} ${k.unit})` }))} />
          </Field>
          <div className="grid grid--2">
            <Field label="Actual value" required><Input type="number" step="0.01" value={kpi.actualValue} onChange={(e) => setKpi({ ...kpi, actualValue: e.target.value })} /></Field>
            <Field label="Period" required hint="Month the reading covers."><Input type="month" value={kpi.period} onChange={(e) => setKpi({ ...kpi, period: e.target.value })} /></Field>
          </div>
        </>
      )}

      {modal.kind === 'procure' && (
        <>
          <div className="mb-4">
            <Notice tone={p.verdict === 'SUCCESS' ? 'success' : 'warning'} title={`Pilot verdict: ${p.verdict}`}>
              A procurement can only be raised on a pilot with a SUCCESS or PARTIAL verdict. The platform
              refuses it otherwise.
            </Notice>
          </div>
          <Field label="Mode of procurement" required
            hint="Each mode rests on a named rule which is printed on the face of the procurement record.">
            <Select value={proc.mode} onChange={(e) => setProc({ ...proc, mode: e.target.value })}
              options={[
                { value: 'SINGLE_SOURCE', label: 'Single source — GFR R.166 with R.173(i)' },
                { value: 'LIMITED_TENDER', label: 'Limited tender among pilot participants — GFR R.162' },
                { value: 'GEM_DIRECT', label: 'GeM direct purchase / Startup Runway — GFR R.149' },
                { value: 'RATE_CONTRACT', label: 'Rate contract for multi-department adoption — GFR R.145' },
              ]} />
          </Field>
          <Field label="Written justification" required
            hint={`This is the document an auditor reads first. Minimum 50 characters. ${proc.justification.length} entered.`}>
            <Textarea rows={5} value={proc.justification} onChange={(e) => setProc({ ...proc, justification: e.target.value })}
              placeholder="Cite the measured KPI outcomes from the pilot and explain why this mode and this supplier." />
          </Field>
          <div className="grid grid--3">
            <Field label="Contract value (INR)" required hint={proc.contractValue ? inr(proc.contractValue) : null}>
              <Input type="number" value={proc.contractValue} onChange={(e) => setProc({ ...proc, contractValue: e.target.value })} />
            </Field>
            <Field label="Start" required><Input type="date" value={proc.contractStart} onChange={(e) => setProc({ ...proc, contractStart: e.target.value })} /></Field>
            <Field label="End" required><Input type="date" value={proc.contractEnd} onChange={(e) => setProc({ ...proc, contractEnd: e.target.value })} /></Field>
          </div>
        </>
      )}
    </Modal>
  );
}

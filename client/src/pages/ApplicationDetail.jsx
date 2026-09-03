import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date, titleCase } from '../lib/format.js';
import {
  Bar, Button, Card, DataTable, DL, Empty, ErrorState, Field, Loading, Modal,
  Notice, Status, Tabs, Textarea, Tile, useToast, Input, Select,
} from '../components/ui.jsx';
import { IconCheck, IconX } from '../components/Icons.jsx';

export default function ApplicationDetail() {
  const { id } = useParams();
  const perms = usePerms();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: a, loading, error, reload } = useApi(endpoints.application(id), [id]);
  const [tab, setTab] = useState('proposal');
  const [modal, setModal] = useState(null);
  useDocumentTitle(a?.code);

  if (loading) return <AppShell crumbs={[{ label: 'Applications', to: '/app/applications' }]}><Loading rows={6} /></AppShell>;
  if (error) return <AppShell><ErrorState error={error} onRetry={reload} /></AppShell>;
  if (!a) return <AppShell><Empty title="Not found" /></AppShell>;

  const gate = a.eligibility_snapshot?.eligibility;
  const fit = a.eligibility_snapshot?.fit;
  const isOwnerDept = perms.isOfficial && !perms.isEvaluator;

  return (
    <AppShell crumbs={[{ label: 'Applications', to: '/app/applications' }, { label: a.code }]}>
      <div className="pagehead">
        <div className="grow">
          <div className="row gap-3 mb-2 wrap">
            <span className="code mono">{a.code}</span>
            <Status code={a.status} context="application" />
            <Link className="xs" to={`/app/challenges/${a.challenge_id}`}>{a.challenge_code}</Link>
          </div>
          <h1 style={{ maxWidth: '32ch' }}>{a.solution_title}</h1>
          <p className="mt-2 muted small">
            {a.brand_name || a.legal_name} · applying to {a.dept_name}
            {a.submitted_at && <> · submitted {date(a.submitted_at)}</>}
          </p>
        </div>
        <div className="row gap-2 wrap">
          {perms.isStartup && a.status === 'DRAFT' && (
            <Button variant="primary" onClick={() => setModal({ kind: 'submit' })}>Submit application</Button>
          )}
          {isOwnerDept && a.status === 'UNDER_EVALUATION' && (
            <>
              <Button variant="secondary" onClick={() => setModal({ kind: 'committee' })}>Assign committee</Button>
              <Button variant="primary" onClick={() => setModal({ kind: 'transition', to: 'SHORTLISTED', label: 'Shortlist this application' })}>Shortlist</Button>
              <Button variant="danger" onClick={() => setModal({ kind: 'transition', to: 'REJECTED', label: 'Do not take forward' })}>Reject</Button>
            </>
          )}
          {isOwnerDept && a.status === 'SUBMITTED' && (
            <Button variant="secondary" onClick={() => setModal({ kind: 'committee' })}>Assign committee</Button>
          )}
          {isOwnerDept && a.status === 'SHORTLISTED' && !a.pilot && (
            <Button variant="primary" onClick={() => setModal({ kind: 'pilot' })}>Create pilot</Button>
          )}
          {a.pilot && (
            <Link className="btn btn--secondary" to={`/app/pilots/${a.pilot.id}`}>Open pilot {a.pilot.code}</Link>
          )}
        </div>
      </div>

      {a.status === 'ELIGIBILITY_FAIL' && gate && (
        <div className="mb-6">
          <Notice tone="danger" title="Blocked at the statutory eligibility gate">
            {gate.blockingReasons?.join('; ') || 'One or more mandatory criteria were not met.'}
            {perms.isStartup && <> Correct the underlying facts on your <Link to="/app/profile">startup profile</Link> and resubmit.</>}
          </Notice>
        </div>
      )}

      <div className="grid grid--4 mb-6">
        <Tile label="Quoted pilot cost" value={inr(a.quoted_pilot_cost)} foot={`Ceiling ${inr(a.pilot_budget_ceiling)}`} accent="accent" />
        <Tile label="Proposed timeline" value={`${a.timeline_weeks} weeks`} />
        <Tile label="Claimed readiness" value={`TRL ${a.trl_claimed}`} foot={`Floor TRL ${a.trl_min}`} />
        <Tile label="Committee average" value={a.consensus?.count ? a.consensus.average : '—'}
          foot={a.consensus?.count ? `${a.consensus.count} scores · spread ${a.consensus.spread}` : 'Not yet scored'}
          accent={a.consensus?.flagged ? 'saffron' : 'green'} />
      </div>

      {a.consensus?.flagged && (
        <div className="mb-6">
          <Notice tone="warning" title="Score dispersion flagged">
            Committee scores differ by {a.consensus.spread} marks, above the 20-mark threshold. A
            reconciliation sitting is required before this application can be shortlisted.
          </Notice>
        </div>
      )}

      <Tabs
        value={tab} onChange={setTab}
        tabs={[
          { key: 'proposal', label: 'Proposal' },
          { key: 'gate', label: 'Eligibility gate' },
          { key: 'scores', label: 'Evaluation', count: (a.evaluations ?? []).length },
        ]}
      />

      <div className="mt-5">
        {tab === 'proposal' && (
          <div className="grid grid--sidebar">
            <div className="stack gap-4">
              <Card title="Solution summary"><p className="reading" style={{ fontSize: 'var(--text-md)' }}>{a.solution_summary}</p></Card>
              {a.approach && <Card title="Approach"><p className="reading dim">{a.approach}</p></Card>}
              {a.differentiators && <Card title="What makes this different"><p className="reading dim">{a.differentiators}</p></Card>}
              {a.risks && (
                <Card title="Risks declared by the applicant" subtitle="Declaring a real risk is scored as candour, not weakness">
                  <p className="reading dim">{a.risks}</p>
                </Card>
              )}
            </div>
            <div className="stack gap-4">
              <Card title="Applicant">
                <DL tight items={[
                  ['Legal name', a.legal_name],
                  ['DPIIT recognition', <span className="mono">{a.dpiit_number}</span>],
                  ['Location', `${a.startup_city || ''}${a.startup_city ? ', ' : ''}${a.startup_state || ''}`],
                  ['Team on this pilot', a.team_size],
                  ['Women-led', a.women_led ? 'Yes' : 'No'],
                  ['Prior deployments', a.prior_deployments],
                ]} />
              </Card>
              <Card title="Attachments" flush>
                <DataTable
                  columns={[{ key: 'name', header: 'File', render: (r) => <span className="small">{r.name}</span> }]}
                  rows={a.attachments ?? []}
                  rowKey={(r) => r.name}
                  empty={{ title: 'No attachments' }}
                />
              </Card>
            </div>
          </div>
        )}

        {tab === 'gate' && <GateView gate={gate} fit={fit} />}

        {tab === 'scores' && (
          <Card
            title="Committee evaluation"
            subtitle="Technical 70, commercial 30. A submitted score is locked and cannot be edited."
            flush
          >
            <DataTable
              columns={[
                { key: 'evaluator_name', header: 'Evaluator', render: (r) => (<><span className="cell-title">{r.evaluator_name}</span><span className="cell-sub">{r.designation}</span></>) },
                { key: 'status', header: 'Status', render: (r) => <Status code={r.status} /> },
                {
                  key: 'total_score', header: 'Score', align: 'right',
                  render: (r) => (r.status === 'SUBMITTED'
                    ? (<div style={{ minWidth: 80 }}><div className="row between mb-2"><span className="tnum strong">{r.total_score}</span><span className="xs muted">/100</span></div><Bar value={r.total_score} /></div>)
                    : <span className="muted">—</span>),
                },
                { key: 'recommendation', header: 'Recommendation', render: (r) => (r.recommendation ? <Status code={r.recommendation} /> : <span className="muted">—</span>) },
                { key: 'remarks', header: 'Remarks', render: (r) => <span className="small dim">{r.remarks || '—'}</span> },
              ]}
              rows={a.evaluations ?? []}
              empty={{ title: 'No committee assigned yet', body: 'A nodal officer assigns domain experts from the evaluator pool.' }}
            />
          </Card>
        )}
      </div>

      <ActionModal modal={modal} setModal={setModal} a={a} reload={reload} toast={toast} navigate={navigate} />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ gate */

function GateView({ gate, fit }) {
  if (!gate) return <Empty title="Gate has not run yet">The eligibility gate runs automatically the moment an application is submitted.</Empty>;
  return (
    <div className="grid grid--2">
      <Card title="Statutory eligibility" subtitle="Checked against DPIIT G.S.R. 127(E) at the moment of submission">
        <div className="stack gap-3">
          {gate.checks.map((c) => (
            <div key={c.code} className="row gap-3" style={{ alignItems: 'flex-start' }}>
              {c.pass
                ? <IconCheck width={16} height={16} style={{ color: 'var(--green-600)', marginTop: 2, flex: 'none' }} />
                : <IconX width={16} height={16} style={{ color: c.required ? 'var(--red-600)' : 'var(--amber-600)', marginTop: 2, flex: 'none' }} />}
              <div>
                <div className="small strong">{c.label}</div>
                <div className="xs muted">{c.detail} · <span className="mono">{c.authority}</span></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="stack gap-4">
        <Card title="Challenge fit" subtitle="Readiness floor, budget ceiling and timeline window">
          {fit?.gates?.length ? (
            <div className="stack gap-3">
              {fit.gates.map((g) => (
                <div key={g.code} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  {g.pass
                    ? <IconCheck width={16} height={16} style={{ color: 'var(--green-600)', marginTop: 2, flex: 'none' }} />
                    : <IconX width={16} height={16} style={{ color: 'var(--red-600)', marginTop: 2, flex: 'none' }} />}
                  <div><div className="small strong">{g.label}</div><div className="xs muted">{g.detail}</div></div>
                </div>
              ))}
            </div>
          ) : <Empty title="Not evaluated" />}
        </Card>

        {gate.relaxations?.length > 0 && (
          <Card title="Relaxations applied" subtitle="Automatic for every DPIIT-recognised applicant">
            <div className="stack gap-2">
              {gate.relaxations.map((r) => (
                <div key={r.code} className="small">
                  <span className="strong">{r.label}</span>
                  <span className="muted mono xs"> — {r.authority}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- actions */

function ActionModal({ modal, setModal, a, reload, toast, navigate }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState([]);
  const { data: evaluators } = useApi(
    modal?.kind === 'committee' ? endpoints.evaluators() : null, [modal?.kind], { skip: modal?.kind !== 'committee' },
  );

  const close = () => { setModal(null); setNote(''); setSelected([]); };

  const run = async () => {
    setBusy(true);
    try {
      if (modal.kind === 'submit') {
        const res = await api.post(endpoints.applicationSubmit(a.id));
        toast[res.status === 'ELIGIBILITY_FAIL' ? 'error' : 'success'](
          res.status === 'ELIGIBILITY_FAIL' ? 'Blocked at the eligibility gate' : 'Application submitted',
        );
      } else if (modal.kind === 'transition') {
        await api.post(endpoints.applicationTransition(a.id), { to: modal.to, note });
        toast.success(`Application moved to ${titleCase(modal.to)}`);
      } else if (modal.kind === 'committee') {
        await api.post(endpoints.applicationCommittee(a.id), { evaluatorIds: selected });
        toast.success(`${selected.length} evaluator${selected.length === 1 ? '' : 's'} assigned`);
      }
      close();
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (modal?.kind === 'pilot') return <PilotModal a={a} onClose={close} toast={toast} navigate={navigate} />;

  const titles = {
    submit: 'Submit application',
    transition: modal?.label,
    committee: 'Assign the evaluation committee',
  };

  return (
    <Modal
      open={!!modal && ['submit', 'transition', 'committee'].includes(modal.kind)}
      title={titles[modal?.kind]}
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant={modal?.to === 'REJECTED' ? 'danger' : 'primary'}
            loading={busy}
            disabled={modal?.kind === 'committee' && selected.length === 0}
            onClick={run}
          >
            Confirm
          </Button>
        </>
      }
    >
      {modal?.kind === 'submit' && (
        <Notice tone="info" title="What happens on submit">
          The statutory eligibility gate runs immediately and its verdict is stored on this application.
          If you are blocked you will be told the exact criterion and rule; nothing is decided informally.
        </Notice>
      )}

      {modal?.kind === 'transition' && (
        <Field label="Note for the record" hint="Written to the audit trail and sent to the applicant.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={modal.to === 'REJECTED' ? 'Structured feedback the applicant can act on' : 'Reason or condition'} />
        </Field>
      )}

      {modal?.kind === 'committee' && (
        <>
          <p className="small muted mb-4">
            Each evaluator must declare a conflict of interest before scoring. Their first pass is
            blind — the applicant&apos;s identity is withheld until the score is submitted and locked.
          </p>
          <div className="stack gap-2">
            {(evaluators ?? []).map((e) => (
              <label key={e.id} className="checkline">
                <input
                  type="checkbox"
                  checked={selected.includes(e.id)}
                  onChange={(ev) => setSelected(ev.target.checked ? [...selected, e.id] : selected.filter((x) => x !== e.id))}
                />
                <span className="checkline__text grow">
                  <span className="strong">{e.name}</span>
                  <div className="xs muted">{e.designation}</div>
                  <div className="xs muted">{(e.expertise ?? []).join(' · ')}</div>
                </span>
                <span className="xs muted nowrap">{e.open_load} open</span>
              </label>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ----------------------------------------------------------- pilot setup */

function PilotModal({ a, onClose, toast, navigate }) {
  const { data: monitors } = useApi(endpoints.monitors(), []);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(); end.setMonth(end.getMonth() + 6);

  const [f, setF] = useState({
    title: `${a.solution_title} — pilot`,
    scope: '',
    startDate: today,
    endDate: end.toISOString().slice(0, 10),
    budgetSanctioned: a.quoted_pilot_cost,
    sanctionOrderNo: '',
    monitorId: '',
    ipClause: 'STARTUP_RETAINS',
    sandboxUsers: 0,
    milestones: [
      { title: 'Site survey, baseline capture and deployment plan', dueDate: '', payoutPercent: 30 },
      { title: 'First deployment and verified output', dueDate: '', payoutPercent: 30 },
      { title: 'Full scope live and KPI readings recorded', dueDate: '', payoutPercent: 25 },
      { title: 'Closure report, handover and training', dueDate: '', payoutPercent: 15 },
    ],
  });

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));
  const setMs = (i, k, v) => setF((p) => ({ ...p, milestones: p.milestones.map((m, n) => (n === i ? { ...m, [k]: v } : m)) }));
  const totalPct = f.milestones.reduce((s, m) => s + Number(m.payoutPercent || 0), 0);

  const create = async () => {
    setBusy(true);
    try {
      const start = new Date(f.startDate);
      const milestones = f.milestones.map((m, i) => {
        const due = m.dueDate || new Date(start.getTime() + (i + 1) * 30 * 86400000).toISOString().slice(0, 10);
        return { ...m, dueDate: due, payoutPercent: Number(m.payoutPercent) };
      });
      const res = await api.post(endpoints.pilots(), {
        applicationId: a.id,
        title: f.title,
        scope: f.scope,
        startDate: f.startDate,
        endDate: f.endDate,
        budgetSanctioned: Number(f.budgetSanctioned),
        sanctionOrderNo: f.sanctionOrderNo,
        monitorId: f.monitorId ? Number(f.monitorId) : undefined,
        ipClause: f.ipClause,
        sandboxUsers: Number(f.sandboxUsers),
        milestones,
      });
      toast.success(`Pilot ${res.code} created`);
      navigate(`/app/pilots/${res.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open wide
      title="Create pilot"
      subtitle={`From application ${a.code} · ceiling ${inr(a.pilot_budget_ceiling)}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={Math.round(totalPct) !== 100} onClick={create}>
            Create pilot
          </Button>
        </>
      }
    >
      <Field label="Pilot title" required><Input value={f.title} onChange={set('title')} /></Field>
      <Field label="Scope" hint="What exactly is being deployed, where, and for how many users."><Textarea rows={3} value={f.scope} onChange={set('scope')} /></Field>

      <div className="grid grid--2">
        <Field label="Start date" required><Input type="date" value={f.startDate} onChange={set('startDate')} /></Field>
        <Field label="End date" required><Input type="date" value={f.endDate} onChange={set('endDate')} /></Field>
      </div>
      <div className="grid grid--2">
        <Field label="Budget sanctioned (INR)" required
          hint={Number(f.budgetSanctioned) > Number(a.pilot_budget_ceiling) ? 'Above the published ceiling — this will be rejected.' : inr(f.budgetSanctioned)}>
          <Input type="number" value={f.budgetSanctioned} onChange={set('budgetSanctioned')} />
        </Field>
        <Field label="Sanction order number"><Input value={f.sanctionOrderNo} onChange={set('sanctionOrderNo')} placeholder="DEPT/INNOV/2026/001" /></Field>
      </div>
      <div className="grid grid--2">
        <Field label="Pilot monitor">
          <Select value={f.monitorId} onChange={set('monitorId')} placeholder="Assign later"
            options={(monitors ?? []).map((m) => ({ value: m.id, label: `${m.name} — ${m.designation}` }))} />
        </Field>
        <Field label="Intellectual property">
          <Select value={f.ipClause} onChange={set('ipClause')}
            options={[
              { value: 'STARTUP_RETAINS', label: 'Startup retains IP' },
              { value: 'JOINT', label: 'Jointly held' },
              { value: 'GOVT_OWNS', label: 'Government owns IP' },
            ]} />
        </Field>
      </div>

      <div className="capline mt-5 mb-3">Milestones and payment release</div>
      <div className="stack gap-3">
        {f.milestones.map((m, i) => (
          <div key={i} className="row gap-3" style={{ alignItems: 'flex-end' }}>
            <div className="grow"><Field label={i === 0 ? 'Milestone' : null}><Input value={m.title} onChange={(e) => setMs(i, 'title', e.target.value)} /></Field></div>
            <div style={{ width: 150 }}><Field label={i === 0 ? 'Due' : null}><Input type="date" value={m.dueDate} onChange={(e) => setMs(i, 'dueDate', e.target.value)} /></Field></div>
            <div style={{ width: 90 }}><Field label={i === 0 ? 'Payout %' : null}><Input type="number" value={m.payoutPercent} onChange={(e) => setMs(i, 'payoutPercent', e.target.value)} /></Field></div>
            <div className="field" style={{ width: 96 }}>
              <div className="small tnum right muted">{inr((Number(f.budgetSanctioned) * Number(m.payoutPercent || 0)) / 100)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Notice tone={Math.round(totalPct) === 100 ? 'success' : 'warning'}>
          Milestone payouts total <b>{totalPct}%</b>. They must sum to exactly 100% before a pilot can be created.
        </Notice>
      </div>

      <div className="mt-4">
        <Notice tone="legal">
          On creation the pilot enters <b>Agreement pending</b>. It cannot be set live until the DPDP Act
          2023 data processing agreement is executed. Each accepted milestone starts a 45-day payment
          clock under section 15 of the MSMED Act.
        </Notice>
      </div>
    </Modal>
  );
}

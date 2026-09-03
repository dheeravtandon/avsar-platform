import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import Stepper from '../components/Stepper.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date, relative, titleCase } from '../lib/format.js';
import {
  Button, Card, DataTable, DL, Empty, ErrorState, Loading, Modal, Notice,
  Status, Tabs, Tag, Textarea, useToast, Field, Bar,
} from '../components/ui.jsx';
import { IconArrowRight, IconCheck, IconSpark } from '../components/Icons.jsx';

export default function ChallengeDetail() {
  const { id } = useParams();
  const perms = usePerms();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: c, loading, error, reload } = useApi(endpoints.challenge(id), [id]);
  const [tab, setTab] = useState('brief');
  const [action, setAction] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle(c?.code);

  const transition = async (to) => {
    setBusy(true);
    try {
      await api.post(endpoints.challengeTransition(c.id), { to, note });
      toast.success(`Problem statement moved to ${titleCase(to)}`);
      setAction(null); setNote('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppShell crumbs={[{ label: 'Problem statements', to: '/app/challenges' }, { label: 'Loading' }]}><Loading rows={6} /></AppShell>;
  if (error) return <AppShell><ErrorState error={error} onRetry={reload} /></AppShell>;
  if (!c) return <AppShell><Empty title="Not found" /></AppShell>;

  const isOwner = perms.isOfficial && !perms.isEvaluator;
  const actions = availableActions(c, perms);

  return (
    <AppShell crumbs={[{ label: 'Problem statements', to: '/app/challenges' }, { label: c.code }]}>
      <div className="pagehead">
        <div className="grow">
          <div className="row gap-3 mb-2 wrap">
            <span className="code mono">{c.code}</span>
            <Status code={c.status} context="challenge" />
            <span className="xs muted">{c.dept_name} · {c.ministry}</span>
          </div>
          <h1 style={{ maxWidth: '32ch' }}>{c.title}</h1>
          <p className="mt-2 muted small">
            Raised by {c.owner_name}
            {c.published_at && <> · published {date(c.published_at)}</>}
            {c.closes_at && <> · closes {date(c.closes_at)}</>}
          </p>
        </div>
        <div className="row gap-2 wrap">
          {perms.isStartup && c.status === 'PUBLISHED' && !c.myApplication && (
            <Link className="btn btn--primary" to={`/app/challenges/${c.id}/apply`}>
              Apply <IconArrowRight width={15} height={15} />
            </Link>
          )}
          {perms.isStartup && c.myApplication && (
            <Link className="btn btn--secondary" to={`/app/applications/${c.myApplication.id}`}>View my application</Link>
          )}
          {isOwner && ['DRAFT', 'REJECTED'].includes(c.status) && (
            <Link className="btn btn--secondary" to={`/app/challenges/${c.id}/edit`}>Edit</Link>
          )}
          {actions.map((a) => (
            <Button key={a.to} variant={a.variant} onClick={() => setAction(a)}>{a.label}</Button>
          ))}
        </div>
      </div>

      <div className="mb-6"><Stepper current={c.stage} /></div>

      {perms.isStartup && c.match && (
        <div className="mb-6">
          <MatchPanel match={c.match} fit={c.fit} />
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'brief', label: 'Brief' },
          { key: 'kpi', label: 'Success criteria', count: (c.success_kpis ?? []).length },
          ...(isOwner ? [
            { key: 'apps', label: 'Applications', count: (c.applications ?? []).length },
            { key: 'discover', label: 'Discover startups' },
          ] : []),
          { key: 'trail', label: 'Audit trail', count: (c.timeline ?? []).length },
        ]}
      />

      <div className="mt-5">
        {tab === 'brief' && <Brief c={c} />}
        {tab === 'kpi' && <Kpis c={c} />}
        {tab === 'apps' && <Applications c={c} navigate={navigate} reload={reload} />}
        {tab === 'discover' && <Discover challengeId={c.id} />}
        {tab === 'trail' && <Trail rows={c.timeline ?? []} />}
      </div>

      <Modal
        open={!!action}
        title={action?.label}
        subtitle={action?.help}
        onClose={() => { setAction(null); setNote(''); }}
        footer={
          <>
            <Button onClick={() => { setAction(null); setNote(''); }}>Cancel</Button>
            <Button variant={action?.variant === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={() => transition(action.to)}>
              Confirm
            </Button>
          </>
        }
      >
        <Field label="Note for the record" hint="Written to the audit trail and visible to the raising officer.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason, condition or instruction" />
        </Field>
        {action?.to === 'PUBLISHED' && (
          <Notice tone="warning" title="Publishing is a public act">
            Startups in the {c.sector} sector will be notified and the problem statement becomes visible
            on the public site with its budget ceiling and KPIs.
          </Notice>
        )}
      </Modal>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ tabs */

function Brief({ c }) {
  return (
    <div className="grid grid--sidebar">
      <div className="stack gap-4">
        <Card title="The problem">
          <p className="reading" style={{ fontSize: 'var(--text-md)' }}>{c.problem_statement}</p>
          {c.background && (<><div className="capline mt-6 mb-2">Background</div><p className="reading dim">{c.background}</p></>)}
          {c.current_baseline && (<><div className="capline mt-6 mb-2">Where things stand today</div><p className="reading dim">{c.current_baseline}</p></>)}
          {c.desired_outcome && (<><div className="capline mt-6 mb-2">What success looks like</div><p className="reading dim">{c.desired_outcome}</p></>)}
        </Card>

        <Card title="Deployment context">
          <DL items={[
            ['Environment', c.deployment_env],
            ['Data available to the supplier', c.data_availability],
            ['Security clearance', c.security_clearance ? 'Required' : 'Not required'],
            ['Capability tags', (c.tags ?? []).length ? <div className="row gap-2 wrap">{c.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div> : null],
          ]} />
        </Card>
      </div>

      <div className="stack gap-4">
        <Card title="Commercial terms">
          <DL tight items={[
            ['Pilot budget ceiling', <span className="strong tnum">{inr(c.pilot_budget_ceiling)}</span>],
            ['Pilot duration', `${c.pilot_duration_months} months`],
            ['Minimum TRL', `TRL ${c.trl_min}`],
            ['Indicative scale-up', c.scale_value ? <><span className="strong tnum">{inr(c.scale_value)}</span><div className="xs muted">{c.scale_units}</div></> : null],
            ['Intellectual property', { STARTUP_RETAINS: 'Startup retains', JOINT: 'Jointly held', GOVT_OWNS: 'Government owns' }[c.ip_terms]],
          ]} />
        </Card>

        <Card title="Relaxations that apply">
          <ul className="small dim stack gap-2" style={{ paddingLeft: '1.1em' }}>
            <li>Prior turnover requirement waived</li>
            <li>Prior experience requirement waived</li>
            <li>Earnest Money Deposit exempted</li>
            <li>Tender document fee exempted</li>
            <li>Payment within 45 days of milestone acceptance</li>
          </ul>
          <div className="mt-3 xs muted mono">GFR 2017 R.170, R.173(i) · MSMED Act 2006 s.15</div>
        </Card>
      </div>
    </div>
  );
}

function Kpis({ c }) {
  return (
    <Card
      title="Success criteria"
      subtitle="These exact indicators decide the pilot verdict. Nothing else is scored at closure."
      flush
    >
      <DataTable
        columns={[
          { key: 'key', header: 'Key', mono: true, render: (k) => <span className="mono xs">{k.key}</span> },
          { key: 'label', header: 'Indicator', render: (k) => <span className="cell-title">{k.label}</span> },
          { key: 'target', header: 'Target', align: 'right', render: (k) => <span className="tnum strong">{k.target} {k.unit}</span> },
          {
            key: 'direction', header: 'Direction',
            render: (k) => <Status plain tone={k.direction === 'DOWN' ? 'info' : 'accent'} label={k.direction === 'DOWN' ? 'Lower is better' : 'Higher is better'} />,
          },
        ]}
        rows={c.success_kpis ?? []}
        rowKey={(k) => k.key}
        empty={{ title: 'No KPIs declared' }}
      />
    </Card>
  );
}

function Applications({ c, navigate }) {
  return (
    <Card
      title="Applications received"
      subtitle="Ordered by discovery match score. Merit is decided by the committee, not by this ranking."
      flush
    >
      <DataTable
        onRowClick={(r) => navigate(`/app/applications/${r.id}`)}
        columns={[
          { key: 'code', header: 'File', mono: true },
          {
            key: 'solution_title', header: 'Solution',
            render: (r) => (<><span className="cell-title">{r.solution_title}</span><span className="cell-sub">{r.brand_name || r.legal_name} · {r.startup_state}</span></>),
          },
          { key: 'trl_claimed', header: 'TRL', align: 'right' },
          { key: 'quoted_pilot_cost', header: 'Quote', align: 'right', render: (r) => <span className="tnum">{inr(r.quoted_pilot_cost)}</span> },
          { key: 'timeline_weeks', header: 'Weeks', align: 'right' },
          { key: 'match_score', header: 'Match', align: 'right', render: (r) => <span className="tnum strong">{Math.round(r.match_score)}</span> },
          { key: 'eligibility_status', header: 'Gate', render: (r) => <Status code={r.eligibility_status} /> },
          { key: 'status', header: 'Status', render: (r) => <Status code={r.status} /> },
        ]}
        rows={c.applications ?? []}
        empty={{ title: 'No applications yet', body: 'Startups in the matching sector were notified on publication.' }}
      />
    </Card>
  );
}

function Discover({ challengeId }) {
  const { data, loading, error, reload } = useApi(endpoints.discover(challengeId), [challengeId]);
  const [open, setOpen] = useState(null);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <div className="mb-4">
        <Notice tone="info" title="Reverse discovery">
          Rather than waiting for applications, the department can search the registry directly. The
          score is a transparent weighted model — open any row to see exactly why each point was awarded,
          which is what makes a shortlist defensible in audit.
        </Notice>
      </div>

      <Card title="Ranked candidates" subtitle={`${data.candidates.length} eligible startups scored against this problem statement`} flush>
        <DataTable
          onRowClick={(r) => setOpen(r)}
          columns={[
            {
              key: 'brandName', header: 'Startup',
              render: (r) => (<><span className="cell-title">{r.brandName || r.legalName}</span><span className="cell-sub">{r.city}, {r.state} · {r.sector}</span></>),
            },
            { key: 'trl', header: 'TRL', align: 'right' },
            {
              key: 'capabilities', header: 'Capabilities',
              render: (r) => <div className="row gap-1 wrap">{r.capabilities.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}</div>,
            },
            {
              key: 'score', header: 'Match', align: 'right',
              render: (r) => (
                <div style={{ minWidth: 74 }}>
                  <div className="row between mb-2"><span className="tnum strong">{r.score}</span><span className="xs muted">/100</span></div>
                  <Bar value={r.score} />
                </div>
              ),
            },
            { key: 'hasApplied', header: '', render: (r) => (r.hasApplied ? <Status plain tone="success" label="Applied" /> : null) },
          ]}
          rows={data.candidates}
          rowKey={(r) => r.startupId}
          empty={{ title: 'No eligible startups found' }}
        />
      </Card>

      <Modal open={!!open} title={open?.brandName || open?.legalName} subtitle={`Match score ${open?.score} of 100`} onClose={() => setOpen(null)}>
        {open && (
          <>
            <div className="mb-4">
              <DL tight items={[
                ['Legal name', open.legalName],
                ['DPIIT recognition', <span className="mono">{open.dpiitNumber}</span>],
                ['Sector', open.sector],
                ['Readiness', `TRL ${open.trl}`],
                ['Location', `${open.city}, ${open.state}`],
                ['Capabilities', <div className="row gap-2 wrap">{open.capabilities.map((t) => <Tag key={t}>{t}</Tag>)}</div>],
              ]} />
            </div>
            <div className="capline mb-3">Why this score</div>
            <div className="stack gap-3">
              {open.reasons.map((r) => (
                <div key={r.factor} className="row between gap-4" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div className="small strong">{r.factor}</div>
                    <div className="xs muted">{r.note}</div>
                  </div>
                  <span className="tnum strong nowrap">+{r.points}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function Trail({ rows }) {
  return (
    <Card title="Audit trail" subtitle="Append-only and hash-chained. Any retrospective edit breaks the chain.">
      {rows.length === 0 ? <Empty title="No entries yet" /> : (
        <div className="timeline">
          {rows.map((r, i) => (
            <div className="tl-item" key={i}>
              <div className="tl-item__t">{titleCase(r.action)}</div>
              <div className="tl-item__m">
                {r.actor_role ? titleCase(r.actor_role) : 'System'} · {date(r.created_at, { withTime: true })} · {relative(r.created_at)}
              </div>
              {r.meta?.note && <div className="small dim mt-2">{r.meta.note}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MatchPanel({ match, fit }) {
  const blocked = fit && !fit.pass;
  return (
    <Card title="Your fit against this problem statement" subtitle="Calculated from your profile before you apply">
      <div className="grid grid--sidebar">
        <div className="stack gap-3">
          {match.reasons.map((r) => (
            <div key={r.factor} className="row between gap-4" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <div className="small strong">{r.factor}</div>
                <div className="xs muted">{r.note}</div>
              </div>
              <span className="tnum strong nowrap">+{r.points}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="tile tile--accent mb-4">
            <div className="tile__label">Match score</div>
            <div className="tile__value">{match.score}<span className="muted" style={{ fontSize: 'var(--text-md)' }}> / 100</span></div>
          </div>
          {fit && (
            <div className="stack gap-2">
              {fit.gates.map((g) => (
                <div key={g.code} className="row gap-2 small" style={{ alignItems: 'flex-start' }}>
                  {g.pass ? <IconCheck width={14} height={14} style={{ color: 'var(--green-600)', marginTop: 3, flex: 'none' }} />
                    : <IconSpark width={14} height={14} style={{ color: 'var(--amber-600)', marginTop: 3, flex: 'none' }} />}
                  <span><span className="strong">{g.label}</span><span className="xs muted" style={{ display: 'block' }}>{g.detail}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {blocked && (
        <div className="mt-4">
          <Notice tone="warning" title="You would not clear the challenge fit gate today">
            Correct the items above before applying. A blocked application is not a rejection and does not
            affect any other application.
          </Notice>
        </div>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------- actions */

function availableActions(c, perms) {
  const out = [];
  const owner = perms.isOfficial && !perms.isEvaluator;
  if (!owner) return out;

  if (c.status === 'DRAFT') out.push({ to: 'PENDING_APPROVAL', label: 'Send for approval', variant: 'primary', help: 'The department head will review and publish.' });
  if (c.status === 'PENDING_APPROVAL' && perms.canApprove) {
    out.push({ to: 'PUBLISHED', label: 'Approve and publish', variant: 'primary', help: 'Makes the problem statement public and opens applications.' });
    out.push({ to: 'REJECTED', label: 'Return to officer', variant: 'danger', help: 'Sends it back to draft with your note.' });
  }
  if (c.status === 'PUBLISHED') out.push({ to: 'CLOSED', label: 'Close applications', variant: 'secondary', help: 'Every submitted application moves to evaluation.' });
  if (c.status === 'CLOSED') out.push({ to: 'EVALUATION', label: 'Start evaluation', variant: 'primary', help: 'Formally records that the committee has begun.' });
  return out;
}

import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints, qs } from '../lib/api.js';
import { useAuth, usePerms } from '../lib/auth.jsx';
import { inr, num, date, relative } from '../lib/format.js';
import { Card, DataTable, ErrorState, Loading, Notice, Status, Tile, Empty, Button } from '../components/ui.jsx';
import { IconArrowRight, IconCheck, IconX, IconPlus } from '../components/Icons.jsx';

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const perms = usePerms();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(endpoints.myDashboard(), []);

  return (
    <AppShell crumbs={[{ label: 'Dashboard' }]}>
      <div className="pagehead">
        <div>
          <h1>{greeting()}, {user?.name?.split(' ')[0]}</h1>
          <p>
            {perms.isStartup && 'Your applications, pilots and payments across every participating department.'}
            {perms.isEvaluator && 'Applications assigned to you for scoring, and what is still outstanding.'}
            {perms.isOfficial && !perms.isEvaluator && `${user?.department?.name || 'Platform'} — pipeline from problem statement to contract.`}
          </p>
        </div>
        <div className="row gap-2">
          {perms.canAuthorChallenge && (
            <Link className="btn btn--primary" to="/app/challenges/new">
              <IconPlus width={15} height={15} /> New problem statement
            </Link>
          )}
          {perms.isStartup && (
            <Link className="btn btn--primary" to="/app/challenges">
              Browse problem statements <IconArrowRight width={15} height={15} />
            </Link>
          )}
          {perms.isEvaluator && (
            <Link className="btn btn--primary" to="/app/evaluations">Open my worklist</Link>
          )}
        </div>
      </div>

      {loading && <Loading rows={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <>
          <div className={`grid grid--${data.tiles.length} mb-6`}>
            {data.tiles.map((t, i) => (
              <Tile
                key={t.key}
                label={t.label}
                value={t.money ? inr(t.value) : num(t.value)}
                accent={i === 0 ? 'accent' : i === data.tiles.length - 1 ? 'green' : undefined}
              />
            ))}
          </div>

          {perms.isStartup && <StartupBody data={data} navigate={navigate} />}
          {perms.isEvaluator && <EvaluatorBody />}
          {perms.isOfficial && !perms.isEvaluator && <OfficialBody data={data} perms={perms} navigate={navigate} />}
        </>
      )}
    </AppShell>
  );
}

/* --------------------------------------------------------------- startup */

function StartupBody({ data, navigate }) {
  const e = data.eligibility;
  return (
    <div className="grid grid--sidebar">
      <div className="stack gap-4">
        <Card
          title="My applications"
          actions={<Link className="btn btn--ghost btn--sm" to="/app/applications">View all</Link>}
          flush
        >
          <DataTable
            onRowClick={(r) => navigate(`/app/applications/${r.id}`)}
            columns={[
              { key: 'code', header: 'File', mono: true },
              {
                key: 'solution_title', header: 'Solution',
                render: (r) => (<><span className="cell-title">{r.solution_title}</span><span className="cell-sub">{r.challenge_code} · {r.challenge_title}</span></>),
              },
              { key: 'status', header: 'Status', render: (r) => <Status code={r.status} /> },
            ]}
            rows={data.recent ?? []}
            empty={{
              title: 'No applications yet',
              body: 'Browse open problem statements and apply to the ones that match what you build.',
            }}
          />
        </Card>

        {data.openMatches > 0 && (
          <Notice tone="info" title={`${data.openMatches} open problem statement${data.openMatches === 1 ? '' : 's'} in your sector`}>
            Applications are open now. Prior turnover and prior experience requirements do not apply to you.
            {' '}<Link to="/app/challenges">See them</Link>.
          </Notice>
        )}
      </div>

      <Card
        title="Eligibility status"
        actions={<Link className="btn btn--ghost btn--sm" to="/app/profile">Manage</Link>}
      >
        {!e?.checks ? (
          <Empty title="Not assessed yet">Open your profile and run the eligibility check.</Empty>
        ) : (
          <>
            <div className="mb-4"><Status code={e.status} /></div>
            <div className="stack gap-3">
              {e.checks.map((c) => (
                <div key={c.code} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  {c.pass
                    ? <IconCheck width={15} height={15} style={{ color: 'var(--green-600)', marginTop: 2, flex: 'none' }} />
                    : <IconX width={15} height={15} style={{ color: c.required ? 'var(--red-600)' : 'var(--amber-600)', marginTop: 2, flex: 'none' }} />}
                  <div>
                    <div className="small">{c.label}</div>
                    <div className="xs muted">{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            {e.relaxations?.length > 0 && (
              <div className="mt-5">
                <div className="capline mb-2">Applied to you automatically</div>
                {e.relaxations.map((r) => (
                  <div key={r.code} className="xs mb-2">
                    <span className="strong">{r.label}</span>
                    <span className="muted mono"> — {r.authority}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------- evaluator */

function EvaluatorBody() {
  const { data, loading } = useApi(endpoints.myEvaluations(), []);
  const navigate = useNavigate();
  const pending = (data ?? []).filter((e) => e.status === 'ASSIGNED');

  if (loading) return <Loading rows={4} />;

  return (
    <Card
      title="Awaiting your score"
      subtitle="Applicant identity is withheld until your score is submitted and locked"
      actions={<Link className="btn btn--ghost btn--sm" to="/app/evaluations">Full worklist</Link>}
      flush
    >
      <DataTable
        onRowClick={() => navigate('/app/evaluations')}
        columns={[
          { key: 'application_code', header: 'File', mono: true },
          {
            key: 'solution_title', header: 'Solution',
            render: (r) => (<><span className="cell-title">{r.solution_title}</span><span className="cell-sub">{r.challenge_code} · {r.dept_name}</span></>),
          },
          { key: 'sector', header: 'Sector', render: (r) => <span className="small">{r.sector}</span> },
          { key: 'assigned_at', header: 'Assigned', render: (r) => <span className="small muted">{relative(r.assigned_at)}</span> },
        ]}
        rows={pending}
        empty={{ title: 'Nothing pending', body: 'Every application assigned to you has been scored.' }}
      />
    </Card>
  );
}

/* -------------------------------------------------------------- official */

function OfficialBody({ data, perms, navigate }) {
  return (
    <div className="stack gap-4">
      {perms.canApprove && data.pendingApprovals?.length > 0 && (
        <Card
          title="Awaiting your approval"
          subtitle="A problem statement cannot be published until the department head approves it"
          flush
        >
          <DataTable
            onRowClick={(r) => navigate(`/app/challenges/${r.id}`)}
            columns={[
              { key: 'code', header: 'File', mono: true },
              { key: 'title', header: 'Problem statement', render: (r) => <span className="cell-title">{r.title}</span> },
              { key: 'created_at', header: 'Raised', render: (r) => <span className="small muted">{date(r.created_at)}</span> },
              { key: 'go', header: '', align: 'right', render: () => <Button size="sm">Review</Button> },
            ]}
            rows={data.pendingApprovals}
          />
        </Card>
      )}

      <div className="grid grid--sidebar">
        <Card
          title="Milestones awaiting review"
          subtitle="Acceptance starts the 45-day payment clock under the MSMED Act"
          flush
        >
          <DataTable
            onRowClick={(r) => navigate(`/app/pilots/${r.pilot_id}`)}
            columns={[
              { key: 'pilot_code', header: 'Pilot', mono: true },
              {
                key: 'title', header: 'Milestone',
                render: (r) => (<><span className="cell-title">M{r.seq} · {r.title}</span><span className="cell-sub">{r.brand_name}</span></>),
              },
              { key: 'submitted_at', header: 'Submitted', render: (r) => <span className="small muted">{relative(r.submitted_at)}</span> },
            ]}
            rows={data.milestonesAwaitingReview ?? []}
            empty={{ title: 'Nothing awaiting review', body: 'Milestone evidence appears here as soon as a startup submits it.' }}
          />
        </Card>

        <Card title="Application pipeline">
          {(data.funnel ?? []).length === 0 ? (
            <Empty title="No applications yet" />
          ) : (
            <div className="stack gap-3">
              {data.funnel.map((f) => {
                const total = data.funnel.reduce((s, x) => s + x.count, 0) || 1;
                return (
                  <div key={f.status}>
                    <div className="row between mb-2">
                      <Status code={f.status} />
                      <span className="tnum small strong">{f.count}</span>
                    </div>
                    <div className="bar"><div className="bar__fill" style={{ width: `${(f.count / total) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

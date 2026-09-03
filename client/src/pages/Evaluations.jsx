import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { inr, relative } from '../lib/format.js';
import {
  Bar, Button, Card, DataTable, DL, ErrorState, Field, Loading, Modal,
  Notice, PageHead, Select, Status, Textarea, Tile, useToast, CheckLine, Empty,
} from '../components/ui.jsx';

export default function Evaluations() {
  useDocumentTitle('Evaluation worklist');
  const { data, loading, error, reload } = useApi(endpoints.myEvaluations(), []);
  const { data: rubric } = useApi(endpoints.evaluationCriteria(), []);
  const [open, setOpen] = useState(null);

  const pending = (data ?? []).filter((e) => e.status === 'ASSIGNED');
  const done = (data ?? []).filter((e) => e.status === 'SUBMITTED');

  return (
    <AppShell crumbs={[{ label: 'Evaluations' }]}>
      <PageHead
        title="Evaluation worklist"
        lede="Applications assigned to you. The first pass is blind: you see the solution, not the applicant, until your score is submitted and locked."
      />

      <div className="grid grid--3 mb-6">
        <Tile label="Assigned to me" value={data?.length ?? 0} accent="accent" />
        <Tile label="Awaiting my score" value={pending.length} accent={pending.length ? 'saffron' : 'green'} />
        <Tile label="Submitted and locked" value={done.length} />
      </div>

      {loading && <Loading rows={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="stack gap-4">
          <Card title="Awaiting your score" flush>
            <DataTable
              onRowClick={(r) => setOpen(r)}
              columns={[
                { key: 'application_code', header: 'File', mono: true },
                {
                  key: 'solution_title', header: 'Solution',
                  render: (r) => (<><span className="cell-title">{r.solution_title}</span><span className="cell-sub">{r.challenge_code} · {r.challenge_title}</span></>),
                },
                { key: 'sector', header: 'Sector', render: (r) => <span className="small">{r.sector}</span> },
                { key: 'trl_claimed', header: 'TRL', align: 'right' },
                { key: 'quoted_pilot_cost', header: 'Quote', align: 'right', render: (r) => <span className="tnum">{inr(r.quoted_pilot_cost)}</span> },
                { key: 'assigned_at', header: 'Assigned', render: (r) => <span className="small muted">{relative(r.assigned_at)}</span> },
                { key: 'go', header: '', align: 'right', render: () => <Button size="sm" variant="primary">Score</Button> },
              ]}
              rows={pending}
              rowKey={(r) => r.id}
              empty={{ title: 'Nothing pending', body: 'Every application assigned to you has been scored.' }}
            />
          </Card>

          <Card title="Scores you have submitted" subtitle="Locked. A submitted score cannot be edited." flush>
            <DataTable
              onRowClick={(r) => setOpen(r)}
              columns={[
                { key: 'application_code', header: 'File', mono: true },
                { key: 'solution_title', header: 'Solution', render: (r) => <span className="cell-title">{r.solution_title}</span> },
                {
                  key: 'total_score', header: 'My score', align: 'right',
                  render: (r) => (<div style={{ minWidth: 84 }}><div className="row between mb-2"><span className="tnum strong">{r.total_score}</span><span className="xs muted">/100</span></div><Bar value={r.total_score} /></div>),
                },
                { key: 'recommendation', header: 'Recommendation', render: (r) => <Status code={r.recommendation} /> },
                { key: 'submitted_at', header: 'Submitted', render: (r) => <span className="small muted">{relative(r.submitted_at)}</span> },
              ]}
              rows={done}
              rowKey={(r) => r.id}
              empty={{ title: 'No submitted scores yet' }}
            />
          </Card>
        </div>
      )}

      {open && (
        <ScoreSheet
          item={open}
          rubric={rubric}
          onClose={() => setOpen(null)}
          onDone={() => { setOpen(null); reload(); }}
        />
      )}
    </AppShell>
  );
}

function ScoreSheet({ item, rubric, onClose, onDone }) {
  const toast = useToast();
  const locked = item.status === 'SUBMITTED';
  const criteria = rubric?.criteria ?? [];

  const [scores, setScores] = useState(() => item.scores || {});
  const [remarks, setRemarks] = useState(item.remarks || '');
  const [recommendation, setRecommendation] = useState(item.recommendation || '');
  const [coi, setCoi] = useState(!!item.coi_declared);
  const [busy, setBusy] = useState(false);

  const bucketTotals = (bucket) => {
    const list = criteria.filter((c) => c.bucket === bucket);
    const got = list.reduce((s, c) => s + Math.min(c.max_score, Number(scores[c.code] || 0)) * c.weight, 0);
    const max = list.reduce((s, c) => s + c.max_score * c.weight, 0) || 1;
    const cap = rubric?.bucketCap?.[bucket] ?? 0;
    return Math.round((got / max) * cap * 100) / 100;
  };

  const technical = bucketTotals('TECHNICAL');
  const commercial = bucketTotals('COMMERCIAL');
  const total = Math.round((technical + commercial) * 100) / 100;
  const qualifies = technical >= (rubric?.qualifyingTechnical ?? 45);
  const complete = criteria.every((c) => scores[c.code] !== undefined && scores[c.code] !== '');
  const ready = complete && coi && remarks.length >= 20 && recommendation;

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(endpoints.submitScore(item.id), {
        scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Number(v)])),
        remarks,
        recommendation,
        coiDeclared: coi,
      });
      toast.success('Score submitted and locked');
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open wide
      title={locked ? 'Submitted score' : 'Score this application'}
      subtitle={`${item.application_code} · ${item.challenge_code} · ${item.dept_name}`}
      onClose={onClose}
      footer={locked ? <Button onClick={onClose}>Close</Button> : (
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!ready} onClick={submit}>
            Submit and lock score
          </Button>
        </>
      )}
    >
      {!locked && (
        <div className="mb-4">
          <Notice tone="info" title="Blind evaluation">
            The applicant&apos;s identity is withheld from you until your score is submitted. Score the
            solution against the published rubric and the KPIs the department declared.
          </Notice>
        </div>
      )}

      <Card title={item.solution_title} className="mb-4">
        <p className="reading dim small">{item.solution_summary}</p>
        {item.approach && (<><div className="capline mt-4 mb-2">Approach</div><p className="reading dim small">{item.approach}</p></>)}
        {item.differentiators && (<><div className="capline mt-4 mb-2">Differentiators</div><p className="reading dim small">{item.differentiators}</p></>)}
        {item.risks && (<><div className="capline mt-4 mb-2">Declared risks</div><p className="reading dim small">{item.risks}</p></>)}
        <div className="mt-4">
          <DL tight items={[
            ['Claimed readiness', `TRL ${item.trl_claimed}`],
            ['Quoted pilot cost', <span className="tnum">{inr(item.quoted_pilot_cost)}</span>],
            ['Against ceiling', <span className="tnum muted">{inr(item.pilot_budget_ceiling)}</span>],
            ['Proposed timeline', `${item.timeline_weeks} weeks`],
            ['Prior deployments', item.prior_deployments],
          ]} />
        </div>
      </Card>

      {(item.success_kpis ?? []).length > 0 && (
        <Card title="KPIs the solution must move" className="mb-4" flush>
          <DataTable
            columns={[
              { key: 'label', header: 'Indicator' },
              { key: 'target', header: 'Target', align: 'right', render: (k) => <span className="tnum">{k.target} {k.unit}</span> },
              { key: 'direction', header: '', render: (k) => <span className="xs muted">{k.direction === 'DOWN' ? 'lower is better' : 'higher is better'}</span> },
            ]}
            rows={item.success_kpis}
            rowKey={(k) => k.key}
          />
        </Card>
      )}

      <div className="grid grid--2 mb-4">
        <div className="tile tile--accent">
          <div className="tile__label">Technical envelope</div>
          <div className="tile__value">{technical}<span className="muted" style={{ fontSize: 'var(--text-md)' }}> / 70</span></div>
          <div className="tile__foot" style={{ color: qualifies ? 'var(--green-700)' : 'var(--red-700)' }}>
            {qualifies ? 'Above the qualifying threshold' : `Below the qualifying threshold of ${rubric?.qualifyingTechnical ?? 45}`}
          </div>
        </div>
        <div className="tile tile--saffron">
          <div className="tile__label">Commercial envelope</div>
          <div className="tile__value">{commercial}<span className="muted" style={{ fontSize: 'var(--text-md)' }}> / 30</span></div>
          <div className="tile__foot">Total {total} of 100</div>
        </div>
      </div>

      <div className="stack gap-4">
        {['TECHNICAL', 'COMMERCIAL'].map((bucket) => (
          <div key={bucket}>
            <div className="capline mb-3">{bucket === 'TECHNICAL' ? 'Technical criteria' : 'Commercial criteria'}</div>
            <div className="stack gap-3">
              {criteria.filter((c) => c.bucket === bucket).map((c) => (
                <div key={c.code} className="row gap-4" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <div className="small strong">{c.label} <span className="muted xs">×{c.weight}</span></div>
                    <div className="xs muted">{c.description}</div>
                  </div>
                  <div style={{ width: 190, flex: 'none' }}>
                    <input
                      type="range" min="0" max={c.max_score} step="0.5"
                      value={scores[c.code] ?? ''} disabled={locked}
                      onChange={(e) => setScores((s) => ({ ...s, [c.code]: e.target.value }))}
                      style={{ width: '100%', accentColor: 'var(--brand-700)' }}
                      aria-label={c.label}
                    />
                    <div className="row between xs muted"><span>0</span><span className="tnum strong" style={{ color: 'var(--ink-900)' }}>{scores[c.code] ?? '—'}</span><span>{c.max_score}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <Field label="Recommendation" required>
          <Select
            value={recommendation} onChange={(e) => setRecommendation(e.target.value)} disabled={locked}
            placeholder="Select a recommendation"
            options={[
              { value: 'RECOMMEND', label: 'Recommend for pilot' },
              { value: 'RECOMMEND_WITH_CONDITIONS', label: 'Recommend with conditions' },
              { value: 'NOT_RECOMMEND', label: 'Do not recommend' },
            ]}
          />
        </Field>
        <Field
          label="Written justification" required
          hint={`Minimum 20 characters. This is what an auditor reads. ${remarks.length} entered.`}
        >
          <Textarea rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={locked} />
        </Field>
        {!locked && (
          <CheckLine checked={coi} onChange={setCoi} title="I declare no conflict of interest">
            I have no financial interest in, employment relationship with, or family connection to the
            applicant, and no other interest that could reasonably be seen to affect my judgement.
          </CheckLine>
        )}
      </div>
    </Modal>
  );
}

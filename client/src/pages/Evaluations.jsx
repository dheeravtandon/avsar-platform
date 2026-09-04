import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { inr, relative } from '../lib/format.js';
import {
  Bar, Button, Card, CheckLine, DataTable, DL, ErrorState, Loading,
  Modal, Notice, PageHead, Status, Tile, useToast,
} from '../components/ui.jsx';

export default function Evaluations() {
  useDocumentTitle('Evaluation worklist');
  const { data, loading, error, reload } = useApi(endpoints.myEvaluations(), []);
  const [open, setOpen] = useState(null);

  const pending = (data ?? []).filter((e) => e.status === 'ASSIGNED');
  const done = (data ?? []).filter((e) => e.status === 'SUBMITTED');

  return (
    <AppShell crumbs={[{ label: 'Evaluations' }]}>
      <PageHead
        title="Evaluation worklist"
        lede="Run a blind, explainable evidence evaluation using the application records already verified by AVSAR. Results are versioned, auditable and locked when submitted."
      />

      <div className="grid grid--3 mb-6">
        <Tile label="Assigned to me" value={data?.length ?? 0} accent="accent" />
        <Tile label="Awaiting evaluation" value={pending.length} accent={pending.length ? 'saffron' : 'green'} />
        <Tile label="Completed and locked" value={done.length} />
      </div>

      {loading && <Loading rows={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="stack gap-4">
          <Card title="Awaiting automated evaluation" flush>
            <DataTable
              onRowClick={(row) => setOpen(row)}
              columns={[
                { key: 'application_code', header: 'File', mono: true },
                {
                  key: 'solution_title', header: 'Solution',
                  render: (row) => (<><span className="cell-title">{row.solution_title}</span><span className="cell-sub">{row.challenge_code} · {row.challenge_title}</span></>),
                },
                { key: 'sector', header: 'Sector', render: (row) => <span className="small">{row.sector}</span> },
                { key: 'trl_claimed', header: 'TRL', align: 'right' },
                { key: 'quoted_pilot_cost', header: 'Quote', align: 'right', render: (row) => <span className="tnum">{inr(row.quoted_pilot_cost)}</span> },
                { key: 'assigned_at', header: 'Assigned', render: (row) => <span className="small muted">{relative(row.assigned_at)}</span> },
                { key: 'go', header: '', align: 'right', render: () => <Button size="sm" variant="primary">Evaluate</Button> },
              ]}
              rows={pending}
              rowKey={(row) => row.id}
              empty={{ title: 'Nothing pending', body: 'Every assigned application has been evaluated.' }}
            />
          </Card>

          <Card title="Completed evaluations" subtitle="Locked results cannot be edited. Open a row to inspect its evidence and review flags." flush>
            <DataTable
              onRowClick={(row) => setOpen(row)}
              columns={[
                { key: 'application_code', header: 'File', mono: true },
                { key: 'solution_title', header: 'Solution', render: (row) => <span className="cell-title">{row.solution_title}</span> },
                {
                  key: 'total_score', header: 'Score', align: 'right',
                  render: (row) => (<div style={{ minWidth: 84 }}><div className="row between mb-2"><span className="tnum strong">{row.total_score}</span><span className="xs muted">/100</span></div><Bar value={row.total_score} /></div>),
                },
                { key: 'recommendation', header: 'Recommendation', render: (row) => <Status code={row.recommendation} /> },
                { key: 'submitted_at', header: 'Completed', render: (row) => <span className="small muted">{relative(row.submitted_at)}</span> },
              ]}
              rows={done}
              rowKey={(row) => row.id}
              empty={{ title: 'No completed evaluations yet' }}
            />
          </Card>
        </div>
      )}

      {open && (
        <AutomatedEvaluationSheet
          item={open}
          onClose={() => setOpen(null)}
          onDone={() => { setOpen(null); reload(); }}
        />
      )}
    </AppShell>
  );
}

function AutomatedEvaluationSheet({ item, onClose, onDone }) {
  const toast = useToast();
  const stored = item.scores?.evaluationMode === 'AUTOMATED' ? item.scores : null;
  const [result, setResult] = useState(stored?.result ?? null);
  const [inputBasis, setInputBasis] = useState(stored?.inputBasis ?? null);
  const [committeeRecommendation, setCommitteeRecommendation] = useState(item.recommendation ?? null);
  const [coi, setCoi] = useState(!!item.coi_declared);
  const [busy, setBusy] = useState(false);
  const [completedNow, setCompletedNow] = useState(false);
  const locked = item.status === 'SUBMITTED' || completedNow;

  const close = () => completedNow ? onDone() : onClose();
  const run = async () => {
    setBusy(true);
    try {
      const payload = await api.post(endpoints.runAutomatedEvaluation(item.id), { coiDeclared: coi });
      setResult(payload.result);
      setInputBasis(payload.inputBasis);
      setCommitteeRecommendation(payload.recommendation);
      setCompletedNow(true);
      toast.success('Automated evaluation completed and locked');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open wide
      title={locked ? 'Evaluation result' : 'Automated evidence evaluation'}
      subtitle={`${item.application_code} · ${item.challenge_code} · ${item.dept_name}`}
      onClose={close}
      footer={locked ? <Button variant="primary" onClick={close}>Close</Button> : (
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!coi} onClick={run}>
            Run and lock evaluation
          </Button>
        </>
      )}
    >
      {!locked && (
        <div className="mb-4">
          <Notice tone="info" title="Explainable automated evaluation">
            AVSAR will score the application with the versioned evidence algorithm. It uses stored
            application, eligibility, startup and challenge records; it does not call an external
            generative-AI service. The applicant remains blinded until the result is locked.
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
            ['Prior deployments', item.prior_deployments || 'Not declared'],
          ]} />
        </div>
      </Card>

      {(item.success_kpis ?? []).length > 0 && (
        <Card title="KPIs the solution must move" className="mb-4" flush>
          <DataTable
            columns={[
              { key: 'label', header: 'Indicator' },
              { key: 'target', header: 'Target', align: 'right', render: (kpi) => <span className="tnum">{kpi.target} {kpi.unit}</span> },
              { key: 'direction', header: '', render: (kpi) => <span className="xs muted">{kpi.direction === 'DOWN' ? 'lower is better' : 'higher is better'}</span> },
            ]}
            rows={item.success_kpis}
            rowKey={(kpi) => kpi.key}
          />
        </Card>
      )}

      {result ? (
        <EvaluationResult result={result} inputBasis={inputBasis} committeeRecommendation={committeeRecommendation} />
      ) : item.status === 'SUBMITTED' ? (
        <LegacyResult item={item} />
      ) : (
        <CheckLine checked={coi} onChange={setCoi} title="I declare no conflict of interest">
          I have no financial interest in, employment relationship with, or family connection to the
          applicant, and no other interest that could reasonably be seen to affect my judgement.
        </CheckLine>
      )}
    </Modal>
  );
}

function EvaluationResult({ result, inputBasis, committeeRecommendation }) {
  const scores = result.scores;
  return (
    <div className="stack gap-4">
      <div className="grid grid--3">
        <Tile label="Final score" value={`${scores.finalScore}/100`} accent="accent" />
        <Tile label="Overall risk" value={result.riskLevel} accent={result.riskLevel === 'LOW' ? 'green' : 'saffron'} />
        <Tile label="Committee outcome" value={<Status code={committeeRecommendation} />} />
      </div>

      <Card title={`Evidence engine · version ${result.algorithmVersion}`}>
        <DL tight items={[
          ['Engine recommendation', readable(result.recommendation)],
          ['Eligibility', result.eligibility.status],
          ['Startup capability', `${scores.startupCapability}/100`],
          ['Problem fit', `${scores.problemFit}/100`],
          ['Evidence confidence', `${scores.evidenceConfidence}/100`],
          ['Pilot readiness', `${scores.pilotReadiness}/100`],
          ['Security readiness', `${scores.securityReadiness}/100`],
          ['Scalability', `${scores.scalability}/100`],
        ]} />
      </Card>

      {result.mandatoryReviewFlags.length > 0 && (
        <Notice tone="warning" title="Mandatory review flags">
          {result.mandatoryReviewFlags.map(readable).join(' · ')}
        </Notice>
      )}

      <FactorCard title="Positive evidence" items={result.explanation.positiveFactors} empty="No positive threshold factor was triggered." />
      <FactorCard title="Concerns and weak evidence" items={[
        ...result.explanation.negativeFactors,
        ...result.explanation.missingOrWeakEvidence,
      ]} empty="No negative threshold factor was triggered." />
      <FactorCard title="Data limitations" items={inputBasis?.limitations ?? []} empty="No limitations recorded." />
    </div>
  );
}

function FactorCard({ title, items, empty }) {
  return (
    <Card title={title}>
      {items.length ? (
        <ul className="reading small" style={{ margin: 0, paddingLeft: 20 }}>
          {items.map((item, index) => <li key={`${index}-${item}`} className="mb-2">{item}</li>)}
        </ul>
      ) : <p className="small muted">{empty}</p>}
    </Card>
  );
}

function LegacyResult({ item }) {
  return (
    <Notice tone="info" title="Earlier committee score">
      This result was submitted with the previous manual rubric. Score: {item.total_score}/100.
      {item.remarks ? ` ${item.remarks}` : ''}
    </Notice>
  );
}

const readable = (value) => String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

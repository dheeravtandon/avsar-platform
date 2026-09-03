import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { inr } from '../lib/format.js';
import {
  Bar, Button, Card, DL, ErrorState, Field, Input, Loading, Notice,
  PageHead, Select, Textarea, useToast, Empty,
} from '../components/ui.jsx';
import { IconCheck, IconX } from '../components/Icons.jsx';

export default function ApplyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { data: c, loading, error, reload } = useApi(endpoints.challenge(id), [id]);
  const { data: meta } = useApi(endpoints.meta(), []);
  useDocumentTitle('Apply');

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [f, setF] = useState({
    solutionTitle: '', solutionSummary: '', approach: '',
    trlClaimed: user?.startup?.trl ?? 5, priorDeployments: '',
    teamSize: 5, quotedPilotCost: '', timelineWeeks: 16,
    differentiators: '', risks: '',
  });

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  if (loading) return <AppShell><Loading rows={6} /></AppShell>;
  if (error) return <AppShell><ErrorState error={error} onRetry={reload} /></AppShell>;
  if (!c) return <AppShell><Empty title="Problem statement not found" /></AppShell>;

  const overCeiling = f.quotedPilotCost && Number(f.quotedPilotCost) > Number(c.pilot_budget_ceiling);
  const overWindow = Number(f.timelineWeeks) > Math.floor(c.pilot_duration_months * 4.34);
  const underTrl = Number(f.trlClaimed) < Number(c.trl_min);
  const ready = f.solutionTitle.length > 4 && f.solutionSummary.length >= 50 && f.quotedPilotCost && !overCeiling && !overWindow && !underTrl;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const created = await api.post(endpoints.applications(), {
        challengeId: Number(c.id),
        solutionTitle: f.solutionTitle,
        solutionSummary: f.solutionSummary,
        approach: f.approach,
        trlClaimed: Number(f.trlClaimed),
        priorDeployments: f.priorDeployments,
        teamSize: Number(f.teamSize),
        quotedPilotCost: Number(f.quotedPilotCost),
        timelineWeeks: Number(f.timelineWeeks),
        differentiators: f.differentiators,
        risks: f.risks,
        attachments: [],
      });
      const result = await api.post(endpoints.applicationSubmit(created.id));
      if (result.status === 'ELIGIBILITY_FAIL') {
        toast.error('Submitted, but blocked at the eligibility gate');
      } else {
        toast.success(`Application ${created.code} submitted`);
      }
      navigate(`/app/applications/${created.id}`);
    } catch (err) {
      toast.error(err.message);
      if (err.fields?.length) setErrors(Object.fromEntries(err.fields.map((x) => [x.path, x.message])));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell crumbs={[
      { label: 'Problem statements', to: '/app/challenges' },
      { label: c.code, to: `/app/challenges/${c.id}` },
      { label: 'Apply' },
    ]}>
      <PageHead
        title="Apply to this problem statement"
        lede={c.title}
      />

      <form onSubmit={submit}>
        <div className="grid grid--sidebar">
          <div className="stack gap-4">
            <Card title="Your solution">
              <Field label="Solution title" required id="st" error={errors.solutionTitle}>
                <Input id="st" value={f.solutionTitle} onChange={set('solutionTitle')} placeholder="AquaSense district metering with acoustic correlation" />
              </Field>
              <Field
                label="Solution summary" required id="ss" error={errors.solutionSummary}
                hint={`What it is and what it does, in plain terms. ${f.solutionSummary.length}/50 characters minimum.`}
              >
                <Textarea id="ss" rows={5} value={f.solutionSummary} onChange={set('solutionSummary')} />
              </Field>
              <Field label="Approach" id="ap" hint="How it actually works, and how it integrates with what the department already runs.">
                <Textarea id="ap" rows={4} value={f.approach} onChange={set('approach')} />
              </Field>
              <Field label="What makes this different" id="diff" hint="Be specific. 'AI-powered' is not a differentiator; a named capability the alternatives lack is.">
                <Textarea id="diff" rows={3} value={f.differentiators} onChange={set('differentiators')} />
              </Field>
              <Field
                label="Risks and how you would handle them" id="risk"
                hint="Declaring a real risk is scored as candour. Committees discount proposals that claim none."
              >
                <Textarea id="risk" rows={3} value={f.risks} onChange={set('risks')} />
              </Field>
            </Card>

            <Card title="Delivery">
              <div className="grid grid--3">
                <Field label="Claimed TRL" required id="trl"
                  error={underTrl ? `Below the declared floor of TRL ${c.trl_min}` : null}
                  hint={meta?.trlScale?.find((t) => t.level === Number(f.trlClaimed))?.label}>
                  <Select id="trl" value={f.trlClaimed} onChange={set('trlClaimed')}
                    options={(meta?.trlScale ?? []).map((t) => ({ value: t.level, label: `TRL ${t.level}` }))} />
                </Field>
                <Field label="Team size on this pilot" required id="team">
                  <Input id="team" type="number" min="1" value={f.teamSize} onChange={set('teamSize')} />
                </Field>
                <Field label="Timeline (weeks)" required id="wk"
                  error={overWindow ? `Exceeds the ${c.pilot_duration_months}-month pilot window` : null}>
                  <Input id="wk" type="number" min="1" value={f.timelineWeeks} onChange={set('timelineWeeks')} />
                </Field>
              </div>
              <Field label="Quoted pilot cost (INR)" required id="cost"
                error={overCeiling ? `Above the published ceiling of ${inr(c.pilot_budget_ceiling)}` : errors.quotedPilotCost}
                hint={f.quotedPilotCost ? inr(f.quotedPilotCost) : `Ceiling ${inr(c.pilot_budget_ceiling)}`}>
                <Input id="cost" type="number" min="1" value={f.quotedPilotCost} onChange={set('quotedPilotCost')} />
              </Field>
              <Field label="Prior deployments" id="prior"
                hint="Information only. Prior experience is not a qualification requirement — GFR 2017 Rule 173(i) waives it.">
                <Textarea id="prior" rows={2} value={f.priorDeployments} onChange={set('priorDeployments')} />
              </Field>
            </Card>
          </div>

          <div className="stack gap-4">
            <Card title="What you must beat">
              <div className="stack gap-3">
                {(c.success_kpis ?? []).map((k) => (
                  <div key={k.key}>
                    <div className="row between">
                      <span className="small strong">{k.label}</span>
                      <span className="tnum small">{k.target} {k.unit}</span>
                    </div>
                    <div className="xs muted">{k.direction === 'DOWN' ? 'Lower is better' : 'Higher is better'}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Terms">
              <DL tight items={[
                ['Budget ceiling', <span className="strong tnum">{inr(c.pilot_budget_ceiling)}</span>],
                ['Pilot window', `${c.pilot_duration_months} months`],
                ['Minimum TRL', `TRL ${c.trl_min}`],
                ['Scale-up', c.scale_value ? inr(c.scale_value) : null],
                ['IP', { STARTUP_RETAINS: 'You retain IP', JOINT: 'Jointly held', GOVT_OWNS: 'Government owns IP' }[c.ip_terms]],
              ]} />
            </Card>

            {c.match && (
              <Card title="Your match score">
                <div className="row between mb-2">
                  <span className="serif" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{c.match.score}</span>
                  <span className="muted small">of 100</span>
                </div>
                <Bar value={c.match.score} />
                <div className="mt-3 stack gap-2">
                  {c.match.reasons.map((r) => (
                    <div key={r.factor} className="row between xs">
                      <span className="muted">{r.factor}</span>
                      <span className="tnum">+{r.points}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 xs muted">
                  Discovery ranking only. Merit is decided by the committee against the published rubric.
                </div>
              </Card>
            )}

            <Card title="Eligibility check">
              {(user?.startup?.eligibility_status === 'ELIGIBLE') ? (
                <div className="row gap-2 small">
                  <IconCheck width={16} height={16} style={{ color: 'var(--green-600)' }} />
                  <span>You cleared the statutory gate. It will be re-run at submission.</span>
                </div>
              ) : (
                <div className="row gap-2 small">
                  <IconX width={16} height={16} style={{ color: 'var(--red-600)' }} />
                  <span>Your profile does not currently clear the statutory gate. You may still submit; the gate result will be recorded.</span>
                </div>
              )}
            </Card>

            <Notice tone="legal">
              On submit, the statutory eligibility gate and the challenge fit gate run immediately, and
              their verdicts are stored on the application. No Earnest Money Deposit and no tender fee
              apply.
            </Notice>

            <div className="row gap-3">
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="primary" block loading={busy} disabled={!ready}>
                Submit application
              </Button>
            </div>
          </div>
        </div>
      </form>
    </AppShell>
  );
}

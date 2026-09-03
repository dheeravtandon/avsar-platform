import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { inr } from '../lib/format.js';
import {
  Button, Card, Field, Input, Notice, PageHead, Select, TagPicker, Textarea, useToast,
} from '../components/ui.jsx';
import { IconPlus, IconX } from '../components/Icons.jsx';

const blankKpi = () => ({ key: '', label: '', target: '', unit: '', direction: 'UP' });

export default function ChallengeForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  useDocumentTitle(editing ? 'Edit problem statement' : 'New problem statement');

  const { data: meta } = useApi(endpoints.meta(), []);
  const { data: existing } = useApi(editing ? endpoints.challenge(id) : null, [id], { skip: !editing });

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [f, setF] = useState({
    title: '', problemStatement: '', background: '', currentBaseline: '', desiredOutcome: '',
    sector: '', tags: [], trlMin: 5, pilotBudgetCeiling: '', pilotDurationMonths: 6,
    scaleValue: '', scaleUnits: '', deploymentEnv: '', dataAvailability: '',
    ipTerms: 'STARTUP_RETAINS', securityClearance: false, closesAt: '',
    successKpis: [blankKpi()],
  });

  useEffect(() => {
    if (!existing) return;
    setF({
      title: existing.title || '',
      problemStatement: existing.problem_statement || '',
      background: existing.background || '',
      currentBaseline: existing.current_baseline || '',
      desiredOutcome: existing.desired_outcome || '',
      sector: existing.sector || '',
      tags: existing.tags || [],
      trlMin: existing.trl_min ?? 5,
      pilotBudgetCeiling: existing.pilot_budget_ceiling ?? '',
      pilotDurationMonths: existing.pilot_duration_months ?? 6,
      scaleValue: existing.scale_value ?? '',
      scaleUnits: existing.scale_units || '',
      deploymentEnv: existing.deployment_env || '',
      dataAvailability: existing.data_availability || '',
      ipTerms: existing.ip_terms || 'STARTUP_RETAINS',
      securityClearance: !!existing.security_clearance,
      closesAt: existing.closes_at ? String(existing.closes_at).slice(0, 10) : '',
      successKpis: existing.success_kpis?.length ? existing.success_kpis : [blankKpi()],
    });
  }, [existing]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));
  const setKpi = (i, k, v) => setF((p) => ({
    ...p, successKpis: p.successKpis.map((kpi, n) => (n === i ? { ...kpi, [k]: v } : kpi)),
  }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    const payload = {
      ...f,
      trlMin: Number(f.trlMin),
      pilotBudgetCeiling: Number(f.pilotBudgetCeiling),
      pilotDurationMonths: Number(f.pilotDurationMonths),
      scaleValue: Number(f.scaleValue || 0),
      successKpis: f.successKpis
        .filter((k) => k.label && k.target !== '')
        .map((k) => ({
          key: (k.key || k.label).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24),
          label: k.label,
          target: Number(k.target),
          unit: k.unit || '',
          direction: k.direction,
        })),
    };

    try {
      const res = editing
        ? await api.put(endpoints.challenge(id), payload)
        : await api.post(endpoints.challenges(), payload);
      toast.success(editing ? 'Problem statement updated' : 'Draft created');
      navigate(`/app/challenges/${res.id}`);
    } catch (err) {
      toast.error(err.message);
      if (err.fields?.length) setErrors(Object.fromEntries(err.fields.map((x) => [x.path, x.message])));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell crumbs={[{ label: 'Problem statements', to: '/app/challenges' }, { label: editing ? 'Edit' : 'New' }]}>
      <PageHead
        title={editing ? 'Edit problem statement' : 'New problem statement'}
        lede="Write the outcome you need, not the product you want. Specifying a solution is what excludes approaches you have not thought of — and it is the single biggest reason startups cannot bid."
      />

      <form onSubmit={submit}>
        <div className="grid grid--sidebar">
          <div className="stack gap-4">
            <Card title="The problem">
              <Field label="Title" required id="title" error={errors.title}
                hint="One sentence a startup founder in a different sector could still understand.">
                <Input id="title" value={f.title} onChange={set('title')}
                  placeholder="Cut non-revenue water loss in two distribution zones below 15%" />
              </Field>

              <Field label="Problem statement" required id="ps" error={errors.problemStatement}
                hint="What is going wrong, at what scale, and why the obvious fix has not worked. Minimum 50 characters.">
                <Textarea id="ps" rows={6} value={f.problemStatement} onChange={set('problemStatement')} />
              </Field>

              <Field label="Background" id="bg" hint="Context a supplier needs: network size, user counts, existing systems.">
                <Textarea id="bg" rows={3} value={f.background} onChange={set('background')} />
              </Field>

              <Field label="Where things stand today" id="baseline"
                hint="The baseline, measured the same way it will be measured in the pilot. Without this a pilot cannot be judged.">
                <Textarea id="baseline" rows={3} value={f.currentBaseline} onChange={set('currentBaseline')} />
              </Field>

              <Field label="What success looks like" id="outcome">
                <Textarea id="outcome" rows={3} value={f.desiredOutcome} onChange={set('desiredOutcome')} />
              </Field>
            </Card>

            <Card
              title="Success criteria"
              subtitle="At least one measurable indicator is mandatory. These exact numbers decide the pilot verdict."
              actions={
                <Button size="sm" onClick={() => setF((p) => ({ ...p, successKpis: [...p.successKpis, blankKpi()] }))}>
                  <IconPlus width={14} height={14} /> Add indicator
                </Button>
              }
            >
              <div className="stack gap-4">
                {f.successKpis.map((k, i) => (
                  <div key={i} className="row gap-3" style={{ alignItems: 'flex-end' }}>
                    <div className="grow" style={{ flex: '2 1 220px' }}>
                      <Field label={i === 0 ? 'Indicator' : null}>
                        <Input value={k.label} onChange={(e) => setKpi(i, 'label', e.target.value)} placeholder="Non-revenue water" />
                      </Field>
                    </div>
                    <div style={{ width: 110 }}>
                      <Field label={i === 0 ? 'Target' : null}>
                        <Input type="number" value={k.target} onChange={(e) => setKpi(i, 'target', e.target.value)} placeholder="15" />
                      </Field>
                    </div>
                    <div style={{ width: 110 }}>
                      <Field label={i === 0 ? 'Unit' : null}>
                        <Input value={k.unit} onChange={(e) => setKpi(i, 'unit', e.target.value)} placeholder="%" />
                      </Field>
                    </div>
                    <div style={{ width: 170 }}>
                      <Field label={i === 0 ? 'Direction' : null}>
                        <Select value={k.direction} onChange={(e) => setKpi(i, 'direction', e.target.value)}
                          options={[{ value: 'UP', label: 'Higher is better' }, { value: 'DOWN', label: 'Lower is better' }]} />
                      </Field>
                    </div>
                    <div className="field">
                      <Button
                        size="sm" variant="ghost" aria-label="Remove indicator"
                        disabled={f.successKpis.length === 1}
                        onClick={() => setF((p) => ({ ...p, successKpis: p.successKpis.filter((_, n) => n !== i) }))}
                      >
                        <IconX width={15} height={15} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Deployment context">
              <Field label="Deployment environment" id="env"
                hint="Where it has to run and what it has to survive: connectivity, power, physical conditions, existing systems.">
                <Textarea id="env" rows={2} value={f.deploymentEnv} onChange={set('deploymentEnv')} />
              </Field>
              <Field label="Data the department can provide" id="data"
                hint="Being specific here is the difference between a serious application and a guess.">
                <Textarea id="data" rows={2} value={f.dataAvailability} onChange={set('dataAvailability')} />
              </Field>
            </Card>
          </div>

          <div className="stack gap-4">
            <Card title="Classification">
              <Field label="Sector" required id="sector" error={errors.sector}>
                <Select id="sector" value={f.sector} onChange={set('sector')} placeholder="Select sector" options={meta?.sectors ?? []} />
              </Field>
              <Field label="Capability tags"
                hint="The match engine scores overlap between these tags and a startup's declared capabilities.">
                <TagPicker options={meta?.capabilityTags ?? []} value={f.tags} onChange={(v) => setF((p) => ({ ...p, tags: v }))} />
              </Field>
              <Field label="Minimum Technology Readiness Level" required id="trl"
                hint={meta?.trlScale?.find((t) => t.level === Number(f.trlMin))?.label}>
                <Select id="trl" value={f.trlMin} onChange={set('trlMin')}
                  options={(meta?.trlScale ?? []).map((t) => ({ value: t.level, label: `TRL ${t.level}` }))} />
              </Field>
            </Card>

            <Card title="Commercial terms">
              <Field label="Pilot budget ceiling (INR)" required id="ceiling" error={errors.pilotBudgetCeiling}
                hint={f.pilotBudgetCeiling ? inr(f.pilotBudgetCeiling) : 'Applications quoting above this are rejected automatically.'}>
                <Input id="ceiling" type="number" min="1" value={f.pilotBudgetCeiling} onChange={set('pilotBudgetCeiling')} placeholder="4800000" />
              </Field>
              <Field label="Pilot duration (months)" required id="months">
                <Input id="months" type="number" min="1" max="24" value={f.pilotDurationMonths} onChange={set('pilotDurationMonths')} />
              </Field>
              <Field label="Indicative scale-up value (INR)" id="scale"
                hint={f.scaleValue ? inr(f.scaleValue) : 'What the order is worth if the pilot works. This is what makes a small pilot worth a startup\'s time.'}>
                <Input id="scale" type="number" min="0" value={f.scaleValue} onChange={set('scaleValue')} />
              </Field>
              <Field label="Scale-up units" id="units">
                <Input id="units" value={f.scaleUnits} onChange={set('scaleUnits')} placeholder="9 remaining zones" />
              </Field>
              <Field label="Applications close on" id="closes">
                <Input id="closes" type="date" value={f.closesAt} onChange={set('closesAt')} />
              </Field>
            </Card>

            <Card title="Terms">
              <Field label="Intellectual property" id="ip"
                hint="Startup retention is the default. It is the single term that most affects whether good teams apply.">
                <Select id="ip" value={f.ipTerms} onChange={set('ipTerms')}
                  options={[
                    { value: 'STARTUP_RETAINS', label: 'Startup retains IP' },
                    { value: 'JOINT', label: 'Jointly held' },
                    { value: 'GOVT_OWNS', label: 'Government owns IP' },
                  ]} />
              </Field>
              <label className="checkline">
                <input type="checkbox" checked={f.securityClearance}
                  onChange={(e) => setF((p) => ({ ...p, securityClearance: e.target.checked }))} />
                <span className="checkline__text">
                  <span className="strong">Security clearance required</span>
                  <div className="muted xs mt-2">Restricts the applicant pool substantially. Use only where the deployment genuinely requires it.</div>
                </span>
              </label>
            </Card>

            <Notice tone="legal" title="What happens on save">
              The problem statement is created as a draft with a file number. It becomes public only
              after the department head approves it.
            </Notice>

            <div className="row gap-3">
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={busy} block>
                {editing ? 'Save changes' : 'Create draft'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </AppShell>
  );
}

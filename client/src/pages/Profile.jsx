import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { inr, date } from '../lib/format.js';
import {
  Bar, Button, Card, CheckLine, Field, Input, Loading, Notice, PageHead,
  Select, Status, TagPicker, Tile, useToast,
} from '../components/ui.jsx';
import { IconCheck, IconRefresh, IconX } from '../components/Icons.jsx';

export default function Profile() {
  useDocumentTitle('Startup profile');
  const { user, refresh } = useAuth();
  const toast = useToast();
  const { data: meta } = useApi(endpoints.meta(), []);
  const s = user?.startup;

  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [f, setF] = useState(null);

  useEffect(() => {
    if (!s) return;
    setF({
      brandName: s.brand_name || '', cin: s.cin || '', gstin: s.gstin || '',
      udyamNumber: s.udyam_number || '', dpiitNumber: s.dpiit_number || '',
      dpiitValidTill: s.dpiit_valid_till ? String(s.dpiit_valid_till).slice(0, 10) : '',
      sector: s.sector || '', subSector: s.sub_sector || '', trl: s.trl ?? 5,
      capabilities: safe(s.capabilities), website: s.website || '',
      city: s.city || '', state: s.state || '', employees: s.employees ?? 0,
      womenLed: !!s.women_led, turnoverLastFy: s.turnover_last_fy ?? 0,
      hasPriorGovtOrder: !!s.has_prior_govt_order,
    });
    setVerdict(safe(s.eligibility_json, {}));
  }, [s]);

  if (!s || !f) return <AppShell crumbs={[{ label: 'Profile' }]}><Loading rows={6} /></AppShell>;

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.put(endpoints.myStartup(), {
        ...f,
        trl: Number(f.trl),
        employees: Number(f.employees),
        turnoverLastFy: Number(f.turnoverLastFy),
      });
      setVerdict(res.eligibility);
      await refresh();
      toast.success('Profile saved and eligibility re-checked');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setChecking(true);
    try {
      const res = await api.post(endpoints.recheckEligibility());
      setVerdict(res);
      await refresh();
      toast[res.eligible ? 'success' : 'error'](res.eligible ? 'You are eligible to apply' : 'Eligibility issues remain');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppShell crumbs={[{ label: 'Startup profile' }]}>
      <PageHead
        title="Startup profile"
        lede="This profile is the eligibility form. Every field below is a fact the statutory gate tests, or an input the discovery match engine uses."
        actions={<Button variant="secondary" loading={checking} onClick={recheck}><IconRefresh width={15} height={15} /> Re-run eligibility check</Button>}
      />

      <div className="grid grid--4 mb-6">
        <Tile label="Eligibility" value={<Status code={s.eligibility_status} />} accent={s.eligibility_status === 'ELIGIBLE' ? 'green' : 'saffron'} />
        <Tile label="KYC" value={<Status code={s.kyc_status} />} />
        <Tile label="Profile completeness" value={`${s.profile_completeness}%`} />
        <Tile label="Last FY turnover" value={inr(s.turnover_last_fy)} foot="Ceiling INR 100 Cr" />
      </div>

      <form onSubmit={save}>
        <div className="grid grid--sidebar">
          <div className="stack gap-4">
            <Card title="Recognition and identity" subtitle="These are the facts the statutory gate tests">
              <div className="grid grid--2">
                <Field label="DPIIT recognition number" required id="dpiit">
                  <Input id="dpiit" value={f.dpiitNumber} onChange={set('dpiitNumber')} />
                </Field>
                <Field label="Recognition valid till" id="till">
                  <Input id="till" type="date" value={f.dpiitValidTill} onChange={set('dpiitValidTill')} />
                </Field>
              </div>
              <div className="grid grid--2">
                <Field label="CIN / LLPIN" id="cin"><Input id="cin" value={f.cin} onChange={set('cin')} /></Field>
                <Field label="GSTIN" id="gstin"><Input id="gstin" value={f.gstin} onChange={set('gstin')} /></Field>
              </div>
              <div className="grid grid--2">
                <Field label="Udyam registration" id="udyam" hint="Enables MSME payment protection.">
                  <Input id="udyam" value={f.udyamNumber} onChange={set('udyamNumber')} />
                </Field>
                <Field label="Turnover, last financial year (INR)" required id="turnover"
                  hint={Number(f.turnoverLastFy) > 1e9 ? 'Above the INR 100 crore ceiling — this makes you ineligible.' : inr(f.turnoverLastFy)}>
                  <Input id="turnover" type="number" min="0" value={f.turnoverLastFy} onChange={set('turnoverLastFy')} />
                </Field>
              </div>
              <div className="mt-2">
                <Notice tone="legal" icon={false}>
                  Incorporation date and entity type are fixed at registration and cannot be edited here.
                  Incorporated {date(s.incorporation_date)} as {String(s.entity_type).replace('_', ' ').toLowerCase()}.
                </Notice>
              </div>
            </Card>

            <Card title="Capability" subtitle="Used by the discovery match engine and the challenge fit gate">
              <div className="grid grid--2">
                <Field label="Primary sector" required id="sector">
                  <Select id="sector" value={f.sector} onChange={set('sector')} options={meta?.sectors ?? []} />
                </Field>
                <Field label="Sub-sector" id="sub"><Input id="sub" value={f.subSector} onChange={set('subSector')} /></Field>
              </div>
              <Field label="Technology Readiness Level" required id="trl"
                hint={meta?.trlScale?.find((t) => t.level === Number(f.trl))?.label}>
                <Select id="trl" value={f.trl} onChange={set('trl')}
                  options={(meta?.trlScale ?? []).map((t) => ({ value: t.level, label: `TRL ${t.level}` }))} />
              </Field>
              <Field label="Capability tags" hint="Overlap with a problem statement's tags is worth up to 30 match points.">
                <TagPicker options={meta?.capabilityTags ?? []} value={f.capabilities} onChange={(v) => setF((p) => ({ ...p, capabilities: v }))} />
              </Field>
            </Card>

            <Card title="Company">
              <div className="grid grid--2">
                <Field label="Brand name" id="brand"><Input id="brand" value={f.brandName} onChange={set('brandName')} /></Field>
                <Field label="Website" id="web"><Input id="web" value={f.website} onChange={set('website')} /></Field>
              </div>
              <div className="grid grid--3">
                <Field label="City" id="city"><Input id="city" value={f.city} onChange={set('city')} /></Field>
                <Field label="State" id="state"><Select id="state" value={f.state} onChange={set('state')} options={meta?.states ?? []} /></Field>
                <Field label="Employees" id="emp"><Input id="emp" type="number" min="0" value={f.employees} onChange={set('employees')} /></Field>
              </div>
              <div className="stack gap-2 mt-2">
                <CheckLine checked={f.womenLed} onChange={(v) => setF((p) => ({ ...p, womenLed: v }))} title="Women-led enterprise">
                  At least 51% shareholding held by one or more women.
                </CheckLine>
                <CheckLine checked={f.hasPriorGovtOrder} onChange={(v) => setF((p) => ({ ...p, hasPriorGovtOrder: v }))} title="We have delivered a prior government order">
                  A match-engine signal only. Never a qualification requirement.
                </CheckLine>
              </div>
            </Card>
          </div>

          <div className="stack gap-4">
            <Card title="Eligibility gate">
              {verdict?.checks ? (
                <>
                  <div className="mb-4"><Status code={verdict.status} /></div>
                  <div className="stack gap-3">
                    {verdict.checks.map((c) => (
                      <div key={c.code} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                        {c.pass
                          ? <IconCheck width={15} height={15} style={{ color: 'var(--green-600)', marginTop: 2, flex: 'none' }} />
                          : <IconX width={15} height={15} style={{ color: c.required ? 'var(--red-600)' : 'var(--amber-600)', marginTop: 2, flex: 'none' }} />}
                        <div>
                          <div className="small">{c.label}</div>
                          <div className="xs muted">{c.detail}</div>
                          <div className="xs muted mono">{c.authority}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="small muted">Save the profile to run the check.</p>}
            </Card>

            {verdict?.relaxations?.length > 0 && (
              <Card title="Applied to you automatically">
                <div className="stack gap-2">
                  {verdict.relaxations.map((r) => (
                    <div key={r.code} className="small">
                      <span className="strong">{r.label}</span>
                      <div className="xs muted mono">{r.authority}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="Profile completeness">
              <div className="row between mb-2">
                <span className="small muted">Fields filled</span>
                <span className="tnum strong">{s.profile_completeness}%</span>
              </div>
              <Bar value={s.profile_completeness} />
              <p className="xs muted mt-3">
                A complete profile ranks better in departmental discovery and reduces the chance of a
                gate failure at submission.
              </p>
            </Card>

            <Button type="submit" variant="primary" block loading={busy}>Save profile</Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}

function safe(v, fallback = []) {
  if (Array.isArray(v) || (v && typeof v === 'object')) return v;
  try { return JSON.parse(v ?? 'null') ?? fallback; } catch { return fallback; }
}

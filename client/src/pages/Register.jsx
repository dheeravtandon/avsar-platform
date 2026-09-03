import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints } from '../lib/api.js';
import { Button, Field, Input, Notice, Select, TagPicker, Textarea, CheckLine } from '../components/ui.jsx';
import { IconArrowLeft, IconCheck, IconX } from '../components/Icons.jsx';

const STEPS = ['Company', 'Recognition', 'Capability', 'Account'];

export default function Register() {
  useDocumentTitle('Register a startup');
  const { registerStartup } = useAuth();
  const navigate = useNavigate();
  const { data: meta } = useApi(endpoints.meta(), []);

  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState(null);

  const [f, setF] = useState({
    legalName: '', brandName: '', entityType: 'PRIVATE_LIMITED', cin: '', gstin: '', udyamNumber: '',
    incorporationDate: '', city: '', state: '', employees: 5, womenLed: false,
    dpiitNumber: '', dpiitValidTill: '2030-12-31', turnoverLastFy: 0,
    isSplitReconstruction: false, hasPriorGovtOrder: false,
    sector: '', subSector: '', trl: 5, capabilities: [], website: '',
    name: '', email: '', phone: '', password: '', confirm: '',
  });

  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));
  const onInput = (k) => (e) => set(k)(e.target.value);

  const stepValid = () => {
    if (step === 0) return f.legalName.length > 2 && f.incorporationDate && f.state;
    if (step === 1) return f.dpiitNumber.length > 2;
    if (step === 2) return f.sector && f.capabilities.length > 0;
    return f.name.length > 2 && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 8 && f.password === f.confirm;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!stepValid()) return;
    setBusy(true); setError(null); setFieldErrors({});
    try {
      const { eligibility } = await registerStartup({
        name: f.name, email: f.email, phone: f.phone, password: f.password,
        legalName: f.legalName, brandName: f.brandName || f.legalName, entityType: f.entityType,
        cin: f.cin, gstin: f.gstin, udyamNumber: f.udyamNumber,
        dpiitNumber: f.dpiitNumber, dpiitValidTill: f.dpiitValidTill,
        incorporationDate: f.incorporationDate, sector: f.sector, subSector: f.subSector,
        trl: Number(f.trl), capabilities: f.capabilities, website: f.website,
        city: f.city, state: f.state, employees: Number(f.employees),
        womenLed: f.womenLed, turnoverLastFy: Number(f.turnoverLastFy),
        isSplitReconstruction: f.isSplitReconstruction, hasPriorGovtOrder: f.hasPriorGovtOrder,
      });
      setVerdict(eligibility);
    } catch (err) {
      setError(err.message);
      if (err.fields?.length) {
        setFieldErrors(Object.fromEntries(err.fields.map((x) => [x.path, x.message])));
      }
    } finally {
      setBusy(false);
    }
  };

  if (verdict) {
    return (
      <div className="authwrap">
        <aside className="authwrap__aside">
          <h2>Eligibility assessed against statute, not opinion.</h2>
          <p className="mt-4" style={{ color: 'var(--brand-300)' }}>
            Every check below cites the notification or rule it comes from. If a check fails you can
            correct the underlying fact on your profile and re-run the gate — nothing is decided by a
            person you cannot reach.
          </p>
        </aside>
        <div className="authwrap__main">
          <div className="authcard" style={{ width: 'min(560px, 100%)' }}>
            <div className="mb-5">
              <Notice tone={verdict.eligible ? 'success' : 'warning'} title={verdict.eligible ? 'Registered and eligible to apply' : 'Registered, but the eligibility gate found issues'}>
                {verdict.eligible
                  ? 'Your DPIIT recognition has been accepted. You can now apply to any open problem statement.'
                  : 'You can still explore the platform. Correct the items marked below on your profile and re-run the check.'}
              </Notice>
            </div>

            <div className="card">
              <div className="card__head"><h3>Statutory checks</h3></div>
              <div className="card__body stack gap-3">
                {verdict.checks.map((c) => (
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
            </div>

            {verdict.eligible && verdict.relaxations?.length > 0 && (
              <div className="card mt-4">
                <div className="card__head"><h3>Relaxations applied automatically</h3></div>
                <div className="card__body stack gap-2">
                  {verdict.relaxations.map((r) => (
                    <div key={r.code} className="small">
                      <span className="strong">{r.label}</span>
                      <span className="muted mono xs"> — {r.authority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="row gap-3 mt-6">
              <Button variant="primary" onClick={() => navigate('/app')}>Go to my workspace</Button>
              <Button onClick={() => navigate('/app/challenges')}>Browse problem statements</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="authwrap">
      <aside className="authwrap__aside">
        <Link to="/" style={{ color: 'var(--brand-300)', fontSize: 'var(--text-sm)' }} className="row gap-2 mb-6">
          <IconArrowLeft width={14} height={14} /> Back to the public site
        </Link>
        <h2>Register once. Apply to every department on the platform.</h2>
        <p className="mt-4" style={{ color: 'var(--brand-300)', maxWidth: '46ch' }}>
          The registration form is the statutory eligibility form. Nothing is asked twice, and the
          moment you submit you are told exactly which criteria you meet and which you do not, with
          the rule cited against each.
        </p>
        <ol className="mt-8 small" style={{ color: 'var(--brand-300)', paddingLeft: '1.2em' }}>
          <li className="mb-3">Company identity and incorporation</li>
          <li className="mb-3">DPIIT recognition and financial declarations</li>
          <li className="mb-3">Sector, readiness level and capability tags used by the match engine</li>
          <li>Sign-in credentials</li>
        </ol>
      </aside>

      <div className="authwrap__main">
        <div className="authcard" style={{ width: 'min(560px, 100%)' }}>
          <div className="row gap-2 mb-4">
            {STEPS.map((s, i) => (
              <div key={s} className="grow">
                <div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--brand-800)' : 'var(--ink-200)' }} />
                <div className={`xs mt-2 ${i === step ? 'strong' : 'muted'}`}>{s}</div>
              </div>
            ))}
          </div>

          {error && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}

          <form onSubmit={submit}>
            {step === 0 && (
              <>
                <Field label="Registered legal name" required id="legalName" error={fieldErrors.legalName}>
                  <Input id="legalName" value={f.legalName} onChange={onInput('legalName')} placeholder="Netratva Vision Systems Private Limited" />
                </Field>
                <Field label="Brand name" hint="How the department will see you in listings." id="brandName">
                  <Input id="brandName" value={f.brandName} onChange={onInput('brandName')} placeholder="Netratva" />
                </Field>
                <div className="grid grid--2">
                  <Field label="Entity type" required id="entityType">
                    <Select id="entityType" value={f.entityType} onChange={onInput('entityType')}
                      options={[
                        { value: 'PRIVATE_LIMITED', label: 'Private Limited Company' },
                        { value: 'LLP', label: 'Limited Liability Partnership' },
                        { value: 'PARTNERSHIP', label: 'Registered Partnership Firm' },
                        { value: 'PROPRIETORSHIP', label: 'Proprietorship (not eligible)' },
                      ]} />
                  </Field>
                  <Field label="Date of incorporation" required id="inc" hint="Must be within the last ten years.">
                    <Input id="inc" type="date" value={f.incorporationDate} onChange={onInput('incorporationDate')} />
                  </Field>
                </div>
                <div className="grid grid--2">
                  <Field label="City" id="city"><Input id="city" value={f.city} onChange={onInput('city')} /></Field>
                  <Field label="State" required id="state">
                    <Select id="state" value={f.state} onChange={onInput('state')} placeholder="Select state" options={meta?.states ?? []} />
                  </Field>
                </div>
                <div className="grid grid--2">
                  <Field label="Employees" id="emp"><Input id="emp" type="number" min="1" value={f.employees} onChange={onInput('employees')} /></Field>
                  <Field label="Website" id="web"><Input id="web" value={f.website} onChange={onInput('website')} placeholder="https://" /></Field>
                </div>
                <CheckLine checked={f.womenLed} onChange={set('womenLed')} title="Women-led enterprise">
                  At least 51% shareholding held by one or more women. Reported separately on the transparency board.
                </CheckLine>
              </>
            )}

            {step === 1 && (
              <>
                <div className="mb-4">
                  <Notice tone="legal" title="What these fields are used for">
                    These are the exact facts the statutory gate tests. Nothing here is scored or ranked —
                    it only decides whether you clear the threshold to be evaluated on merit.
                  </Notice>
                </div>
                <Field label="DPIIT recognition number" required id="dpiit" hint="Format DIPPxxxxx, issued on the Startup India portal." error={fieldErrors.dpiitNumber}>
                  <Input id="dpiit" value={f.dpiitNumber} onChange={onInput('dpiitNumber')} placeholder="DIPP160411" />
                </Field>
                <div className="grid grid--2">
                  <Field label="Recognition valid till" id="dpiitTill">
                    <Input id="dpiitTill" type="date" value={f.dpiitValidTill} onChange={onInput('dpiitValidTill')} />
                  </Field>
                  <Field label="Turnover, last financial year (INR)" required id="turnover" hint="Must never have exceeded INR 100 crore.">
                    <Input id="turnover" type="number" min="0" value={f.turnoverLastFy} onChange={onInput('turnoverLastFy')} />
                  </Field>
                </div>
                <div className="grid grid--2">
                  <Field label="CIN / LLPIN" id="cin"><Input id="cin" value={f.cin} onChange={onInput('cin')} placeholder="U72900KA2021PTC100000" /></Field>
                  <Field label="GSTIN" id="gstin"><Input id="gstin" value={f.gstin} onChange={onInput('gstin')} placeholder="29AABCT1000K1Z0" /></Field>
                </div>
                <Field label="Udyam registration number" id="udyam" hint="Optional. Used for MSME payment protection under the MSMED Act.">
                  <Input id="udyam" value={f.udyamNumber} onChange={onInput('udyamNumber')} placeholder="UDYAM-KA-03-1000000" />
                </Field>
                <div className="stack gap-2">
                  <CheckLine checked={f.isSplitReconstruction} onChange={set('isSplitReconstruction')} title="Formed by splitting up or reconstruction of an existing business">
                    Declaring this true makes the entity ineligible under DPIIT G.S.R. 127(E) para 1(iv).
                  </CheckLine>
                  <CheckLine checked={f.hasPriorGovtOrder} onChange={set('hasPriorGovtOrder')} title="We have previously delivered a government order">
                    A signal for the match engine only. Never a qualification requirement — GFR 2017 Rule 173(i) waives prior experience.
                  </CheckLine>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid--2">
                  <Field label="Primary sector" required id="sector">
                    <Select id="sector" value={f.sector} onChange={onInput('sector')} placeholder="Select sector" options={meta?.sectors ?? []} />
                  </Field>
                  <Field label="Sub-sector" id="sub"><Input id="sub" value={f.subSector} onChange={onInput('subSector')} placeholder="Video analytics" /></Field>
                </div>
                <Field
                  label="Technology Readiness Level" required id="trl"
                  hint={meta?.trlScale?.find((t) => t.level === Number(f.trl))?.label}
                >
                  <Select id="trl" value={f.trl} onChange={onInput('trl')}
                    options={(meta?.trlScale ?? []).map((t) => ({ value: t.level, label: `TRL ${t.level} — ${t.label}` }))} />
                </Field>
                <Field
                  label="Capability tags" required
                  hint="Pick everything you can genuinely deliver. The match engine scores overlap with the tags a department attaches to a problem statement."
                  error={f.capabilities.length ? null : 'Select at least one capability'}
                >
                  <TagPicker options={meta?.capabilityTags ?? []} value={f.capabilities} onChange={set('capabilities')} />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Your full name" required id="name"><Input id="name" value={f.name} onChange={onInput('name')} /></Field>
                <div className="grid grid--2">
                  <Field label="Email address" required id="regemail" error={fieldErrors.email}>
                    <Input id="regemail" type="email" value={f.email} onChange={onInput('email')} autoComplete="username" />
                  </Field>
                  <Field label="Phone" id="phone"><Input id="phone" value={f.phone} onChange={onInput('phone')} /></Field>
                </div>
                <div className="grid grid--2">
                  <Field label="Password" required id="pw" hint="Minimum 8 characters." error={fieldErrors.password}>
                    <Input id="pw" type="password" value={f.password} onChange={onInput('password')} autoComplete="new-password" />
                  </Field>
                  <Field label="Confirm password" required id="pw2"
                    error={f.confirm && f.password !== f.confirm ? 'Passwords do not match' : null}>
                    <Input id="pw2" type="password" value={f.confirm} onChange={onInput('confirm')} autoComplete="new-password" />
                  </Field>
                </div>
                <div className="mt-4">
                  <Notice tone="legal">
                    On submitting, your declarations are checked against DPIIT G.S.R. 127(E) and the result
                    is stored with your profile. Personal data is processed under the DPDP Act 2023 for the
                    stated purpose of public procurement participation.
                  </Notice>
                </div>
              </>
            )}

            <div className="row gap-3 mt-6">
              {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
              <div className="grow" />
              {step < STEPS.length - 1 ? (
                <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!stepValid()}>Continue</Button>
              ) : (
                <Button type="submit" variant="primary" loading={busy} disabled={!stepValid()}>
                  Submit and run eligibility check
                </Button>
              )}
            </div>
          </form>

          <p className="small muted mt-4 center">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

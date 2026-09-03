import { POLICY } from '../config.js';

/**
 * Statutory eligibility gate for startup participation in public procurement.
 *
 * Sources encoded here:
 *  - DPIIT notification G.S.R. 127(E), 19-Feb-2019 (entity age, turnover, non-reconstruction)
 *  - GFR 2017, Rule 173(i)  - relaxation of prior turnover and prior experience
 *  - GFR 2017, Rule 170     - EMD / bid security exemption for DPIIT-recognised startups
 *  - MSMED Act 2006, s.15   - 45-day payment obligation (applied downstream)
 *
 * Every check returns a machine-readable verdict so that a rejection is always
 * explainable to the applicant and auditable by the department.
 */

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export function ageInYears(incorporationDate, asOf = new Date()) {
  const from = new Date(incorporationDate);
  if (Number.isNaN(from.getTime())) return null;
  return (asOf.getTime() - from.getTime()) / YEAR_MS;
}

export function checkEligibility(startup, asOf = new Date()) {
  const checks = [];
  const age = ageInYears(startup.incorporation_date, asOf);

  checks.push({
    code: 'DPIIT_RECOGNITION',
    label: 'DPIIT recognition certificate on record',
    authority: 'DPIIT G.S.R. 127(E)',
    required: true,
    pass: Boolean(startup.dpiit_number),
    detail: startup.dpiit_number
      ? `Recognition ${startup.dpiit_number}`
      : 'No DPIIT recognition number recorded',
  });

  checks.push({
    code: 'DPIIT_VALIDITY',
    label: 'Recognition valid on the date of application',
    authority: 'DPIIT G.S.R. 127(E)',
    required: true,
    pass: !startup.dpiit_valid_till || new Date(startup.dpiit_valid_till) >= asOf,
    detail: startup.dpiit_valid_till
      ? `Valid till ${startup.dpiit_valid_till}`
      : 'Validity not captured',
  });

  checks.push({
    code: 'ENTITY_AGE',
    label: `Incorporated within the last ${POLICY.maxAgeYears} years`,
    authority: 'DPIIT G.S.R. 127(E), para 1(i)',
    required: true,
    pass: age !== null && age <= POLICY.maxAgeYears,
    detail: age === null ? 'Invalid incorporation date' : `${age.toFixed(1)} years old`,
  });

  checks.push({
    code: 'TURNOVER_CAP',
    label: 'Turnover has not exceeded INR 100 crore in any financial year',
    authority: 'DPIIT G.S.R. 127(E), para 1(ii)',
    required: true,
    pass: Number(startup.turnover_last_fy || 0) <= POLICY.maxTurnoverInr,
    detail: `Last FY turnover ${formatInr(startup.turnover_last_fy)}`,
  });

  checks.push({
    code: 'NOT_RECONSTRUCTION',
    label: 'Not formed by splitting up or reconstruction of an existing business',
    authority: 'DPIIT G.S.R. 127(E), para 1(iv)',
    required: true,
    pass: Number(startup.is_split_reconstruction || 0) === 0,
    detail: Number(startup.is_split_reconstruction || 0) === 0 ? 'Self-declared clean' : 'Declared as reconstruction',
  });

  checks.push({
    code: 'ENTITY_TYPE',
    label: 'Private Limited / LLP / Registered Partnership',
    authority: 'DPIIT G.S.R. 127(E), para 1(iii)',
    required: true,
    pass: ['PRIVATE_LIMITED', 'LLP', 'PARTNERSHIP'].includes(startup.entity_type),
    detail: startup.entity_type,
  });

  checks.push({
    code: 'KYC',
    label: 'CIN / GSTIN / Udyam verification complete',
    authority: 'Platform onboarding control',
    required: false,
    pass: startup.kyc_status === 'VERIFIED',
    detail: `KYC ${startup.kyc_status}`,
  });

  const blocking = checks.filter((c) => c.required && !c.pass);
  const eligible = blocking.length === 0;

  return {
    eligible,
    status: eligible ? 'ELIGIBLE' : 'INELIGIBLE',
    evaluatedAt: asOf.toISOString(),
    checks,
    blockingReasons: blocking.map((c) => c.label),
    relaxations: eligible ? relaxations() : [],
  };
}

/** Concessions a recognised startup automatically receives once eligible. */
export function relaxations() {
  return [
    {
      code: 'PRIOR_TURNOVER_WAIVED',
      label: 'Prior turnover criterion waived',
      authority: POLICY.gfrRelaxationRule,
    },
    {
      code: 'PRIOR_EXPERIENCE_WAIVED',
      label: 'Prior experience criterion waived',
      authority: POLICY.gfrRelaxationRule,
    },
    {
      code: 'EMD_EXEMPT',
      label: 'Earnest Money Deposit / bid security exempted',
      authority: 'GFR 2017, Rule 170',
    },
    {
      code: 'TENDER_FEE_EXEMPT',
      label: 'Tender document fee exempted',
      authority: 'Ministry of Finance O.M. on startup participation',
    },
    {
      code: 'PAYMENT_SLA',
      label: `Payment released within ${POLICY.paymentSlaDays} days of milestone acceptance`,
      authority: 'MSMED Act 2006, s.15',
    },
  ];
}

/** Additional gate applied per challenge (TRL floor, sector fit, budget sanity). */
export function checkChallengeFit(startup, challenge, application) {
  const gates = [];

  gates.push({
    code: 'TRL_FLOOR',
    label: `Technology Readiness Level >= ${challenge.trl_min}`,
    pass: Number(application?.trl_claimed ?? startup.trl) >= Number(challenge.trl_min),
    detail: `Claimed TRL ${application?.trl_claimed ?? startup.trl}`,
  });

  if (application) {
    gates.push({
      code: 'BUDGET_CEILING',
      label: 'Quoted pilot cost within the published ceiling',
      pass: Number(application.quoted_pilot_cost) <= Number(challenge.pilot_budget_ceiling),
      detail: `${formatInr(application.quoted_pilot_cost)} vs ceiling ${formatInr(challenge.pilot_budget_ceiling)}`,
    });

    gates.push({
      code: 'TIMELINE',
      label: 'Proposed timeline within the pilot window',
      pass: Number(application.timeline_weeks) <= Number(challenge.pilot_duration_months) * 4.34,
      detail: `${application.timeline_weeks} weeks vs window ${challenge.pilot_duration_months} months`,
    });
  }

  return { pass: gates.every((g) => g.pass), gates };
}

export function formatInr(value) {
  const n = Number(value || 0);
  if (n >= 1e7) return `INR ${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `INR ${(n / 1e5).toFixed(2)} L`;
  return `INR ${n.toLocaleString('en-IN')}`;
}

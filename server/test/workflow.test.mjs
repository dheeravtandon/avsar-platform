/**
 * End-to-end workflow test.
 *
 * Walks one problem statement through all five AVSAR stages against a live API
 * on a throwaway database, asserting the gates that matter along the way:
 *
 *   Assess    a nodal officer drafts, only the head can publish
 *   Validate  the statutory gate runs, a committee scores, a shortlist forms
 *   Sandbox   the pilot refuses to go live without a DPDP agreement,
 *             a milestone acceptance opens a 45-day payment
 *   Adopt     procurement is refused until the pilot has a verdict
 *   Ramp-up   the solution lists and a second department draws it down
 *
 * Run with:  npm test   (from the repo root)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const PORT = 4123;
const BASE = `http://localhost:${PORT}/api`;
const DB = path.join(serverDir, 'data', 'test.db');
const PASSWORD = 'Avsar@2026';

const env = { ...process.env, API_PORT: String(PORT), DB_FILE: DB, NODE_ENV: 'test', JWT_SECRET: 'test-secret' };

let passed = 0;
let failed = 0;
const step = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  [32mPASS[0m  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  [31mFAIL[0m  ${name}\n        ${err.message}`);
  }
};

/* ------------------------------------------------------------- http utils */

const tokens = {};
async function call(method, url, { body, as } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (as && tokens[as]) headers.Authorization = `Bearer ${tokens[as]}`;
  const res = await fetch(`${BASE}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: res.status, body: payload };
}
const GET = (u, as) => call('GET', u, { as });
const POST = (u, body, as) => call('POST', u, { body, as });

async function login(alias, email) {
  const res = await POST('/auth/login', { email, password: PASSWORD });
  assert.equal(res.status, 200, `login ${email} -> ${res.status} ${JSON.stringify(res.body)}`);
  tokens[alias] = res.body.token;
}

async function waitForApi(tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('API did not start in time');
}

const run = (cmd, args) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { cwd: serverDir, env, shell: process.platform === 'win32', stdio: 'ignore' });
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  p.on('error', reject);
});

/* ------------------------------------------------------------------ main */

let server;
try {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = `${DB}${suffix}`;
    if (fs.existsSync(f)) fs.rmSync(f);
  }

  console.log('\nSeeding a throwaway database...');
  await run('node', ['src/db/seed.js']);

  server = spawn('node', ['src/index.js'], { cwd: serverDir, env, shell: process.platform === 'win32', stdio: 'ignore' });
  await waitForApi();
  console.log(`API up on ${PORT}\n`);

  await login('nodal', 'nodal.bwssb@avsar.gov.in');
  await login('head', 'head.bwssb@avsar.gov.in');
  await login('startup', 'founder@jalsarthi.in');
  await login('evaluator', 'eval.nitin@avsar.gov.in');
  await login('monitor', 'monitor.scm@avsar.gov.in');
  await login('proc', 'proc.scm@avsar.gov.in');
  await login('admin', 'admin@avsar.gov.in');

  /* ---------------------------------------------------- stage A: Assess */
  console.log('Stage A - Assess');

  let challengeId;
  await step('nodal officer creates a problem statement', async () => {
    const res = await POST('/challenges', {
      title: 'Reduce sewage pumping station downtime across 40 stations',
      problemStatement: 'Pumping stations fail without warning and the first signal is an overflow complaint from residents, by which point the environmental damage is already done and a tanker has to be dispatched at emergency rates.',
      currentBaseline: 'Unplanned downtime 84 hours per station per year. No condition monitoring.',
      successKpis: [{ key: 'downtime', label: 'Unplanned downtime', target: 20, unit: 'hours/year', direction: 'DOWN' }],
      sector: 'Environment & Water',
      tags: ['iot-sensors', 'data-analytics'],
      trlMin: 6,
      pilotBudgetCeiling: 4000000,
      pilotDurationMonths: 6,
    }, 'nodal');
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.match(res.body.code, /^AVS\/CH\/\d{4}\/\d{4}$/);
    assert.equal(res.body.status, 'DRAFT');
    challengeId = res.body.id;
  });

  await step('a problem statement without a KPI is rejected', async () => {
    const res = await POST('/challenges', {
      title: 'A problem statement with no measurable outcome at all',
      problemStatement: 'This one deliberately omits the success criteria so the validator has something to reject at the edge of the route.',
      successKpis: [],
      sector: 'Environment & Water',
      pilotBudgetCeiling: 100000,
    }, 'nodal');
    assert.equal(res.status, 422);
  });

  await step('nodal officer cannot publish their own problem statement', async () => {
    await POST(`/challenges/${challengeId}/transition`, { to: 'PENDING_APPROVAL' }, 'nodal');
    const res = await POST(`/challenges/${challengeId}/transition`, { to: 'PUBLISHED' }, 'nodal');
    assert.equal(res.status, 403);
  });

  await step('department head approves and publishes', async () => {
    const res = await POST(`/challenges/${challengeId}/transition`, { to: 'PUBLISHED', note: 'Approved.' }, 'head');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'PUBLISHED');
    assert.ok(res.body.published_at);
  });

  await step('an illegal transition is refused', async () => {
    const res = await POST(`/challenges/${challengeId}/transition`, { to: 'DRAFT' }, 'head');
    assert.equal(res.status, 409);
  });

  /* -------------------------------------------------- stage V: Validate */
  console.log('\nStage V - Validate');

  let applicationId;
  await step('startup applies and clears the statutory eligibility gate', async () => {
    const created = await POST('/applications', {
      challengeId,
      solutionTitle: 'PumpWatch condition monitoring',
      solutionSummary: 'Vibration and current-signature monitoring on existing pump sets, with a failure-mode classifier that raises a work order before the bearing goes.',
      trlClaimed: 7,
      teamSize: 6,
      quotedPilotCost: 3600000,
      timelineWeeks: 20,
    }, 'startup');
    assert.equal(created.status, 201, JSON.stringify(created.body));
    applicationId = created.body.id;

    const submitted = await POST(`/applications/${applicationId}/submit`, {}, 'startup');
    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.status, 'SUBMITTED', JSON.stringify(submitted.body.gate?.eligibility?.blockingReasons));
    assert.equal(submitted.body.gate.eligibility.eligible, true);
  });

  await step('the gate records relaxations with their statutory authority', async () => {
    const res = await GET(`/applications/${applicationId}`, 'startup');
    const relaxations = res.body.eligibility_snapshot.eligibility.relaxations;
    assert.ok(relaxations.some((r) => r.code === 'PRIOR_EXPERIENCE_WAIVED'));
    assert.ok(relaxations.some((r) => r.authority.includes('173')));
  });

  await step('a quote above the published ceiling fails the fit gate', async () => {
    await login('other', 'founder@anantara.in');
    const created = await POST('/applications', {
      challengeId,
      solutionTitle: 'Over-ceiling proposal',
      solutionSummary: 'Deliberately quotes above the published pilot budget ceiling so the challenge fit gate has something to stop at submission.',
      trlClaimed: 6,
      teamSize: 4,
      quotedPilotCost: 9000000,
      timelineWeeks: 20,
    }, 'other');
    assert.equal(created.status, 201);
    const submitted = await POST(`/applications/${created.body.id}/submit`, {}, 'other');
    assert.equal(submitted.body.status, 'ELIGIBILITY_FAIL');
  });

  let evaluationId;
  await step('nodal officer assigns an evaluation committee', async () => {
    const evaluators = await GET('/registry/evaluators', 'nodal');
    assert.equal(evaluators.status, 200);
    const pick = evaluators.body.slice(0, 2).map((e) => e.id);
    const res = await POST(`/applications/${applicationId}/committee`, { evaluatorIds: pick }, 'nodal');
    assert.equal(res.status, 200);
    assert.equal(res.body.assigned, 2);
  });

  await step('an evaluator sees the application blinded until they score', async () => {
    const res = await GET('/evaluations/mine', 'evaluator');
    assert.equal(res.status, 200);
    const item = res.body.find((e) => e.application_id === applicationId);
    assert.ok(item, 'evaluation not assigned to this evaluator');
    assert.equal(item.blinded, true);
    evaluationId = item.id;
  });

  await step('scoring without a conflict-of-interest declaration is refused', async () => {
    const res = await POST(`/evaluations/${evaluationId}/score`, {
      scores: { INNOV: 8, FEAS: 8, KPIFIT: 8, TEAM: 7, SCALE: 8, SEC: 7, COST: 8, TCO: 7, TIME: 8 },
      remarks: 'Sound approach with a clear line to the declared KPI.',
      recommendation: 'RECOMMEND',
      coiDeclared: false,
    }, 'evaluator');
    assert.equal(res.status, 400);
  });

  await step('evaluator submits a score and it is locked', async () => {
    const body = {
      scores: { INNOV: 8, FEAS: 8, KPIFIT: 9, TEAM: 7, SCALE: 8, SEC: 7, COST: 8, TCO: 7, TIME: 8 },
      remarks: 'Sound approach with a clear line to the declared downtime KPI. Cost is defensible against the outcome.',
      recommendation: 'RECOMMEND',
      coiDeclared: true,
    };
    const res = await POST(`/evaluations/${evaluationId}/score`, body, 'evaluator');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.total > 0 && res.body.total <= 100);
    assert.equal(res.body.qualifiesTechnically, true);

    const again = await POST(`/evaluations/${evaluationId}/score`, body, 'evaluator');
    assert.equal(again.status, 409, 'a submitted score must not be editable');
  });

  await step('nodal officer shortlists the application', async () => {
    const res = await POST(`/applications/${applicationId}/transition`, { to: 'SHORTLISTED' }, 'nodal');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'SHORTLISTED');
  });

  /* --------------------------------------------------- stage S: Sandbox */
  console.log('\nStage S - Sandbox');

  let pilotId;
  let milestoneId;
  await step('milestone payouts must total exactly 100 per cent', async () => {
    const res = await POST('/pilots', {
      applicationId,
      title: 'PumpWatch pilot',
      startDate: '2026-09-01',
      endDate: '2027-02-28',
      budgetSanctioned: 3600000,
      milestones: [{ title: 'Deploy', dueDate: '2026-10-01', payoutPercent: 60 }],
    }, 'nodal');
    assert.equal(res.status, 422);
  });

  await step('a sanction above the published ceiling is refused', async () => {
    const res = await POST('/pilots', {
      applicationId,
      title: 'PumpWatch pilot',
      startDate: '2026-09-01',
      endDate: '2027-02-28',
      budgetSanctioned: 9000000,
      milestones: [
        { title: 'Deploy', dueDate: '2026-10-01', payoutPercent: 50 },
        { title: 'Close', dueDate: '2027-02-01', payoutPercent: 50 },
      ],
    }, 'nodal');
    assert.equal(res.status, 422);
  });

  await step('nodal officer creates the pilot with milestones', async () => {
    const res = await POST('/pilots', {
      applicationId,
      title: 'PumpWatch condition monitoring pilot',
      scope: 'Twelve pump sets across four stations.',
      startDate: '2026-09-01',
      endDate: '2027-02-28',
      budgetSanctioned: 3600000,
      sanctionOrderNo: 'BWSSB/INNOV/2026/220',
      milestones: [
        { title: 'Instrumentation deployed on four stations', dueDate: '2026-10-01', payoutPercent: 40 },
        { title: 'Classifier tuned and first pre-failure alert verified', dueDate: '2026-12-01', payoutPercent: 35 },
        { title: 'Closure report and handover', dueDate: '2027-02-20', payoutPercent: 25 },
      ],
    }, 'nodal');
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.status, 'AGREEMENT_PENDING');
    pilotId = res.body.id;
  });

  await step('a pilot cannot go live without the DPDP data processing agreement', async () => {
    const res = await POST(`/pilots/${pilotId}/transition`, { to: 'ACTIVE' }, 'startup');
    assert.equal(res.status, 412);
  });

  await step('startup accepts the agreement and the pilot goes live', async () => {
    const res = await POST(`/pilots/${pilotId}/transition`, { to: 'ACTIVE', dpaSigned: true }, 'startup');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ACTIVE');
    assert.equal(res.body.dpa_signed, true);
  });

  await step('startup submits milestone evidence', async () => {
    const pilot = await GET(`/pilots/${pilotId}`, 'startup');
    milestoneId = pilot.body.milestones[0].id;
    const res = await POST(`/pilots/${pilotId}/milestones/${milestoneId}/submit`, {
      evidenceNote: 'Deployment photographs, calibration log and signed field acceptance note for four stations.',
    }, 'startup');
    assert.equal(res.status, 200);
  });

  await step('acceptance opens a payment due inside the 45-day statutory window', async () => {
    const res = await POST(`/pilots/${pilotId}/milestones/${milestoneId}/review`, {
      decision: 'APPROVED', remarks: 'Evidence accepted.',
    }, 'nodal');
    assert.equal(res.status, 200);

    const pilot = await GET(`/pilots/${pilotId}`, 'nodal');
    const payment = pilot.body.payments.find((p) => p.milestone_id === milestoneId);
    assert.ok(payment, 'no payment raised on acceptance');
    assert.equal(payment.amount, Math.round(3600000 * 0.4));
    const days = Math.round((new Date(payment.due_date) - new Date(payment.raised_on)) / 86400000);
    assert.ok(days >= 44 && days <= 46, `payment window was ${days} days, expected 45`);
  });

  await step('KPI readings drive the scorecard attainment', async () => {
    await POST(`/pilots/${pilotId}/kpi`, {
      kpiKey: 'downtime', kpiLabel: 'Unplanned downtime', targetValue: 20,
      actualValue: 18, unit: 'hours/year', period: '2026-12',
    }, 'startup');
    const res = await GET(`/pilots/${pilotId}`, 'nodal');
    const card = res.body.scorecard.find((k) => k.key === 'downtime');
    assert.ok(card, 'scorecard did not include the declared KPI');
    assert.equal(card.met, true, `attainment was ${card.attainment}%`);
  });

  /* ----------------------------------------------------- stage A: Adopt */
  console.log('\nStage A - Adopt');

  await step('procurement is refused while the pilot has no verdict', async () => {
    const res = await POST('/procurement', {
      pilotId, mode: 'SINGLE_SOURCE',
      justification: 'Attempting to procure before the pilot has been evaluated, which the platform must refuse outright.',
      contractValue: 20000000, contractStart: '2027-03-01', contractEnd: '2029-02-28',
    }, 'head');
    assert.equal(res.status, 412);
  });

  await step('department head records the closure verdict', async () => {
    await POST(`/pilots/${pilotId}/transition`, { to: 'UNDER_REVIEW' }, 'nodal');
    const res = await POST(`/pilots/${pilotId}/transition`, {
      to: 'SUCCESS', note: 'Unplanned downtime fell from 84 to 18 hours per station per year against a target of 20.',
    }, 'head');
    assert.equal(res.status, 200);
    assert.equal(res.body.verdict, 'SUCCESS');
  });

  let procurementId;
  await step('procurement carries the GFR rule it rests on', async () => {
    const res = await POST('/procurement', {
      pilotId, mode: 'RATE_CONTRACT',
      justification: 'The pilot established that unplanned downtime falls from 84 to 18 hours per station per year. A two-year rate contract lets the remaining stations, and other utilities on the platform, draw down at a discovered price.',
      contractValue: 20000000, contractStart: '2027-03-01', contractEnd: '2029-02-28',
    }, 'head');
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.match(res.body.gfr_rule, /GFR 2017/);
    procurementId = res.body.id;
  });

  await step('only the department head can sanction a procurement', async () => {
    await POST(`/procurement/${procurementId}/transition`, { to: 'PENDING_APPROVAL' }, 'head');
    const asOfficer = await POST(`/procurement/${procurementId}/transition`, { to: 'APPROVED' }, 'proc');
    assert.equal(asOfficer.status, 403);
    const asHead = await POST(`/procurement/${procurementId}/transition`, { to: 'APPROVED' }, 'head');
    assert.equal(asHead.status, 200);
  });

  await step('a purchase order is issued with an advance payment', async () => {
    const res = await POST(`/procurement/${procurementId}/transition`, { to: 'PO_ISSUED' }, 'head');
    assert.equal(res.status, 200);
    assert.ok(res.body.po_number, 'no purchase order number generated');
    const detail = await GET(`/procurement/${procurementId}`, 'head');
    assert.equal(detail.body.payments.length, 1);
  });

  /* --------------------------------------------------- stage R: Ramp-up */
  console.log('\nStage R - Ramp-up');

  let catalogueId;
  await step('the proven solution is listed with its measured KPIs', async () => {
    const res = await POST('/catalogue', {
      procurementId,
      solutionName: 'PumpWatch - sewage pump condition monitoring',
      category: 'Environment & Water',
      description: 'Vibration and current-signature monitoring for sewage pumping stations. Proven across four stations: unplanned downtime reduced from 84 to 18 hours per station per year.',
      unitPrice: 300000,
      uom: 'per station per year',
      rateContractValidTill: '2029-02-28',
    }, 'head');
    assert.equal(res.status, 201, JSON.stringify(res.body));
    catalogueId = res.body.id;
  });

  await step('another department draws it down without repeating discovery', async () => {
    const res = await POST(`/catalogue/${catalogueId}/adopt`, { quantity: 6 }, 'proc');
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.value, 1800000);
    assert.deepEqual(res.body.savedSteps, ['Discovery', 'Evaluation', 'Pilot']);
  });

  /* ------------------------------------------------------ cross-cutting */
  console.log('\nCross-cutting controls');

  await step('a startup cannot read another department pipeline', async () => {
    const res = await GET('/registry/evaluators', 'startup');
    assert.equal(res.status, 403);
  });

  await step('an unauthenticated caller cannot see a draft problem statement', async () => {
    const draft = await POST('/challenges', {
      title: 'A draft that must never appear on the public site',
      problemStatement: 'This problem statement stays in draft for the duration of the test, and the public list must not disclose it to an anonymous caller.',
      successKpis: [{ key: 'x', label: 'Something', target: 1, unit: '', direction: 'UP' }],
      sector: 'Environment & Water',
      pilotBudgetCeiling: 100000,
    }, 'nodal');
    const anon = await GET(`/challenges/${draft.body.id}`);
    assert.equal(anon.status, 404);
  });

  await step('the audit chain verifies end to end', async () => {
    const res = await GET('/audit/verify', 'admin');
    assert.equal(res.status, 200);
    assert.equal(res.body.intact, true, `chain broken at entry ${res.body.brokenAt}`);
    assert.ok(res.body.total > 40, `only ${res.body.total} audit entries`);
  });

  await step('the public transparency board reflects the new contract', async () => {
    const res = await GET('/dashboard/public');
    assert.equal(res.status, 200);
    assert.ok(res.body.headline.contractValue >= 20000000);
    assert.ok(res.body.funnel.some((f) => f.stage === 'Cross-department adoptions' && f.count >= 1));
  });
} catch (err) {
  failed += 1;
  console.error('\nHarness error:', err);
} finally {
  if (server) server.kill();
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

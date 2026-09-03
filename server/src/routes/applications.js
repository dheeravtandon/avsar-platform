import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, run, tx } from '../db/index.js';
import { authenticate, authorize, currentStartup, ROLES } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { nextCode } from '../services/ids.js';
import { record } from '../services/audit.js';
import { notify, notifyMany } from '../services/notify.js';
import { checkEligibility, checkChallengeFit } from '../services/eligibility.js';
import { scoreMatch } from '../services/matching.js';
import { APPLICATION_FLOW, assertTransition } from '../services/workflow.js';
import { consensus } from '../services/scoring.js';

const router = Router();

const applicationSchema = z.object({
  challengeId: z.coerce.number().int().positive(),
  solutionTitle: z.string().min(5),
  solutionSummary: z.string().min(50, 'Summarise the solution in at least 50 characters'),
  approach: z.string().optional(),
  trlClaimed: z.coerce.number().int().min(1).max(9),
  priorDeployments: z.string().optional(),
  teamSize: z.coerce.number().int().min(1),
  quotedPilotCost: z.coerce.number().positive(),
  timelineWeeks: z.coerce.number().int().min(1).max(104),
  differentiators: z.string().optional(),
  risks: z.string().optional(),
  attachments: z.array(z.object({ name: z.string(), type: z.string().optional() })).default([]),
});

const SELECT = `
  SELECT a.*, c.code AS challenge_code, c.title AS challenge_title, c.sector, c.pilot_budget_ceiling,
         c.trl_min, c.dept_id, d.name AS dept_name, d.ministry,
         s.legal_name, s.brand_name, s.dpiit_number, s.state AS startup_state, s.city AS startup_city,
         s.women_led, s.eligibility_status
  FROM applications a
  JOIN challenges c ON c.id = a.challenge_id
  JOIN departments d ON d.id = c.dept_id
  JOIN startups s ON s.id = a.startup_id`;

/* ------------------------------------------------------------------ list */

router.get('/', authenticate, wrap(async (req, res) => {
  const { status, challenge } = req.query;
  const where = [];
  const params = [];

  if (req.user.role === ROLES.STARTUP) {
    const startup = currentStartup(req);
    if (!startup) throw httpError(400, 'Startup profile not found');
    where.push('a.startup_id = ?');
    params.push(startup.id);
  } else if (req.user.role === ROLES.EVALUATOR) {
    where.push('a.id IN (SELECT application_id FROM evaluations WHERE evaluator_id = ?)');
    params.push(req.user.id);
  } else if (req.user.role !== ROLES.ADMIN) {
    where.push('c.dept_id = ?');
    params.push(req.user.dept_id);
    where.push("a.status <> 'DRAFT'");
  }

  if (status) { where.push('a.status = ?'); params.push(status); }
  if (challenge) { where.push('a.challenge_id = ?'); params.push(Number(challenge)); }

  const rows = all(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY a.id DESC`, params);
  res.json(rows.map(hydrate));
}));

/* ------------------------------------------------------------------ read */

router.get('/:id', authenticate, wrap(async (req, res) => {
  const row = get(`${SELECT} WHERE a.id = ? OR a.code = ?`, [Number(req.params.id) || 0, req.params.id]);
  if (!row) throw httpError(404, 'Application not found');
  guardRead(req, row);

  const app = hydrate(row);
  app.evaluations = all(
    `SELECT e.*, u.name AS evaluator_name, u.designation
     FROM evaluations e JOIN users u ON u.id = e.evaluator_id WHERE e.application_id = ?`,
    [row.id],
  ).map((e) => ({
    ...e,
    scores: safeJson(e.scores, {}),
    // A startup never sees who scored what, only the aggregate once published.
    evaluator_name: req.user.role === ROLES.STARTUP ? 'Committee member' : e.evaluator_name,
  }));
  app.consensus = consensus(app.evaluations);
  app.pilot = get('SELECT * FROM pilots WHERE application_id = ?', [row.id]);
  res.json(app);
}));

/* ---------------------------------------------------- create / save draft */

router.post('/', authenticate, authorize(ROLES.STARTUP), wrap(async (req, res) => {
  const d = applicationSchema.parse(req.body);
  const startup = currentStartup(req);
  if (!startup) throw httpError(400, 'Complete your startup profile first');

  const challenge = get('SELECT * FROM challenges WHERE id = ?', [d.challengeId]);
  if (!challenge) throw httpError(404, 'Problem statement not found');
  if (challenge.status !== 'PUBLISHED') throw httpError(409, 'This problem statement is not accepting applications');
  if (get('SELECT id FROM applications WHERE challenge_id = ? AND startup_id = ?', [d.challengeId, startup.id])) {
    throw httpError(409, 'You have already applied to this problem statement');
  }

  const eligibility = checkEligibility(startup);
  const fit = checkChallengeFit(startup, challenge, d);
  const match = scoreMatch(startup, challenge);

  const id = insert('applications', {
    code: nextCode('applications'),
    challenge_id: d.challengeId,
    startup_id: startup.id,
    solution_title: d.solutionTitle,
    solution_summary: d.solutionSummary,
    approach: d.approach,
    trl_claimed: d.trlClaimed,
    prior_deployments: d.priorDeployments,
    team_size: d.teamSize,
    quoted_pilot_cost: d.quotedPilotCost,
    timeline_weeks: d.timelineWeeks,
    differentiators: d.differentiators,
    risks: d.risks,
    attachments: JSON.stringify(d.attachments),
    eligibility_snapshot: JSON.stringify({ eligibility, fit, match }),
    match_score: match.score,
    status: 'DRAFT',
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'APPLICATION_DRAFTED', entityType: 'applications', entityId: id, meta: { challenge: challenge.code }, ip: req.ip });
  res.status(201).json(hydrate(get(`${SELECT} WHERE a.id = ?`, [id])));
}));

/* ---------------------------------------------------------------- submit */

router.post('/:id/submit', authenticate, authorize(ROLES.STARTUP), wrap(async (req, res) => {
  const startup = currentStartup(req);
  const row = get('SELECT * FROM applications WHERE id = ? AND startup_id = ?', [Number(req.params.id), startup?.id]);
  if (!row) throw httpError(404, 'Application not found');
  assertTransition(APPLICATION_FLOW, row.status, 'SUBMITTED', 'application');

  const challenge = get('SELECT * FROM challenges WHERE id = ?', [row.challenge_id]);
  const eligibility = checkEligibility(startup);
  const fit = checkChallengeFit(startup, challenge, row);
  const snapshot = { eligibility, fit, evaluatedAt: new Date().toISOString() };

  // The gate is automatic and its verdict is stored verbatim on the application.
  const passed = eligibility.eligible && fit.pass;
  update('applications', row.id, {
    status: passed ? 'SUBMITTED' : 'ELIGIBILITY_FAIL',
    submitted_at: new Date().toISOString(),
    eligibility_snapshot: JSON.stringify(snapshot),
  });

  record({
    actorId: req.user.id, actorRole: req.user.role,
    action: passed ? 'APPLICATION_SUBMITTED' : 'APPLICATION_ELIGIBILITY_FAIL',
    entityType: 'applications', entityId: row.id,
    meta: { challenge: challenge.code, blocking: eligibility.blockingReasons, fitGates: fit.gates.filter((g) => !g.pass).map((g) => g.label) },
    ip: req.ip,
  });

  if (passed) {
    const officers = all("SELECT id FROM users WHERE dept_id = ? AND role IN ('NODAL_OFFICER','DEPT_HEAD')", [challenge.dept_id]).map((r) => r.id);
    notifyMany(officers, 'New application received', `${startup.brand_name || startup.legal_name} applied to ${challenge.code}`, `/app/challenges/${challenge.id}`, 'INFO');
    notify(req.user.id, 'Application submitted', `${row.code} cleared the statutory eligibility gate and is queued for evaluation.`, `/app/applications/${row.id}`, 'SUCCESS');
  } else {
    notify(req.user.id, 'Application blocked at eligibility gate', eligibility.blockingReasons.concat(fit.gates.filter((g) => !g.pass).map((g) => g.label)).join('; '), `/app/applications/${row.id}`, 'WARNING');
  }

  res.json({ ...hydrate(get(`${SELECT} WHERE a.id = ?`, [row.id])), gate: snapshot });
}));

router.post('/:id/withdraw', authenticate, authorize(ROLES.STARTUP), wrap(async (req, res) => {
  const startup = currentStartup(req);
  const row = get('SELECT * FROM applications WHERE id = ? AND startup_id = ?', [Number(req.params.id), startup?.id]);
  if (!row) throw httpError(404, 'Application not found');
  assertTransition(APPLICATION_FLOW, row.status, 'WITHDRAWN', 'application');
  update('applications', row.id, { status: 'WITHDRAWN' });
  record({ actorId: req.user.id, actorRole: req.user.role, action: 'APPLICATION_WITHDRAWN', entityType: 'applications', entityId: row.id, ip: req.ip });
  res.json({ ok: true });
}));

/* ------------------------------------------------- department transitions */

router.post('/:id/transition', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ to: z.string(), note: z.string().optional() });
  const { to, note } = schema.parse(req.body);

  const row = get(`${SELECT} WHERE a.id = ?`, [Number(req.params.id)]);
  if (!row) throw httpError(404, 'Application not found');
  if (req.user.role !== ROLES.ADMIN && row.dept_id !== req.user.dept_id) throw httpError(403, 'Application belongs to another department');
  assertTransition(APPLICATION_FLOW, row.status, to, 'application');

  update('applications', row.id, { status: to });
  record({ actorId: req.user.id, actorRole: req.user.role, action: `APPLICATION_${to}`, entityType: 'applications', entityId: row.id, meta: { from: row.status, to, note }, ip: req.ip });

  const founder = get('SELECT user_id FROM startups WHERE id = ?', [row.startup_id]);
  const messages = {
    SHORTLISTED: ['Shortlisted for pitch', `${row.code} has been shortlisted by ${row.dept_name}.`, 'SUCCESS'],
    SELECTED_FOR_PILOT: ['Selected for pilot', `${row.code} has been selected. A pilot record will be created shortly.`, 'SUCCESS'],
    REJECTED: ['Application not taken forward', note || 'The evaluation committee has not shortlisted this application. Structured feedback is available on the application page.', 'WARNING'],
    UNDER_EVALUATION: ['Evaluation started', `${row.code} is now with the evaluation committee.`, 'INFO'],
  };
  if (messages[to]) notify(founder?.user_id, messages[to][0], messages[to][1], `/app/applications/${row.id}`, messages[to][2]);

  res.json(hydrate(get(`${SELECT} WHERE a.id = ?`, [row.id])));
}));

/* ---------------------------------------- assign the evaluation committee */

router.post('/:id/committee', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ evaluatorIds: z.array(z.coerce.number().int().positive()).min(1) });
  const { evaluatorIds } = schema.parse(req.body);

  const row = get(`${SELECT} WHERE a.id = ?`, [Number(req.params.id)]);
  if (!row) throw httpError(404, 'Application not found');
  if (req.user.role !== ROLES.ADMIN && row.dept_id !== req.user.dept_id) throw httpError(403, 'Application belongs to another department');

  tx(() => {
    for (const evaluatorId of evaluatorIds) {
      const exists = get('SELECT id FROM evaluations WHERE application_id = ? AND evaluator_id = ?', [row.id, evaluatorId]);
      if (!exists) insert('evaluations', { application_id: row.id, evaluator_id: evaluatorId, status: 'ASSIGNED' });
    }
    if (row.status === 'SUBMITTED') update('applications', row.id, { status: 'UNDER_EVALUATION' });
  });

  notifyMany(evaluatorIds, 'Evaluation assigned', `${row.code} - ${row.solution_title}`, `/app/evaluations`, 'INFO');
  record({ actorId: req.user.id, actorRole: req.user.role, action: 'COMMITTEE_ASSIGNED', entityType: 'applications', entityId: row.id, meta: { evaluatorIds }, ip: req.ip });
  res.json({ ok: true, assigned: evaluatorIds.length });
}));

/* ----------------------------------------------------------------- utils */

function guardRead(req, row) {
  if (req.user.role === ROLES.ADMIN) return;
  if (req.user.role === ROLES.STARTUP) {
    const startup = currentStartup(req);
    if (!startup || row.startup_id !== startup.id) throw httpError(403, 'Not your application');
    return;
  }
  if (req.user.role === ROLES.EVALUATOR) {
    if (!get('SELECT id FROM evaluations WHERE application_id = ? AND evaluator_id = ?', [row.id, req.user.id])) {
      throw httpError(403, 'You are not on the committee for this application');
    }
    return;
  }
  if (row.dept_id !== req.user.dept_id) throw httpError(403, 'Application belongs to another department');
}

export function hydrate(row) {
  if (!row) return row;
  return {
    ...row,
    attachments: safeJson(row.attachments, []),
    eligibility_snapshot: safeJson(row.eligibility_snapshot, {}),
  };
}

function safeJson(v, fallback) {
  try { return JSON.parse(v ?? 'null') ?? fallback; } catch { return fallback; }
}

export default router;

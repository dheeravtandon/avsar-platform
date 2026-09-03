import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, run } from '../db/index.js';
import { authenticate, authorize, softAuthenticate, currentStartup, ROLES } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { nextCode } from '../services/ids.js';
import { record } from '../services/audit.js';
import { notifyMany } from '../services/notify.js';
import { CHALLENGE_FLOW, assertTransition, stageOf } from '../services/workflow.js';
import { rankStartups } from '../services/matching.js';
import { checkChallengeFit } from '../services/eligibility.js';

const router = Router();

const kpiSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  target: z.coerce.number(),
  unit: z.string().default(''),
  direction: z.enum(['UP', 'DOWN']).default('UP'),
});

const challengeSchema = z.object({
  title: z.string().min(10, 'Give the problem statement a descriptive title'),
  problemStatement: z.string().min(50, 'Describe the problem in at least 50 characters'),
  background: z.string().optional(),
  currentBaseline: z.string().optional(),
  desiredOutcome: z.string().optional(),
  successKpis: z.array(kpiSchema).min(1, 'At least one measurable KPI is mandatory'),
  sector: z.string().min(2),
  tags: z.array(z.string()).default([]),
  trlMin: z.coerce.number().int().min(1).max(9).default(5),
  pilotBudgetCeiling: z.coerce.number().positive('Pilot budget ceiling must be greater than zero'),
  pilotDurationMonths: z.coerce.number().int().min(1).max(24).default(6),
  scaleValue: z.coerce.number().min(0).default(0),
  scaleUnits: z.string().optional(),
  deploymentEnv: z.string().optional(),
  dataAvailability: z.string().optional(),
  ipTerms: z.enum(['STARTUP_RETAINS', 'JOINT', 'GOVT_OWNS']).default('STARTUP_RETAINS'),
  securityClearance: z.boolean().default(false),
  closesAt: z.string().optional(),
});

const SELECT = `
  SELECT c.*, d.name AS dept_name, d.ministry, d.code AS dept_code, d.level, d.state AS dept_state,
         u.name AS owner_name,
         (SELECT COUNT(*) FROM applications a WHERE a.challenge_id = c.id AND a.status <> 'DRAFT') AS application_count
  FROM challenges c
  JOIN departments d ON d.id = c.dept_id
  JOIN users u ON u.id = c.created_by`;

/* ------------------------------------------------------------------ list */

router.get('/', softAuthenticate, wrap(async (req, res) => {
  const { status, sector, dept, q, mine } = req.query;
  const where = [];
  const params = [];

  // Anonymous and startup users only ever see published or downstream stages.
  const isOfficial = req.user && req.user.role !== ROLES.STARTUP;
  if (!isOfficial) {
    where.push("c.status IN ('PUBLISHED','CLOSED','EVALUATION','PILOT','PROCURED')");
  }
  if (mine === '1' && req.user?.dept_id) {
    where.push('c.dept_id = ?');
    params.push(req.user.dept_id);
  }
  if (status) { where.push('c.status = ?'); params.push(status); }
  if (sector) { where.push('c.sector = ?'); params.push(sector); }
  if (dept) { where.push('c.dept_id = ?'); params.push(Number(dept)); }
  if (q) {
    where.push('(c.title LIKE ? OR c.problem_statement LIKE ? OR c.code LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const sql = `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY c.id DESC`;
  const rows = all(sql, params).map(hydrate);

  // For a signed-in startup, attach the personalised match score.
  const startup = currentStartup(req);
  if (startup) {
    const applied = new Set(all('SELECT challenge_id FROM applications WHERE startup_id = ?', [startup.id]).map((r) => r.challenge_id));
    for (const row of rows) {
      row.hasApplied = applied.has(row.id);
      row.match = rankStartups([startup], row, 1)[0] ?? null;
    }
  }

  res.json(rows);
}));

/* ------------------------------------------------------------------ read */

router.get('/:id', softAuthenticate, wrap(async (req, res) => {
  const row = get(`${SELECT} WHERE c.id = ? OR c.code = ?`, [Number(req.params.id) || 0, req.params.id]);
  if (!row) throw httpError(404, 'Problem statement not found');

  const isOfficial = req.user && req.user.role !== ROLES.STARTUP;
  if (!isOfficial && ['DRAFT', 'PENDING_APPROVAL', 'REJECTED'].includes(row.status)) {
    throw httpError(404, 'Problem statement not found');
  }

  const challenge = hydrate(row);
  challenge.stage = stageOf(row.status);
  challenge.timeline = timelineFor(row.id);

  if (isOfficial) {
    challenge.applications = all(
      `SELECT a.*, s.legal_name, s.brand_name, s.trl, s.state, s.dpiit_number, s.eligibility_status
       FROM applications a JOIN startups s ON s.id = a.startup_id
       WHERE a.challenge_id = ? AND a.status <> 'DRAFT' ORDER BY a.match_score DESC, a.id ASC`,
      [row.id],
    );
  }

  const startup = currentStartup(req);
  if (startup) {
    challenge.myApplication = get('SELECT * FROM applications WHERE challenge_id = ? AND startup_id = ?', [row.id, startup.id]);
    challenge.match = rankStartups([startup], row, 1)[0] ?? null;
    challenge.fit = checkChallengeFit(startup, row, null);
  }

  res.json(challenge);
}));

/* ---------------------------------------------------------------- create */

router.post('/', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const d = challengeSchema.parse(req.body);
  if (!req.user.dept_id) throw httpError(400, 'Your account is not mapped to a department');

  const id = insert('challenges', {
    code: nextCode('challenges'),
    dept_id: req.user.dept_id,
    created_by: req.user.id,
    title: d.title,
    problem_statement: d.problemStatement,
    background: d.background,
    current_baseline: d.currentBaseline,
    desired_outcome: d.desiredOutcome,
    success_kpis: JSON.stringify(d.successKpis),
    sector: d.sector,
    tags: JSON.stringify(d.tags),
    trl_min: d.trlMin,
    pilot_budget_ceiling: d.pilotBudgetCeiling,
    pilot_duration_months: d.pilotDurationMonths,
    scale_value: d.scaleValue,
    scale_units: d.scaleUnits,
    deployment_env: d.deploymentEnv,
    data_availability: d.dataAvailability,
    ip_terms: d.ipTerms,
    security_clearance: d.securityClearance ? 1 : 0,
    closes_at: d.closesAt,
    status: 'DRAFT',
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'CHALLENGE_CREATED', entityType: 'challenges', entityId: id, meta: { title: d.title }, ip: req.ip });
  res.status(201).json(hydrate(get(`${SELECT} WHERE c.id = ?`, [id])));
}));

/* ---------------------------------------------------------------- update */

router.put('/:id', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const row = mustOwn(req, req.params.id);
  if (!['DRAFT', 'REJECTED'].includes(row.status)) throw httpError(409, 'Only a draft or returned problem statement can be edited');
  const d = challengeSchema.parse(req.body);

  update('challenges', row.id, {
    title: d.title,
    problem_statement: d.problemStatement,
    background: d.background,
    current_baseline: d.currentBaseline,
    desired_outcome: d.desiredOutcome,
    success_kpis: JSON.stringify(d.successKpis),
    sector: d.sector,
    tags: JSON.stringify(d.tags),
    trl_min: d.trlMin,
    pilot_budget_ceiling: d.pilotBudgetCeiling,
    pilot_duration_months: d.pilotDurationMonths,
    scale_value: d.scaleValue,
    scale_units: d.scaleUnits,
    deployment_env: d.deploymentEnv,
    data_availability: d.dataAvailability,
    ip_terms: d.ipTerms,
    security_clearance: d.securityClearance ? 1 : 0,
    closes_at: d.closesAt,
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'CHALLENGE_UPDATED', entityType: 'challenges', entityId: row.id, ip: req.ip });
  res.json(hydrate(get(`${SELECT} WHERE c.id = ?`, [row.id])));
}));

/* ------------------------------------------------------------ transition */

router.post('/:id/transition', authenticate, wrap(async (req, res) => {
  const schema = z.object({ to: z.string(), note: z.string().optional() });
  const { to, note } = schema.parse(req.body);
  const row = mustOwn(req, req.params.id, true);

  assertTransition(CHALLENGE_FLOW, row.status, to, 'problem statement');

  // Approval to publish is reserved for the department head.
  if (to === 'PUBLISHED' && ![ROLES.DEPT_HEAD, ROLES.ADMIN].includes(req.user.role)) {
    throw httpError(403, 'Only the Department Head can approve and publish a problem statement');
  }
  if (to === 'REJECTED' && ![ROLES.DEPT_HEAD, ROLES.ADMIN].includes(req.user.role)) {
    throw httpError(403, 'Only the Department Head can return a problem statement');
  }

  const patch = { status: to, approval_note: note ?? row.approval_note };
  if (to === 'PUBLISHED') {
    patch.published_at = new Date().toISOString();
    patch.approved_by = req.user.id;
  }
  update('challenges', row.id, patch);

  record({
    actorId: req.user.id, actorRole: req.user.role, action: `CHALLENGE_${to}`,
    entityType: 'challenges', entityId: row.id, meta: { from: row.status, to, note }, ip: req.ip,
  });

  if (to === 'PUBLISHED') {
    // Alert startups whose declared sector matches the published problem.
    const audience = all(
      "SELECT u.id FROM users u JOIN startups s ON s.user_id = u.id WHERE u.role = 'STARTUP' AND s.eligibility_status = 'ELIGIBLE' AND s.sector = ?",
      [row.sector],
    ).map((r) => r.id);
    notifyMany(audience, 'New problem statement in your sector', `${row.code} - ${row.title}`, `/app/challenges/${row.id}`, 'INFO');
  }
  if (to === 'CLOSED') {
    run("UPDATE applications SET status = 'UNDER_EVALUATION' WHERE challenge_id = ? AND status = 'SUBMITTED'", [row.id]);
  }

  res.json(hydrate(get(`${SELECT} WHERE c.id = ?`, [row.id])));
}));

/* ------------------------------------------------ reverse discovery scan */

router.get('/:id/discover', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.EVALUATOR, ROLES.ADMIN), wrap(async (req, res) => {
  const challenge = get('SELECT c.*, d.level, d.state FROM challenges c JOIN departments d ON d.id = c.dept_id WHERE c.id = ?', [Number(req.params.id)]);
  if (!challenge) throw httpError(404, 'Problem statement not found');

  const applied = new Set(all('SELECT startup_id FROM applications WHERE challenge_id = ?', [challenge.id]).map((r) => r.startup_id));
  const pool = all("SELECT * FROM startups WHERE eligibility_status = 'ELIGIBLE'");
  const ranked = rankStartups(pool, challenge, 25).map((r) => ({
    startupId: r.startup.id,
    legalName: r.startup.legal_name,
    brandName: r.startup.brand_name,
    sector: r.startup.sector,
    trl: r.startup.trl,
    city: r.startup.city,
    state: r.startup.state,
    dpiitNumber: r.startup.dpiit_number,
    womenLed: !!r.startup.women_led,
    capabilities: JSON.parse(r.startup.capabilities || '[]'),
    score: r.score,
    reasons: r.reasons,
    hasApplied: applied.has(r.startup.id),
  }));

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'DISCOVERY_RUN', entityType: 'challenges', entityId: challenge.id, meta: { candidates: ranked.length }, ip: req.ip });
  res.json({ challengeId: challenge.id, generatedAt: new Date().toISOString(), candidates: ranked });
}));

/* ----------------------------------------------------------------- utils */

function mustOwn(req, idOrCode, allowAnyDeptForAdmin = false) {
  const row = get('SELECT * FROM challenges WHERE id = ? OR code = ?', [Number(idOrCode) || 0, idOrCode]);
  if (!row) throw httpError(404, 'Problem statement not found');
  if (req.user.role === ROLES.ADMIN) return row;
  if (row.dept_id !== req.user.dept_id) throw httpError(403, 'This problem statement belongs to another department');
  if (!allowAnyDeptForAdmin && row.created_by !== req.user.id && req.user.role === ROLES.NODAL_OFFICER) {
    // A nodal officer may edit anything raised inside their own department.
  }
  return row;
}

function timelineFor(challengeId) {
  return all(
    "SELECT action, actor_role, created_at, meta FROM audit_log WHERE entity_type = 'challenges' AND entity_id = ? ORDER BY id ASC",
    [challengeId],
  ).map((r) => ({ ...r, meta: safeJson(r.meta) }));
}

export function hydrate(row) {
  if (!row) return row;
  return {
    ...row,
    success_kpis: safeJson(row.success_kpis, []),
    tags: safeJson(row.tags, []),
    security_clearance: !!row.security_clearance,
    stage: stageOf(row.status),
  };
}

function safeJson(v, fallback = {}) {
  try { return JSON.parse(v ?? 'null') ?? fallback; } catch { return fallback; }
}

export default router;

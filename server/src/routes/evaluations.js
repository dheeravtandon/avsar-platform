import { Router } from 'express';
import { z } from 'zod';
import { all, get, update } from '../db/index.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { record } from '../services/audit.js';
import { notifyMany } from '../services/notify.js';
import { criteria, computeTotal, consensus, BUCKET_CAP, QUALIFYING_TECHNICAL } from '../services/scoring.js';

const router = Router();

router.get('/criteria', authenticate, wrap(async (_req, res) => {
  res.json({ criteria: criteria(), bucketCap: BUCKET_CAP, qualifyingTechnical: QUALIFYING_TECHNICAL });
}));

/** The evaluator's own worklist. */
router.get('/mine', authenticate, authorize(ROLES.EVALUATOR, ROLES.ADMIN), wrap(async (req, res) => {
  const rows = all(
    `SELECT e.*, a.code AS application_code, a.solution_title, a.solution_summary, a.trl_claimed,
            a.quoted_pilot_cost, a.timeline_weeks, a.differentiators, a.risks, a.approach, a.prior_deployments,
            c.code AS challenge_code, c.title AS challenge_title, c.sector, c.success_kpis, c.pilot_budget_ceiling,
            d.name AS dept_name
     FROM evaluations e
     JOIN applications a ON a.id = e.application_id
     JOIN challenges c ON c.id = a.challenge_id
     JOIN departments d ON d.id = c.dept_id
     WHERE e.evaluator_id = ? ORDER BY e.status ASC, e.id DESC`,
    [req.user.id],
  );
  // Identity of the applicant is withheld until scores are submitted: blind first pass.
  res.json(rows.map((r) => ({
    ...r,
    scores: safeJson(r.scores, {}),
    success_kpis: safeJson(r.success_kpis, []),
    blinded: r.status !== 'SUBMITTED',
  })));
}));

const scoreSchema = z.object({
  scores: z.record(z.string(), z.coerce.number().min(0)),
  remarks: z.string().min(20, 'Record at least a two-line justification for the score'),
  recommendation: z.enum(['RECOMMEND', 'RECOMMEND_WITH_CONDITIONS', 'NOT_RECOMMEND']),
  coiDeclared: z.boolean(),
});

router.post('/:id/score', authenticate, authorize(ROLES.EVALUATOR, ROLES.ADMIN), wrap(async (req, res) => {
  const d = scoreSchema.parse(req.body);
  if (!d.coiDeclared) throw httpError(400, 'A conflict-of-interest declaration is mandatory before scoring');

  const row = get('SELECT * FROM evaluations WHERE id = ?', [Number(req.params.id)]);
  if (!row) throw httpError(404, 'Evaluation not found');
  if (row.evaluator_id !== req.user.id && req.user.role !== ROLES.ADMIN) throw httpError(403, 'This evaluation is assigned to another committee member');
  if (row.status === 'SUBMITTED') throw httpError(409, 'Score already submitted and locked');

  const list = criteria();
  const unknown = Object.keys(d.scores).filter((k) => !list.some((c) => c.code === k));
  if (unknown.length) throw httpError(422, `Unknown criteria: ${unknown.join(', ')}`);

  const totals = computeTotal(d.scores, list);
  update('evaluations', row.id, {
    scores: JSON.stringify(d.scores),
    total_score: totals.total,
    remarks: d.remarks,
    recommendation: d.recommendation,
    coi_declared: 1,
    status: 'SUBMITTED',
    submitted_at: new Date().toISOString(),
  });

  record({
    actorId: req.user.id, actorRole: req.user.role, action: 'EVALUATION_SUBMITTED',
    entityType: 'applications', entityId: row.application_id,
    meta: { evaluationId: row.id, total: totals.total, technical: totals.technical, recommendation: d.recommendation },
    ip: req.ip,
  });

  const peers = all('SELECT * FROM evaluations WHERE application_id = ?', [row.application_id]);
  const agg = consensus(peers);
  if (agg.flagged) {
    const app = get(
      'SELECT a.code, c.dept_id FROM applications a JOIN challenges c ON c.id = a.challenge_id WHERE a.id = ?',
      [row.application_id],
    );
    const officers = all("SELECT id FROM users WHERE dept_id = ? AND role IN ('NODAL_OFFICER','DEPT_HEAD')", [app.dept_id]).map((r) => r.id);
    notifyMany(officers, 'Score dispersion flagged', `${app.code}: committee scores differ by ${agg.spread} marks. A reconciliation sitting is required.`, `/app/applications/${row.application_id}`, 'WARNING');
  }

  res.json({ ...totals, consensus: agg });
}));

/** Aggregate view a department uses to build the comparative statement. */
router.get('/challenge/:challengeId/summary', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN), wrap(async (req, res) => {
  const challengeId = Number(req.params.challengeId);
  const challenge = get('SELECT * FROM challenges WHERE id = ?', [challengeId]);
  if (!challenge) throw httpError(404, 'Problem statement not found');
  if (req.user.role !== ROLES.ADMIN && challenge.dept_id !== req.user.dept_id) throw httpError(403, 'Belongs to another department');

  const apps = all(
    `SELECT a.id, a.code, a.solution_title, a.quoted_pilot_cost, a.trl_claimed, a.status, a.match_score,
            s.legal_name, s.brand_name, s.women_led, s.state
     FROM applications a JOIN startups s ON s.id = a.startup_id
     WHERE a.challenge_id = ? AND a.status NOT IN ('DRAFT','WITHDRAWN') ORDER BY a.id`,
    [challengeId],
  );

  const summary = apps.map((a) => {
    const evals = all('SELECT * FROM evaluations WHERE application_id = ?', [a.id]);
    return { ...a, consensus: consensus(evals), evaluatorCount: evals.length };
  }).sort((x, y) => y.consensus.average - x.consensus.average);

  res.json({ challenge: { id: challenge.id, code: challenge.code, title: challenge.title }, rows: summary });
}));

/** Parse a JSON text column. Values already parsed upstream pass through. */
function safeJson(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v) ?? fallback; } catch { return fallback; }
}

export default router;

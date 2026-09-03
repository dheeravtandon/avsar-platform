import { Router } from 'express';
import { all, get } from '../db/index.js';
import { authenticate, softAuthenticate, currentStartup, ROLES } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { POLICY } from '../config.js';

const router = Router();

const scalar = (sql, params = []) => Number(Object.values(get(sql, params) ?? { v: 0 })[0] ?? 0);

/* --------------------------------------------- public transparency board */

router.get('/public', softAuthenticate, wrap(async (_req, res) => {
  const funnel = [
    { stage: 'Problem statements published', count: scalar("SELECT COUNT(*) v FROM challenges WHERE status IN ('PUBLISHED','CLOSED','EVALUATION','PILOT','PROCURED')") },
    { stage: 'Applications received', count: scalar("SELECT COUNT(*) v FROM applications WHERE status <> 'DRAFT'") },
    { stage: 'Cleared eligibility gate', count: scalar("SELECT COUNT(*) v FROM applications WHERE status NOT IN ('DRAFT','ELIGIBILITY_FAIL','WITHDRAWN')") },
    { stage: 'Shortlisted', count: scalar("SELECT COUNT(*) v FROM applications WHERE status IN ('SHORTLISTED','SELECTED_FOR_PILOT')") },
    { stage: 'Pilots sanctioned', count: scalar('SELECT COUNT(*) v FROM pilots') },
    { stage: 'Pilots cleared', count: scalar("SELECT COUNT(*) v FROM pilots WHERE verdict = 'SUCCESS'") },
    { stage: 'Contracts issued', count: scalar("SELECT COUNT(*) v FROM procurements WHERE status IN ('PO_ISSUED','ACTIVE','COMPLETED')") },
    { stage: 'Cross-department adoptions', count: scalar('SELECT COUNT(*) v FROM adoptions') },
  ];

  res.json({
    generatedAt: new Date().toISOString(),
    headline: {
      departments: scalar("SELECT COUNT(*) v FROM departments WHERE status = 'ACTIVE'"),
      startups: scalar('SELECT COUNT(*) v FROM startups'),
      eligibleStartups: scalar("SELECT COUNT(*) v FROM startups WHERE eligibility_status = 'ELIGIBLE'"),
      openChallenges: scalar("SELECT COUNT(*) v FROM challenges WHERE status = 'PUBLISHED'"),
      activePilots: scalar("SELECT COUNT(*) v FROM pilots WHERE status = 'ACTIVE'"),
      pilotValue: scalar('SELECT COALESCE(SUM(budget_sanctioned),0) v FROM pilots'),
      contractValue: scalar("SELECT COALESCE(SUM(contract_value),0) v FROM procurements WHERE status IN ('PO_ISSUED','ACTIVE','COMPLETED')"),
      firstTimeSuppliers: scalar("SELECT COUNT(DISTINCT startup_id) v FROM procurements WHERE startup_id IN (SELECT id FROM startups WHERE has_prior_govt_order = 0)"),
      womenLedShare: sharePercent("SELECT COUNT(*) v FROM startups WHERE women_led = 1", 'SELECT COUNT(*) v FROM startups'),
    },
    funnel,
    conversion: {
      applicationToPilot: ratio("SELECT COUNT(*) v FROM pilots", "SELECT COUNT(*) v FROM applications WHERE status <> 'DRAFT'"),
      pilotToProcurement: ratio("SELECT COUNT(*) v FROM procurements WHERE status IN ('PO_ISSUED','ACTIVE','COMPLETED')", 'SELECT COUNT(*) v FROM pilots'),
    },
    bySector: all(
      `SELECT sector, COUNT(*) AS challenges,
              (SELECT COUNT(*) FROM pilots p JOIN challenges c2 ON c2.id = p.challenge_id WHERE c2.sector = c.sector) AS pilots
       FROM challenges c WHERE status <> 'DRAFT' GROUP BY sector ORDER BY challenges DESC`,
    ),
    byDepartment: all(
      `SELECT d.name AS department, d.ministry,
              COUNT(c.id) AS challenges,
              COALESCE(SUM(CASE WHEN c.status = 'PROCURED' THEN 1 ELSE 0 END), 0) AS procured
       FROM departments d LEFT JOIN challenges c ON c.dept_id = d.id AND c.status <> 'DRAFT'
       GROUP BY d.id ORDER BY challenges DESC`,
    ),
    cycleTime: cycleTime(),
    payments: {
      slaDays: POLICY.paymentSlaDays,
      due: scalar("SELECT COUNT(*) v FROM payments WHERE status <> 'PAID'"),
      paid: scalar("SELECT COUNT(*) v FROM payments WHERE status = 'PAID'"),
      breached: scalar("SELECT COUNT(*) v FROM payments WHERE status <> 'PAID' AND date(due_date) < date('now')"),
    },
    provenSolutions: all(
      `SELECT ct.solution_name, ct.category, ct.adoptions, s.brand_name
       FROM catalogue ct JOIN startups s ON s.id = ct.startup_id
       WHERE ct.status = 'LISTED' ORDER BY ct.adoptions DESC LIMIT 8`,
    ),
  });
}));

/* ---------------------------------------------------- role-aware summary */

router.get('/me', authenticate, wrap(async (req, res) => {
  const role = req.user.role;

  if (role === ROLES.STARTUP) {
    const s = currentStartup(req);
    const id = s?.id ?? -1;
    return res.json({
      role,
      tiles: [
        { key: 'applications', label: 'Applications', value: scalar("SELECT COUNT(*) v FROM applications WHERE startup_id = ? AND status <> 'DRAFT'", [id]) },
        { key: 'underEval', label: 'Under evaluation', value: scalar("SELECT COUNT(*) v FROM applications WHERE startup_id = ? AND status IN ('UNDER_EVALUATION','SHORTLISTED')", [id]) },
        { key: 'pilots', label: 'Active pilots', value: scalar("SELECT COUNT(*) v FROM pilots WHERE startup_id = ? AND status = 'ACTIVE'", [id]) },
        { key: 'contracts', label: 'Contracts', value: scalar("SELECT COUNT(*) v FROM procurements WHERE startup_id = ? AND status IN ('PO_ISSUED','ACTIVE','COMPLETED')", [id]) },
        { key: 'receivable', label: 'Receivable (INR)', value: scalar("SELECT COALESCE(SUM(pay.amount),0) v FROM payments pay LEFT JOIN pilots p ON p.id = pay.pilot_id LEFT JOIN procurements pr ON pr.id = pay.procurement_id WHERE pay.status <> 'PAID' AND (p.startup_id = ? OR pr.startup_id = ?)", [id, id]), money: true },
      ],
      eligibility: s ? JSON.parse(s.eligibility_json || '{}') : null,
      openMatches: scalar("SELECT COUNT(*) v FROM challenges WHERE status = 'PUBLISHED' AND sector = ?", [s?.sector ?? '']),
      recent: all(
        `SELECT a.id, a.code, a.status, a.solution_title, c.title AS challenge_title, c.code AS challenge_code
         FROM applications a JOIN challenges c ON c.id = a.challenge_id
         WHERE a.startup_id = ? ORDER BY a.id DESC LIMIT 6`,
        [id],
      ),
    });
  }

  if (role === ROLES.EVALUATOR) {
    return res.json({
      role,
      tiles: [
        { key: 'assigned', label: 'Assigned to me', value: scalar("SELECT COUNT(*) v FROM evaluations WHERE evaluator_id = ?", [req.user.id]) },
        { key: 'pending', label: 'Pending score', value: scalar("SELECT COUNT(*) v FROM evaluations WHERE evaluator_id = ? AND status = 'ASSIGNED'", [req.user.id]) },
        { key: 'submitted', label: 'Submitted', value: scalar("SELECT COUNT(*) v FROM evaluations WHERE evaluator_id = ? AND status = 'SUBMITTED'", [req.user.id]) },
        { key: 'avg', label: 'My average score', value: scalar("SELECT COALESCE(ROUND(AVG(total_score),1),0) v FROM evaluations WHERE evaluator_id = ? AND status = 'SUBMITTED'", [req.user.id]) },
      ],
    });
  }

  const dept = req.user.dept_id;
  const deptFilter = role === ROLES.ADMIN ? '' : 'WHERE dept_id = ?';
  const deptParams = role === ROLES.ADMIN ? [] : [dept];

  return res.json({
    role,
    tiles: [
      { key: 'challenges', label: 'Problem statements', value: scalar(`SELECT COUNT(*) v FROM challenges ${deptFilter}`, deptParams) },
      { key: 'published', label: 'Open for applications', value: role === ROLES.ADMIN ? scalar("SELECT COUNT(*) v FROM challenges WHERE status = 'PUBLISHED'") : scalar("SELECT COUNT(*) v FROM challenges WHERE dept_id = ? AND status = 'PUBLISHED'", [dept]) },
      { key: 'applications', label: 'Applications', value: role === ROLES.ADMIN ? scalar("SELECT COUNT(*) v FROM applications WHERE status <> 'DRAFT'") : scalar("SELECT COUNT(*) v FROM applications a JOIN challenges c ON c.id = a.challenge_id WHERE c.dept_id = ? AND a.status <> 'DRAFT'", [dept]) },
      { key: 'pilots', label: 'Active pilots', value: role === ROLES.ADMIN ? scalar("SELECT COUNT(*) v FROM pilots WHERE status = 'ACTIVE'") : scalar("SELECT COUNT(*) v FROM pilots WHERE dept_id = ? AND status = 'ACTIVE'", [dept]) },
      { key: 'committed', label: 'Committed (INR)', value: role === ROLES.ADMIN ? scalar('SELECT COALESCE(SUM(budget_sanctioned),0) v FROM pilots') : scalar('SELECT COALESCE(SUM(budget_sanctioned),0) v FROM pilots WHERE dept_id = ?', [dept]), money: true },
    ],
    pendingApprovals: role === ROLES.DEPT_HEAD
      ? all("SELECT id, code, title, created_at FROM challenges WHERE dept_id = ? AND status = 'PENDING_APPROVAL' ORDER BY id DESC", [dept])
      : [],
    milestonesAwaitingReview: all(
      `SELECT m.id, m.seq, m.title, m.submitted_at, p.id AS pilot_id, p.code AS pilot_code, s.brand_name
       FROM milestones m JOIN pilots p ON p.id = m.pilot_id JOIN startups s ON s.id = p.startup_id
       WHERE m.status = 'SUBMITTED' ${role === ROLES.ADMIN ? '' : 'AND p.dept_id = ?'} ORDER BY m.submitted_at ASC`,
      role === ROLES.ADMIN ? [] : [dept],
    ),
    funnel: all(
      `SELECT status, COUNT(*) AS count FROM applications a
       ${role === ROLES.ADMIN ? '' : 'JOIN challenges c ON c.id = a.challenge_id WHERE c.dept_id = ?'}
       GROUP BY status`,
      role === ROLES.ADMIN ? [] : [dept],
    ),
  });
}));

/* ----------------------------------------------------------------- utils */

function ratio(numSql, denSql) {
  const den = scalar(denSql);
  return den ? Math.round((scalar(numSql) / den) * 1000) / 10 : 0;
}

function sharePercent(numSql, denSql) {
  const den = scalar(denSql);
  return den ? Math.round((scalar(numSql) / den) * 100) : 0;
}

/**
 * Median days between key handoffs. This is the number the model exists to move:
 * a conventional tender cycle runs 9-18 months from need to order.
 */
function cycleTime() {
  const rows = all(`
    SELECT
      julianday(a.submitted_at) - julianday(c.published_at)      AS publish_to_apply,
      julianday(p.created_at)   - julianday(a.submitted_at)      AS apply_to_pilot,
      julianday(pr.created_at)  - julianday(p.created_at)        AS pilot_to_procure
    FROM challenges c
    JOIN applications a ON a.challenge_id = c.id AND a.submitted_at IS NOT NULL
    LEFT JOIN pilots p ON p.application_id = a.id
    LEFT JOIN procurements pr ON pr.pilot_id = p.id
    WHERE c.published_at IS NOT NULL`);

  const med = (key) => {
    const xs = rows.map((r) => r[key]).filter((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
    if (!xs.length) return null;
    return Math.round(xs[Math.floor(xs.length / 2)]);
  };

  return {
    publishToApplyDays: med('publish_to_apply'),
    applyToPilotDays: med('apply_to_pilot'),
    pilotToProcureDays: med('pilot_to_procure'),
    conventionalTenderDays: 300,
  };
}

export default router;
